"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { formatVND } from "@/lib/pricing";
import {
  ApiError,
  cancelOrder,
  getMyOrders,
  type Order,
  type OrderStatus,
} from "@/lib/orders-api";

const STATUS_CONFIG: Record<
  OrderStatus,
  { title: string; subtitle: string; badgeBg: string; icon: string }
> = {
  PENDING: {
    title: "Đơn hàng chờ thanh toán",
    subtitle: "Vui lòng hoàn tất thanh toán để quầy tiến hành nhận đơn.",
    badgeBg: "#d97706",
    icon: "⏳",
  },
  PAYMENT_FAILED: {
    title: "Thanh toán thất bại",
    subtitle: "Giỏ hàng vẫn được giữ nguyên, bạn có thể thử thanh toán lại.",
    badgeBg: "#dc2626",
    icon: "✕",
  },
  PAID: {
    title: "Đã thanh toán thành công",
    subtitle: "Đơn hàng đã được chuyển đến quầy, đang chờ Barista tiếp nhận...",
    badgeBg: "#2563eb",
    icon: "✓",
  },
  PREPARING: {
    title: "Đang pha chế",
    subtitle: "Barista đang chuẩn bị đồ uống cho bạn, vui lòng đợi trong giây lát...",
    badgeBg: "#9333ea",
    icon: "☕",
  },
  READY: {
    title: "Chờ lấy nước tại quầy",
    subtitle: "Đồ uống đã pha xong! Mời quý khách qua quầy nhận nước.",
    badgeBg: "#16a34a",
    icon: "🔔",
  },
  COMPLETED: {
    title: "Đơn hàng hoàn tất",
    subtitle: "Cảm ơn quý khách đã sử dụng dịch vụ của BrewLite!",
    badgeBg: "#059669",
    icon: "🎉",
  },
  CANCELLED: {
    title: "Đơn hàng đã hủy",
    subtitle: "Đơn hàng này đã bị hủy và hoàn lại tồn kho.",
    badgeBg: "#6b7280",
    icon: "⊘",
  },
};

const PROGRESS_STEPS: OrderStatus[] = ["PAID", "PREPARING", "READY", "COMPLETED"];
const STEP_LABELS: Record<OrderStatus, string> = {
  PAID: "Đã thanh toán",
  PREPARING: "Đang pha",
  READY: "Chờ lấy nước",
  COMPLETED: "Hoàn tất",
  PENDING: "Chờ thanh toán",
  PAYMENT_FAILED: "Lỗi thanh toán",
  CANCELLED: "Đã hủy",
};

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = () => {
    getMyOrders()
      .then((orders) => setOrder(orders.find((o) => o.id === Number(id)) ?? null))
      .catch((e) =>
        e instanceof ApiError && e.status === 401
          ? router.replace(`/login?next=/orders/${id}`)
          : setError(e.message)
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/login?next=/orders/${id}`);
      return;
    }
    loadOrder();
  }, [id, router]);

  if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>Đang tải thông tin đơn hàng...</div>;
  if (error) return <div style={{ padding: "40px", textAlign: "center", color: "red" }}>{error}</div>;
  if (!order) {
    return (
      <div style={{ maxWidth: "400px", margin: "40px auto", textAlign: "center", padding: "20px" }}>
        <p>Không tìm thấy đơn hàng.</p>
        <Link href="/" style={{ color: "#d97706", textDecoration: "underline", display: "inline-block", marginTop: "12px" }}>
          Về trang chủ
        </Link>
      </div>
    );
  }

  const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
  const canRetryPayment = order.status === "PENDING" || order.status === "PAYMENT_FAILED";
  const canCancel = order.status === "PENDING" || order.status === "PAYMENT_FAILED";
  const currentStepIndex = PROGRESS_STEPS.indexOf(order.status);

  const handleCancel = async () => {
    if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) return;
    setUpdating(true);
    setError(null);
    try {
      await cancelOrder(order.id);
      loadOrder();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể hủy đơn hàng");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ minHeight: "85vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      {/* Khung chứa chuẩn style trực tiếp, đảm bảo khoảng cách padding lớn, không bị dính chữ */}
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#ffffff",
          color: "#111111",
          borderRadius: "20px",
          padding: "36px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          boxSizing: "border-box",
          border: "1px solid #e5e7eb",
        }}
      >
        {/* Icon trạng thái */}
        <div
          style={{
            width: "64px",
            height: "64px",
            margin: "0 auto 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: config.badgeBg,
            color: "#ffffff",
            borderRadius: "50%",
            fontSize: "28px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {config.icon}
        </div>

        <h1 style={{ margin: "0 0 8px 0", textAlign: "center", fontSize: "24px", fontWeight: 700 }}>
          {config.title}
        </h1>
        <p style={{ margin: "0 0 24px 0", textAlign: "center", fontSize: "14px", color: "#6b7280", lineHeight: "1.5" }}>
          {config.subtitle}
        </p>

        {/* Thanh tiến trình */}
        {currentStepIndex !== -1 && (
          <div style={{ margin: "24px 0", borderTop: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6", padding: "16px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              {PROGRESS_STEPS.map((st, idx) => {
                const isPassed = idx <= currentStepIndex;
                return (
                  <div key={st} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "bold",
                        background: isPassed ? "#d97706" : "#e5e7eb",
                        color: isPassed ? "#ffffff" : "#9ca3af",
                      }}
                    >
                      {idx + 1}
                    </div>
                    <span style={{ marginTop: "6px", fontSize: "11px", fontWeight: isPassed ? 600 : 400, color: isPassed ? "#b45309" : "#9ca3af" }}>
                      {STEP_LABELS[st]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Thông tin đơn hàng */}
        <div style={{ margin: "24px 0", fontSize: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
            <span style={{ color: "#6b7280" }}>Mã đơn hàng</span>
            <span style={{ fontWeight: 600 }}>#{order.id}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
            <span style={{ color: "#6b7280" }}>Trạng thái hệ thống</span>
            <span style={{ fontWeight: 600, color: "#d97706" }}>{order.status}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
            <span style={{ color: "#6b7280" }}>Tổng tiền thanh toán</span>
            <span style={{ fontWeight: 700, fontSize: "16px" }}>{formatVND(order.total)}</span>
          </div>
        </div>

        {/* Nhóm nút bấm thao tác */}
        <div style={{ marginTop: "28px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {canRetryPayment && (
            <Link
              href="/checkout"
              style={{
                display: "block",
                width: "100%",
                padding: "14px",
                background: "#d97706",
                color: "#ffffff",
                textAlign: "center",
                borderRadius: "12px",
                fontWeight: 600,
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              Tiến hành thanh toán ngay
            </Link>
          )}

          {canCancel && (
            <button
              disabled={updating}
              onClick={handleCancel}
              style={{
                width: "100%",
                padding: "12px",
                background: "transparent",
                color: "#dc2626",
                border: "1px solid #fca5a5",
                borderRadius: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Hủy đơn hàng này
            </button>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <Link
              href="/orders"
              style={{
                flex: 1,
                padding: "12px",
                border: "1px solid #d1d5db",
                borderRadius: "12px",
                textAlign: "center",
                color: "#374151",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            >
              Xem lịch sử đơn
            </Link>
            <Link
              href="/"
              style={{
                flex: 1,
                padding: "12px",
                background: "#d97706",
                borderRadius: "12px",
                textAlign: "center",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}