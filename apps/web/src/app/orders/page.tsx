"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { getProducts } from "@/lib/api";
import {
  ApiError,
  getMyOrders,
  type Order,
  type OrderStatus,
} from "@/lib/orders-api";
import { formatVND } from "@/lib/pricing";
import type { Product } from "@/lib/types";
import { ProtectedRoute } from "@/lib/auth-context";

const STATUS_TEXT: Record<
  OrderStatus,
  { label: string; color: string; bg: string }
> = {
  PENDING: { label: "Chờ thanh toán", color: "#b45309", bg: "#fef3c7" },
  PAID: { label: "Đã thanh toán", color: "#1d4ed8", bg: "#dbeafe" },
  PREPARING: { label: "Đang pha chế", color: "#7e22ce", bg: "#f3e8ff" },
  READY: { label: "Chờ lấy nước", color: "#15803d", bg: "#dcfce7" },
  COMPLETED: { label: "Hoàn tất", color: "#047857", bg: "#d1fae5" },
  PAYMENT_FAILED: { label: "Thanh toán lỗi", color: "#b91c1c", bg: "#fee2e2" },
  CANCELLED: { label: "Đã hủy", color: "#4b5563", bg: "#f3f4f6" },
};

export default function OrderHistoryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [productMap, setProductMap] = useState<Record<number, Product>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?next=/orders");
      return;
    }
    let active = true;
    const loadData = async () => {
      try {
        const [ordersData, productsData] = await Promise.all([
          getMyOrders(),
          getProducts().catch(() => [] as Product[]),
        ]);
        if (!active) return;
        const map: Record<number, Product> = {};
        for (const p of productsData) {
          map[p.id] = p;
        }
        setProductMap(map);
        setOrders(ordersData);
        setError(null);
      } catch (e) {
        if (!active) return;
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login?next=/orders");
          return;
        }
        setError(
          e instanceof Error ? e.message : "Không tải được lịch sử đơn hàng",
        );
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadData();
    return () => {
      active = false;
    };
  }, [router, retryCount]);

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
        Đang tải danh sách đơn hàng...
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          margin: "0 auto",
          padding: "32px 24px",
          boxSizing: "border-box",
        }}
      >
        {" "}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
            Lịch sử đơn hàng
          </h1>
          <Link
            href="/"
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "#d97706",
              textDecoration: "none",
            }}
          >
            + Đặt thêm đồ uống
          </Link>
        </div>
        {error && (
          <div role="alert" style={{ color: "#b91c1c", marginBottom: "16px" }}>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError(null);
                setRetryCount((value) => value + 1);
              }}
            >
              Thử lại
            </button>
          </div>
        )}
        {!error && orders.length === 0 && <p>Bạn chưa có đơn hàng nào.</p>}
        {/* Danh sách đơn hàng */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            width: "100%",
          }}
        >
          {orders.map((order) => {
            const statusInfo = STATUS_TEXT[order.status] ?? {
              label: order.status,
              color: "#374151",
              bg: "#f3f4f6",
            };
            const createdDate = new Date(order.createdAt).toLocaleString(
              "vi-VN",
              {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              },
            );

            return (
              <div
                key={order.id}
                style={{
                  width: "100%", // Đảm bảo khung đơn hàng căng rộng theo ý muốn
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "20px",
                  padding: "28px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                  boxSizing: "border-box",
                }}
              >
                {/* Header đơn hàng */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #f3f4f6",
                    paddingBottom: "16px",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: "bold", fontSize: "18px" }}>
                      Đơn #{order.id}
                    </span>
                    <span
                      style={{
                        marginLeft: "12px",
                        fontSize: "13px",
                        color: "#6b7280",
                      }}
                    >
                      {createdDate}
                    </span>
                  </div>
                  <span
                    style={{
                      padding: "6px 14px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: statusInfo.color,
                      background: statusInfo.bg,
                    }}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                {/* Danh sách sản phẩm chuẩn vuông 64px */}
                {order.items && order.items.length > 0 && (
                  <div
                    style={{
                      padding: "16px 0",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    {order.items.map((item, idx) => {
                      const product = productMap[item.productId];
                      const productName =
                        product?.name ?? `Sản phẩm #${item.productId}`;
                      const toppingText =
                        item.toppings && item.toppings.length > 0
                          ? item.toppings.join(", ")
                          : "Không topping";

                      return (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 0",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "16px",
                            }}
                          >
                            <div
                              style={{
                                width: 64,
                                height: 64,
                                minWidth: 64,
                                borderRadius: "12px",
                                background: "#fef3c7",
                                overflow: "hidden",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {product?.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={productName}
                                  style={{
                                    width: 64,
                                    height: 64,
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                <span>☕</span>
                              )}
                            </div>
                            <div>
                              <p
                                style={{
                                  margin: "0 0 4px 0",
                                  fontWeight: 600,
                                  fontSize: "15px",
                                }}
                              >
                                {productName}{" "}
                                <span
                                  style={{ color: "#d97706", fontWeight: 400 }}
                                >
                                  x{item.qty}
                                </span>
                              </p>
                              <p
                                style={{
                                  margin: "0 0 2px 0",
                                  fontSize: "13px",
                                  color: "#6b7280",
                                }}
                              >
                                Size {item.size}
                              </p>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: "12px",
                                  color: "#9ca3af",
                                }}
                              >
                                {toppingText}
                              </p>
                            </div>
                          </div>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "15px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatVND(item.lineTotal)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer đơn hàng */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "16px",
                  }}
                >
                  <div style={{ fontSize: "14px" }}>
                    {order.promoCode && (
                      <p style={{ margin: "0 0 4px 0", color: "#047857" }}>
                        Mã giảm giá: <strong>{order.promoCode}</strong> (-
                        {formatVND(order.discount ?? 0)})
                      </p>
                    )}
                    <p style={{ margin: 0, color: "#4b5563" }}>
                      Tổng thanh toán:{" "}
                      <strong style={{ fontSize: "16px", color: "#d97706" }}>
                        {formatVND(order.total)}
                      </strong>
                    </p>
                  </div>
                  <Link
                    href={`/orders/${order.id}`}
                    style={{
                      padding: "10px 18px",
                      border: "1px solid #d97706",
                      borderRadius: "10px",
                      color: "#d97706",
                      fontWeight: 600,
                      fontSize: "13px",
                      textDecoration: "none",
                    }}
                  >
                    Xem tiến trình
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ProtectedRoute>
  );
}
