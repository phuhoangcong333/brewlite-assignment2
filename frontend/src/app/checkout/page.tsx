"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { cartSubtotal, lineTotalOf, useCart, useHydrated } from "@/lib/cart";
import { formatVND, TOPPINGS } from "@/lib/pricing";
import { ApiError, createOrder, createPayment, type PaymentInput } from "@/lib/orders-api";

type Method = "WALLET" | "CARD";
type Step = "idle" | "creating" | "paying" | "done";

export default function CheckoutPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { items, clear } = useCart();
  const [method, setMethod] = useState<Method>("WALLET");
  const [walletId, setWalletId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  const orderId = useRef<number | null>(null);
  const idemKey = useRef<string | null>(null);
  const busy = step !== "idle";

  useEffect(() => {
    if (!getToken()) router.replace("/login?next=/checkout");
  }, [router]);

  if (!hydrated) return <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Đang tải...</div>;

  if (items.length === 0) {
    return (
      <div style={{ maxWidth: "500px", margin: "40px auto", padding: "40px", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "20px", textAlign: "center" }}>
        <p style={{ color: "#6b7280", margin: "0 0 16px 0" }}>Giỏ hàng trống, không thể thanh toán.</p>
        <Link href="/" style={{ color: "#d97706", textDecoration: "underline", fontWeight: 600 }}>
          Quay lại menu
        </Link>
      </div>
    );
  }

  const total = cartSubtotal(items);
  const detail = method === "WALLET" ? walletId.trim() : cardNumber.replace(/\s/g, "");

  const handleConfirm = async () => {
    if (busy) return;
    setError(null);
    try {
      if (orderId.current === null) {
        setStep("creating");
        orderId.current = (await createOrder(items, promoCode)).id;
      }
      setStep("paying");
      if (!idemKey.current) idemKey.current = crypto.randomUUID();

      const input: PaymentInput =
        method === "WALLET"
          ? { orderId: orderId.current, method, walletId: detail }
          : { orderId: orderId.current, method, cardNumber: detail };

      const result = await createPayment(input, idemKey.current);
      idemKey.current = null;

      if (result.order_status === "PAID") {
        const id = orderId.current;
        setStep("done");
        clear();
        router.replace(`/orders/${id}`);
      } else {
        setStep("idle");
        setError(`${result.message}. Vui lòng kiểm tra lại thông tin.`);
      }
    } catch (e) {
      setStep("idle");
      if (e instanceof ApiError && e.status === 401) return router.replace("/login?next=/checkout");
      if (e instanceof ApiError && e.status === 409) idemKey.current = null;
      setError(e instanceof Error ? e.message : "Không thể thanh toán");
    }
  };

  return (
    <div style={{ maxWidth: "750px", margin: "0 auto", padding: "32px 16px", boxSizing: "border-box" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px" }}>Thanh toán đơn hàng</h1>

      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "20px", padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
        {/* Danh sách món */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
          {items.map((i) => {
            const toppingText = i.toppings.length > 0 ? i.toppings.map((id) => TOPPINGS.find((t) => t.id === id)?.name ?? id).join(", ") : "Không topping";
            return (
              <div key={i.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid #f3f4f6" }}>
                <div>
                  <p style={{ margin: "0 0 2px 0", fontWeight: 600, fontSize: "14px" }}>{i.name} (Size {i.size}) x{i.qty}</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>{toppingText}</p>
                </div>
                <span style={{ fontWeight: 600, fontSize: "14px" }}>{formatVND(lineTotalOf(i))}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: "bold", marginBottom: "24px", paddingTop: "12px", borderTop: "2px solid #f3f4f6" }}>
          <span>Tổng tiền:</span>
          <span style={{ color: "#d97706" }}>{formatVND(total)}</span>
        </div>

        {/* Mã khuyến mãi */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Mã khuyến mãi</label>
          <input
            type="text"
            value={promoCode}
            disabled={busy}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Nhập mã (VD: GIAM10, BREW20)"
            style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "10px", fontSize: "14px", boxSizing: "border-box", textTransform: "uppercase" }}
          />
        </div>

        {/* Phương thức thanh toán */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Phương thức thanh toán</label>
          <div style={{ display: "flex", gap: "20px", marginBottom: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
              <input type="radio" checked={method === "WALLET"} disabled={busy} onChange={() => setMethod("WALLET")} />
              Ví điện tử
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
              <input type="radio" checked={method === "CARD"} disabled={busy} onChange={() => setMethod("CARD")} />
              Thẻ ngân hàng
            </label>
          </div>

          {method === "WALLET" ? (
            <input
              value={walletId}
              disabled={busy}
              onChange={(e) => setWalletId(e.target.value)}
              placeholder="Nhập mã ví (VD: WALLET-1234)"
              style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "10px", fontSize: "14px", boxSizing: "border-box" }}
            />
          ) : (
            <input
              value={cardNumber}
              disabled={busy}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="Nhập số thẻ (VD: 4111222233334444)"
              style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "10px", fontSize: "14px", boxSizing: "border-box" }}
            />
          )}
          <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#6b7280" }}>Mẹo: Kết thúc 4 số cuối bằng `0000` sẽ mô phỏng thanh toán thất bại[cite: 3].</p>
        </div>

        {error && (
          <div style={{ padding: "12px", background: "#fee2e2", color: "#b91c1c", borderRadius: "10px", fontSize: "14px", marginBottom: "20px" }}>
            {error}
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={busy || !detail}
          style={{
            width: "100%",
            padding: "14px",
            background: busy || !detail ? "#9ca3af" : "#d97706",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontWeight: 600,
            fontSize: "15px",
            cursor: busy || !detail ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Đang xử lý giao dịch..." : "Xác nhận trả tiền"}
        </button>
      </div>
    </div>
  );
}