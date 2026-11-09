"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { formatVND } from "@/lib/pricing";
import {
  ApiError,
  getCurrentUser,
  getStaffOrders,
  updateOrderStatus,
  type Order,
  type OrderStatus,
} from "@/lib/orders-api";

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  PREPARING: "Đang pha chế",
  READY: "Chờ lấy nước",
  COMPLETED: "Hoàn thành",
  PAYMENT_FAILED: "Thanh toán thất bại",
  CANCELLED: "Đã hủy",
};

const STATUS_COLORS: Record<OrderStatus, { color: string; background: string }> = {
  PENDING: { color: "#92400e", background: "#fef3c7" },
  PAID: { color: "#1d4ed8", background: "#dbeafe" },
  PREPARING: { color: "#7e22ce", background: "#f3e8ff" },
  READY: { color: "#15803d", background: "#dcfce7" },
  COMPLETED: { color: "#047857", background: "#d1fae5" },
  PAYMENT_FAILED: { color: "#b91c1c", background: "#fee2e2" },
  CANCELLED: { color: "#4b5563", background: "#f3f4f6" },
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PAID: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
};

const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  PAID: "Bắt đầu pha chế",
  PREPARING: "Đánh dấu sẵn sàng",
  READY: "Hoàn thành đơn",
};

export default function StaffOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const loadOrders = useCallback(
    async (background = false) => {
      if (background) {
        setRefreshing(true);
      }

      try {
        setOrders(await getStaffOrders());
        setError(null);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login?next=/staff/orders");
          return;
        }
        if (e instanceof ApiError && e.status === 403) {
          setAccessDenied(true);
          setOrders([]);
          return;
        }
        setError(e instanceof Error ? e.message : "Không tải được danh sách đơn hàng");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router],
  );

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?next=/staff/orders");
      return;
    }

    let active = true;
    let intervalId: number | undefined;

    void getCurrentUser()
      .then(async (user) => {
        if (!active) return;
        if (user.role !== "STAFF") {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        await loadOrders();
        if (active) {
          intervalId = window.setInterval(() => {
            void loadOrders(true);
          }, 7000);
        }
      })
      .catch((e: unknown) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login?next=/staff/orders");
          return;
        }
        if (e instanceof ApiError && e.status === 403) {
          setAccessDenied(true);
          return;
        }
        setError(e instanceof Error ? e.message : "Không thể xác minh quyền truy cập");
      })
      .finally(() => {
        if (active) setLoading(false);
      })

    return () => {
      active = false;
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [loadOrders, router]);

  async function handleStatusChange(order: Order, nextStatus: OrderStatus) {
    setUpdatingOrderId(order.id);
    setError(null);
    try {
      await updateOrderStatus(order.id, nextStatus);
      await loadOrders(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể cập nhật trạng thái đơn hàng");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  const activeOrders = orders
    .filter((order) => NEXT_STATUS[order.status] !== undefined)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (accessDenied) {
    return (
      <main style={{ maxWidth: "480px", margin: "80px auto", padding: "24px", textAlign: "center" }}>
        <h1 style={{ margin: "0 0 10px", fontSize: "24px" }}>Không tìm thấy trang</h1>
        <p style={{ color: "#6b7280" }}>Trang này không tồn tại hoặc bạn không có quyền truy cập.</p>
        <Link href="/" style={{ color: "#c2410c", textDecoration: "none" }}>Về trang chủ</Link>
      </main>
    );
  }

  return (
    <main
      style={{
        width: "100%",
        maxWidth: "960px",
        margin: "0 auto",
        padding: "32px 20px 48px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <div>
          <p style={{ margin: "0 0 6px", color: "#c2410c", fontSize: "13px", fontWeight: 700 }}>
            KHU VỰC NHÂN VIÊN
          </p>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700 }}>Điều phối đơn hàng</h1>
          <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: "14px" }}>
            Cập nhật lần lượt tiến độ pha chế và giao đồ uống.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadOrders(true)}
          disabled={refreshing || loading}
          style={{
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "10px",
            background: "#fff",
            color: "#374151",
            fontWeight: 600,
            cursor: refreshing || loading ? "wait" : "pointer",
          }}
        >
          {refreshing ? "Đang làm mới..." : "Làm mới"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: "18px",
            padding: "12px 14px",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ padding: "36px 0", color: "#6b7280", textAlign: "center" }}>
          Đang tải danh sách đơn hàng...
        </p>
      ) : activeOrders.length === 0 ? (
        <section
          style={{
            padding: "42px 20px",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            background: "#fff",
            textAlign: "center",
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700 }}>
            Hiện không có đơn cần xử lý
          </p>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
            Đơn đã thanh toán sẽ xuất hiện tại đây.
          </p>
        </section>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {activeOrders.map((order) => {
            const nextStatus = NEXT_STATUS[order.status];
            const statusColor = STATUS_COLORS[order.status];
            const isUpdating = updatingOrderId === order.id;

            return (
              <article
                key={order.id}
                style={{
                  padding: "20px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "16px",
                  background: "#fff",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "12px",
                    paddingBottom: "14px",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
                      Đơn hàng #{order.id}
                    </h2>
                    <p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: "13px" }}>
                      {new Date(order.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: "6px 11px",
                      borderRadius: "999px",
                      color: statusColor.color,
                      background: statusColor.background,
                      fontSize: "13px",
                      fontWeight: 700,
                    }}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>

                {order.items && order.items.length > 0 && (
                  <ul
                    style={{
                      display: "grid",
                      gap: "8px",
                      margin: "14px 0",
                      padding: 0,
                      listStyle: "none",
                    }}
                  >
                    {order.items.map((item, index) => (
                      <li
                        key={`${item.productId}-${index}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "12px",
                          color: "#374151",
                          fontSize: "14px",
                        }}
                      >
                        <span>
                          {item.product?.name ?? `Sản phẩm #${item.productId}`} · Size {item.size} · x{item.qty}
                          {item.toppings.length > 0 ? ` · ${item.toppings.join(", ")}` : ""}
                        </span>
                        <span style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                          {formatVND(item.lineTotal)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                    paddingTop: "14px",
                    borderTop: "1px solid #f3f4f6",
                  }}
                >
                  <span style={{ color: "#374151", fontSize: "14px" }}>
                    Tổng tiền: <strong>{formatVND(order.total)}</strong>
                  </span>
                  {nextStatus && (
                    <button
                      type="button"
                      onClick={() => void handleStatusChange(order, nextStatus)}
                      disabled={updatingOrderId !== null}
                      style={{
                        padding: "11px 16px",
                        border: 0,
                        borderRadius: "10px",
                        background: "#d97706",
                        color: "#fff",
                        fontWeight: 700,
                        cursor: updatingOrderId !== null ? "wait" : "pointer",
                        opacity: updatingOrderId !== null ? 0.65 : 1,
                      }}
                    >
                      {isUpdating ? "Đang cập nhật..." : NEXT_STATUS_LABEL[order.status]}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: "24px", textAlign: "center" }}>
        <Link href="/orders" style={{ color: "#c2410c", fontSize: "14px", textDecoration: "none" }}>
          Xem trang đơn hàng
        </Link>
      </div>
    </main>
  );
}
