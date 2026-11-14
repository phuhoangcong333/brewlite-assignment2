import { test as base, expect, type Page } from "@playwright/test";
import { PrismaClient } from "../../api/node_modules/@prisma/client";

export const apiURL = process.env.E2E_API_URL || "http://127.0.0.1:3101";
export const webURL = process.env.E2E_WEB_URL || "http://127.0.0.1:3100";
type Account = { id: number; email: string; password: string; token: string };
type TestData = {
  customer: Account;
  staff: Account;
  other: Account;
  productId: number;
  productName: string;
  ingredientId: number;
};

export const test = base.extend<{ db: PrismaClient; data: TestData }>({
  db: async ({}, provide) => {
    const db = new PrismaClient({
      datasourceUrl: process.env.E2E_DATABASE_URL,
    });
    try {
      await provide(db);
    } finally {
      await db.$disconnect();
    }
  },
  data: async ({ db, request }, provide) => {
    const users: number[] = [];
    let productId: number | undefined;
    let ingredientId: number | undefined;
    const accounts: Account[] = [];
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      for (const role of ["customer", "staff", "other"]) {
        const email = `pw-${role}-${suffix}@example.test`;
        const password = "playwright-test-password";
        const registration = await request.post(`${apiURL}/auth/register`, {
          data: { email, password },
        });
        await expect(registration).toBeOK();
        const user = (await registration.json()).user;
        users.push(user.id);
        if (role === "staff")
          await db.user.update({
            where: { id: user.id },
            data: { role: "STAFF" },
          });
        const login = await request.post(`${apiURL}/auth/login`, {
          data: { email, password },
        });
        await expect(login).toBeOK();
        accounts.push({
          id: user.id,
          email,
          password,
          token: (await login.json()).access_token,
        });
      }
      ingredientId = (
        await db.ingredient.create({
          data: { name: `pw-milk-${suffix}`, unit: "ml", stockQuantity: 200 },
        })
      ).id;
      const productName = `PW Cà phê ${suffix}`;
      productId = (
        await db.product.create({
          data: {
            name: productName,
            price: 35_000,
            imageUrl: "/image/Picture1.png",
            recipeItems: { create: { ingredientId, amountRequired: 20 } },
          },
        })
      ).id;
      await provide({
        customer: accounts[0],
        staff: accounts[1],
        other: accounts[2],
        productId,
        productName,
        ingredientId,
      });
    } finally {
      await db.order.deleteMany({ where: { userId: { in: users } } });
      if (productId) await db.product.delete({ where: { id: productId } });
      if (ingredientId)
        await db.ingredient.delete({ where: { id: ingredientId } });
      await db.user.deleteMany({ where: { id: { in: users } } });
    }
  },
});

export { expect };

export async function loginOnPage(page: Page, account: Account) {
  await page.goto("/login");
  await page.getByPlaceholder("Nhập email của bạn").fill(account.email);
  await page.getByPlaceholder("Nhập mật khẩu").fill(account.password);
  await page.getByRole("button", { name: /^đăng nhập$/i }).click();
  await expect(
    page.getByRole("heading", { name: "BrewLite - Menu" }),
  ).toBeVisible();
}

export async function checkoutFromMenu(page: Page, data: TestData) {
  await loginOnPage(page, data.customer);
  await page.locator(`a[href="/products/${data.productId}"]`).first().click();
  await expect(
    page.getByRole("heading", { name: data.productName, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^L / }).click();
  await page.getByRole("checkbox", { name: /Trân châu/ }).check();
  await page.getByRole("button", { name: "+", exact: true }).click();
  await page.getByRole("button", { name: /Thêm vào giỏ/ }).click();
  await expect(
    page.getByRole("heading", { name: "Giỏ hàng của bạn" }),
  ).toBeVisible();
  await expect(page.getByText(data.productName, { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "Tiến hành thanh toán", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Thanh toán đơn hàng" }),
  ).toBeVisible();
}
