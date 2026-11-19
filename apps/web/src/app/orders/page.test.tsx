import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import OrderHistoryPage from "./page";

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  getToken: vi.fn(),
  getMyOrders: vi.fn(),
  getProducts: vi.fn(),
  cancelOrder: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/lib/auth", () => ({ getToken: mocks.getToken }));
vi.mock("@/lib/api", () => ({ getProducts: mocks.getProducts }));
vi.mock("@/lib/auth-context", () => ({
  ProtectedRoute: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/lib/orders-api", async (original) => ({
  ...(await original<typeof import("@/lib/orders-api")>()),
  getMyOrders: mocks.getMyOrders,
  cancelOrder: mocks.cancelOrder,
}));

describe("Order history error recovery (Issue #28)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getToken.mockReturnValue("test-token");
    mocks.getProducts.mockResolvedValue([]);
    mocks.getMyOrders.mockResolvedValue([]);
    mocks.cancelOrder.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows a load error and lets the customer retry successfully", async () => {
    mocks.getMyOrders.mockRejectedValueOnce(
      new Error("Không kết nối được máy chủ"),
    );
    render(<OrderHistoryPage />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Không kết nối được máy chủ",
    );
    mocks.getMyOrders.mockResolvedValueOnce([
      {
        id: 123,
        status: "PAID",
        total: 25_000,
        createdAt: "2026-11-14T01:00:00Z",
        items: [],
      },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await screen.findByText("Đơn #123");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the empty state after a successful empty history response", async () => {
    render(<OrderHistoryPage />);
    await screen.findByText("Bạn chưa có đơn hàng nào.");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("redirects a guest without requesting another account's history", async () => {
    mocks.getToken.mockReturnValue(null);
    render(<OrderHistoryPage />);
    await waitFor(() =>
      expect(mocks.router.replace).toHaveBeenCalledWith("/login?next=/orders"),
    );
    expect(mocks.getMyOrders).not.toHaveBeenCalled();
  });

  it("shows cancellation only for customer-cancellable order statuses", async () => {
    mocks.getMyOrders.mockResolvedValue([
      "PENDING",
      "PAYMENT_FAILED",
      "PAID",
      "PREPARING",
      "READY",
      "COMPLETED",
      "CANCELLED",
    ].map((status, index) => ({
      id: index + 1,
      status,
      total: 25_000,
      createdAt: "2026-11-14T01:00:00Z",
      items: [],
    })));

    render(<OrderHistoryPage />);
    await screen.findByText("Đơn #1");

    expect(screen.getAllByRole("button", { name: "Hủy đơn" })).toHaveLength(2);
  });

  it("confirms cancellation and updates the order status", async () => {
    mocks.getMyOrders.mockResolvedValue([
      {
        id: 123,
        status: "PENDING",
        total: 25_000,
        createdAt: "2026-11-14T01:00:00Z",
        items: [],
      },
    ]);

    render(<OrderHistoryPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Hủy đơn" }));

    await waitFor(() => expect(mocks.cancelOrder).toHaveBeenCalledWith(123));
    expect(window.confirm).toHaveBeenCalled();
    expect(await screen.findByText("Đã hủy")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Hủy đơn" })).toBeNull();
  });

  it("does not cancel when confirmation is declined", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    mocks.getMyOrders.mockResolvedValue([
      {
        id: 123,
        status: "PENDING",
        total: 25_000,
        createdAt: "2026-11-14T01:00:00Z",
        items: [],
      },
    ]);

    render(<OrderHistoryPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Hủy đơn" }));

    expect(mocks.cancelOrder).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Hủy đơn" })).toBeTruthy();
  });

  it("reports cancellation failures and keeps the order cancellable", async () => {
    mocks.cancelOrder.mockRejectedValueOnce(new Error("Đơn đã đổi trạng thái"));
    mocks.getMyOrders.mockResolvedValue([
      {
        id: 123,
        status: "PENDING",
        total: 25_000,
        createdAt: "2026-11-14T01:00:00Z",
        items: [],
      },
    ]);

    render(<OrderHistoryPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Hủy đơn" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Đơn đã đổi trạng thái",
    );
    expect(screen.getByRole("button", { name: "Hủy đơn" })).toBeTruthy();
  });
});
