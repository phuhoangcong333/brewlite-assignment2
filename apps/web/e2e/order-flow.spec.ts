import {
  test,
  expect,
  loginOnPage,
  checkoutFromMenu,
  apiURL,
  webURL,
} from "./fixtures";

test("menu -> options -> cart -> payment -> live tracking -> completed loyalty", async ({
  page,
  browser,
  data,
  db,
}) => {
  await checkoutFromMenu(page, data);
  await page.getByRole("radio", { name: /Thẻ/ }).check();
  await page
    .getByPlaceholder("Nhập số thẻ (VD: 4111222233334444)")
    .fill("4111222233334444");
  await page
    .getByRole("button", { name: "Xác nhận trả tiền", exact: true })
    .click();
  await expect(page).toHaveURL(/\/orders\/\d+$/);
  const orderId = Number(new URL(page.url()).pathname.split("/").pop());
  await expect(
    page.getByRole("heading", { name: "Đã thanh toán thành công" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Chi tiết món trong đơn" }),
  ).toContainText("Size L · x2");
  const stored = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  expect(stored.total).toBe(100_000);
  expect(
    (await db.user.findUniqueOrThrow({ where: { id: data.customer.id } }))
      .loyaltyPoints,
  ).toBe(0);

  const staffContext = await browser.newContext({ baseURL: webURL });
  try {
    const staff = await staffContext.newPage();
    await loginOnPage(staff, data.staff);
    await staff.goto("/staff/orders");
    const orderCard = staff.getByRole("article").filter({
      has: staff.getByRole("heading", {
        name: `Đơn hàng #${orderId}`,
        exact: true,
      }),
    });
    for (const [button, heading] of [
      ["Bắt đầu pha chế", "Đang pha chế"],
      ["Đánh dấu sẵn sàng", "Chờ lấy nước tại quầy"],
      ["Hoàn thành đơn", "Đơn hàng hoàn tất"],
    ]) {
      await orderCard
        .getByRole("button", { name: button, exact: true })
        .click();
      // No page reload or status mocking: the customer must observe API polling.
      await expect(
        page.getByRole("heading", { name: heading, exact: true }),
      ).toBeVisible();
    }
    await expect(page.getByRole("status")).toHaveText("Đã cộng 10 điểm thưởng");
    expect(await db.loyaltyTransaction.count({ where: { orderId } })).toBe(1);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: data.customer.id } }))
        .loyaltyPoints,
    ).toBe(10);
    await page
      .getByRole("link", { name: "Xem lịch sử đơn", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Lịch sử đơn hàng" }),
    ).toBeVisible();
    await expect(
      page.getByText(`Đơn #${orderId}`, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Hoàn tất", { exact: true })).toBeVisible();
  } finally {
    await staffContext.close();
  }
});

test("failed payment can be retried without duplicating orders, payments or deductions", async ({
  page,
  data,
  db,
}) => {
  await checkoutFromMenu(page, data);
  await page.getByRole("radio", { name: /Thẻ/ }).check();
  const card = page.getByPlaceholder("Nhập số thẻ (VD: 4111222233334444)");
  await card.fill("4111222233330000");
  await page
    .getByRole("button", { name: "Xác nhận trả tiền", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "thất bại" }),
  ).toBeVisible();
  expect(await db.order.count({ where: { userId: data.customer.id } })).toBe(1);
  expect(
    (
      await db.ingredient.findUniqueOrThrow({
        where: { id: data.ingredientId },
      })
    ).stockQuantity,
  ).toBe(160);
  await card.fill("4111222233334444");
  await page
    .getByRole("button", { name: "Xác nhận trả tiền", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Đã thanh toán thành công" }),
  ).toBeVisible();
  const orders = await db.order.findMany({
    where: { userId: data.customer.id },
    include: { payments: true },
  });
  expect(orders).toHaveLength(1);
  expect(orders[0].payments.map((p) => p.status).sort()).toEqual([
    "FAILED",
    "SUCCESS",
  ]);
  expect(
    (
      await db.ingredient.findUniqueOrThrow({
        where: { id: data.ingredientId },
      })
    ).stockQuantity,
  ).toBe(160);
  expect(
    (await db.user.findUniqueOrThrow({ where: { id: data.customer.id } }))
      .loyaltyPoints,
  ).toBe(0);
});

test("an unpaid QR order can be cancelled from tracking and restores ingredients", async ({
  page,
  data,
  db,
}) => {
  await checkoutFromMenu(page, data);
  await page.getByRole("radio", { name: /QR/ }).check();
  const created = page.waitForResponse(
    (r) => r.url() === `${apiURL}/orders` && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Tạo mã QR", exact: true }).click();
  const order = await (await created).json();
  await page.goto(`/orders/${order.id}`);
  await expect(
    page.getByRole("heading", { name: "Đơn hàng chờ thanh toán" }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Hủy đơn hàng này" }).click();
  await expect(
    page.getByRole("heading", { name: "Đơn hàng đã hủy" }),
  ).toBeVisible();
  expect(
    (
      await db.ingredient.findUniqueOrThrow({
        where: { id: data.ingredientId },
      })
    ).stockQuantity,
  ).toBe(200);
  expect(
    await db.loyaltyTransaction.count({ where: { orderId: order.id } }),
  ).toBe(0);
  await expect(
    page.getByRole("button", { name: "Hủy đơn hàng này" }),
  ).toHaveCount(0);
});

test("a customer cannot open another customer order or the staff interface", async ({
  page,
  data,
  db,
}) => {
  const foreign = await db.order.create({
    data: { userId: data.other.id, total: 25_000, status: "PAID" },
  });
  await loginOnPage(page, data.customer);
  await page.goto(`/orders/${foreign.id}`);
  await expect(
    page.getByText("Không tìm thấy đơn hàng.", { exact: true }),
  ).toBeVisible();
  await page.goto("/orders");
  await expect(
    page.getByRole("heading", { name: "Lịch sử đơn hàng" }),
  ).toBeVisible();
  await expect(
    page.getByText(`Đơn #${foreign.id}`, { exact: true }),
  ).toHaveCount(0);
  await page.goto("/staff/orders");
  await expect(page.getByText(/không có quyền truy cập/i)).toBeVisible();
});

test("guests and expired sessions are redirected to login before accessing orders", async ({
  page,
  data,
}) => {
  await page.goto("/orders/1");
  await expect(page).toHaveURL(/\/login\?next=/);
  await loginOnPage(page, data.customer);
  await page.evaluate(() =>
    localStorage.setItem("access_token", "invalid-expired-token"),
  );
  await page.goto("/orders");
  await expect(page).toHaveURL(/\/login\?next=/);
});
