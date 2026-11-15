import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import StaffOrdersPage from "./page";

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  getToken: vi.fn(),
  getCurrentUser: vi.fn(),
  getStaffOrders: vi.fn(),
  updateOrderStatus: vi.fn(),
  cancelStaffOrder: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/lib/auth", () => ({ getToken: mocks.getToken }));
vi.mock("@/lib/auth-context", () => ({
  ProtectedRoute: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/lib/orders-api", async (original) => ({
  ...(await original<typeof import("@/lib/orders-api")>()),
  getCurrentUser: mocks.getCurrentUser,
  getStaffOrders: mocks.getStaffOrders,
  updateOrderStatus: mocks.updateOrderStatus,
  cancelStaffOrder: mocks.cancelStaffOrder,
}));

describe("STAFF cancellation (Issue #28)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getToken.mockReturnValue("staff-token");
    mocks.getCurrentUser.mockResolvedValue({ role: "STAFF" });
    mocks.getStaffOrders.mockResolvedValue(
      ["PENDING", "PAID", "PREPARING", "READY"].map((status, i) => ({
        id: i + 1,
        status,
        total: 35_000,
        createdAt: "2026-11-15T00:00:00Z",
        items: [],
      })),
    );
    mocks.cancelStaffOrder.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows red cancel only for pending/preparing, alongside ready action", async () => {
    render(<StaffOrdersPage />);
    await screen.findByText("Đơn hàng #1");
    const cards = screen.getAllByRole("article");
    expect(
      within(cards[0]).getByRole("button", { name: "Hủy đơn" }).style
        .background,
    ).toBe("rgb(220, 38, 38)");
    expect(
      within(cards[1]).queryByRole("button", { name: "Hủy đơn" }),
    ).toBeNull();
    expect(
      within(cards[2]).getByRole("button", { name: "Hủy đơn" }),
    ).toBeTruthy();
    expect(
      within(cards[2]).getByRole("button", { name: "Đánh dấu sẵn sàng" }),
    ).toBeTruthy();
    expect(
      within(cards[3]).queryByRole("button", { name: "Hủy đơn" }),
    ).toBeNull();
  });
  it("keeps an order when confirmation is declined", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    render(<StaffOrdersPage />);
    fireEvent.click(
      (await screen.findAllByRole("button", { name: "Hủy đơn" }))[0],
    );
    expect(mocks.cancelStaffOrder).not.toHaveBeenCalled();
  });
  it("cancels with the staff API and refreshes the queue", async () => {
    render(<StaffOrdersPage />);
    const button = (
      await screen.findAllByRole("button", { name: "Hủy đơn" })
    )[0];
    mocks.getStaffOrders.mockResolvedValue([]);
    fireEvent.click(button);
    await waitFor(() => expect(mocks.cancelStaffOrder).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByText("Đơn hàng #1")).toBeNull());
  });
  it("shows cancellation conflicts and permits retry", async () => {
    mocks.cancelStaffOrder.mockRejectedValueOnce(
      new Error("Đơn đã đổi trạng thái"),
    );
    render(<StaffOrdersPage />);
    fireEvent.click(
      (await screen.findAllByRole("button", { name: "Hủy đơn" }))[0],
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Đơn đã đổi trạng thái",
    );
    await waitFor(() =>
      expect(
        (
          screen.getAllByRole("button", {
            name: "Hủy đơn",
          })[0] as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
  });
});
