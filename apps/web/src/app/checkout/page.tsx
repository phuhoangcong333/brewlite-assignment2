"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { getToken } from "@/lib/auth";
import { cartSubtotal, lineTotalOf, useCart, useHydrated } from "@/lib/cart";
import { formatVND, TOPPINGS } from "@/lib/pricing";
import { ApiError, createOrder, createPayment, type PaymentInput } from "@/lib/orders-api";
import { ProtectedRoute } from "@/lib/auth-context";

type Method = "WALLET" | "QR" | "CARD";
type Step = "idle" | "creating" | "paying" | "done";
type WalletProvider = "MoMo" | "ZaloPay";

export default function CheckoutPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { items, clear } = useCart();
  const [method, setMethod] = useState<Method>("WALLET");
  const [walletProvider, setWalletProvider] = useState<WalletProvider>("MoMo");
  const [walletPhone, setWalletPhone] = useState("");
  const [linkedWallet, setLinkedWallet] = useState<{
    provider: WalletProvider;
    lastFour: string;
  } | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [orderTotal, setOrderTotal] = useState<number | null>(null);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [qrOrderId, setQrOrderId] = useState<number | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [stockConflict, setStockConflict] = useState(false);

  const orderId = useRef<number | null>(null);
  const idemKey = useRef<string | null>(null);
  const busy = step !== "idle";

  const showStockConflict = (e: unknown): boolean => {
    if (
      e instanceof ApiError &&
      e.status === 409 &&
      /^Insufficient stock for product \d+$/.test(e.message)
    ) {
      setStockConflict(true);
      setError(
        "Lỗi 409: Không thể tạo đơn vì tồn kho của một món vừa thay đổi và không còn đủ số lượng bạn chọn. Giỏ hàng của bạn vẫn được giữ nguyên.",
      );
      return true;
    }
    return false;
  };

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
  const payableTotal = orderTotal ?? total;
  const detail =
    method === "WALLET"
      ? linkedWallet?.lastFour ?? ""
      : method === "CARD"
        ? cardNumber.replace(/\s/g, "")
        : qrPayload ?? "";

  const ensureOrder = async () => {
    if (orderId.current !== null) {
      return { id: orderId.current, total: orderTotal ?? total };
    }
    const order = await createOrder(items, promoCode);
    orderId.current = order.id;
    setOrderTotal(order.total);
    return order;
  };

  const handleLinkWallet = () => {
    const normalizedPhone = walletPhone.replace(/[\s-]/g, "");
    const phoneDigits = normalizedPhone.startsWith("+84")
      ? `0${normalizedPhone.slice(3)}`
      : normalizedPhone;
    if (!/^0\d{9}$/.test(phoneDigits)) {
      setError("Vui lòng nhập số điện thoại Việt Nam hợp lệ để liên kết ví demo.");
      return;
    }

    setLinkedWallet({ provider: walletProvider, lastFour: phoneDigits.slice(-4) });
    setWalletPhone("");
    setError(null);
  };

  const handleCreateQr = async () => {
    if (busy) return;
    setError(null);
    setStockConflict(false);
    setStep("creating");
    try {
      const order = await ensureOrder();
      setQrPayload(
        `BREWLITE_DEMO_PAYMENT|order=${order.id}|amount=${order.total}|currency=VND`,
      );
      setQrOrderId(order.id);
    } catch (e) {
      if (showStockConflict(e)) return;
      setError(e instanceof Error ? e.message : "Không thể tạo mã QR");
    } finally {
      setStep("idle");
    }
  };

  const handleConfirm = async () => {
    if (busy) return;
    setError(null);
    setStockConflict(false);
    try {
      setStep("creating");
      const order = await ensureOrder();
      const id = order.id;
      setStep("paying");
      if (!idemKey.current) idemKey.current = crypto.randomUUID();

      const input: PaymentInput =
        method === "CARD"
          ? { orderId: id, method, cardNumber: detail }
          : {
              orderId: id,
              method: "WALLET",
              walletId:
                method === "QR"
                  ? `QR-${id}`
                  : `${linkedWallet?.provider ?? "WALLET"}-${linkedWallet?.lastFour ?? ""}`,
            };

      const result = await createPayment(input, idemKey.current);
      idemKey.current = null;

      if (result.order_status === "PAID") {
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
      if (showStockConflict(e)) return;
      if (e instanceof ApiError && e.status === 409) idemKey.current = null;
      setError(e instanceof Error ? e.message : "Không thể thanh toán");
    }
  };

  return (
    <ProtectedRoute>
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
          <span style={{ color: "#d97706" }}>{formatVND(payableTotal)}</span>
        </div>

        {/* Mã khuyến mãi */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Mã khuyến mãi</label>
          <input
            type="text"
            value={promoCode}
            disabled={busy || orderTotal !== null}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Nhập mã (VD: GIAM10, BREW20)"
            style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "10px", fontSize: "14px", boxSizing: "border-box", textTransform: "uppercase" }}
          />
        </div>

        {/* Phương thức thanh toán */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Phương thức thanh toán</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginBottom: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
              <input type="radio" checked={method === "WALLET"} disabled={busy} onChange={() => setMethod("WALLET")} />
              Liên kết ví
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
              <input type="radio" checked={method === "QR"} disabled={busy} onChange={() => setMethod("QR")} />
              Quét mã QR
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
              <input type="radio" checked={method === "CARD"} disabled={busy} onChange={() => setMethod("CARD")} />
              Thẻ ngân hàng
            </label>
          </div>

          {method === "WALLET" ? (
            linkedWallet ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "14px", border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: "10px" }}>
                <span style={{ fontSize: "14px" }}>
                  Đã liên kết {linkedWallet.provider} ···· {linkedWallet.lastFour} (demo)
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setLinkedWallet(null)}
                  style={{ border: 0, background: "transparent", color: "#b91c1c", cursor: "pointer" }}
                >
                  Hủy liên kết
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                <select
                  value={walletProvider}
                  disabled={busy}
                  onChange={(e) => setWalletProvider(e.target.value as WalletProvider)}
                  style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "10px", fontSize: "14px", boxSizing: "border-box" }}
                >
                  <option value="MoMo">MoMo</option>
                  <option value="ZaloPay">ZaloPay</option>
                </select>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={walletPhone}
                  disabled={busy}
                  onChange={(e) => setWalletPhone(e.target.value)}
                  placeholder="Số điện thoại ví"
                  style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "10px", fontSize: "14px", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  disabled={busy || !walletPhone.trim()}
                  onClick={handleLinkWallet}
                  style={{ justifySelf: "start", padding: "10px 14px", border: 0, borderRadius: "8px", background: "#f3f4f6", color: "#111827", fontWeight: 600, cursor: "pointer" }}
                >
                  Liên kết ví (demo)
                </button>
              </div>
            )
          ) : method === "QR" ? (
            <div style={{ display: "grid", justifyItems: "center", gap: "12px", padding: "20px", border: "1px solid #e5e7eb", borderRadius: "12px", textAlign: "center" }}>
              {qrPayload ? (
                <>
                  <QRCodeSVG value={qrPayload} size={208} level="M" />
                  <strong>Đơn hàng #{qrOrderId} · {formatVND(payableTotal)}</strong>
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>
                    Quét bằng camera điện thoại để xem dữ liệu thanh toán demo. Đây không phải mã chuyển khoản ngân hàng.
                  </p>
                </>
              ) : (
                <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
                  Tạo mã QR demo cho đơn hàng để quét bằng điện thoại.
                </p>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={handleCreateQr}
                style={{ padding: "10px 14px", border: 0, borderRadius: "8px", background: "#f3f4f6", color: "#111827", fontWeight: 600, cursor: "pointer" }}
              >
                {qrPayload ? "Tạo lại mã QR" : "Tạo mã QR"}
              </button>
            </div>
          ) : (
            <input
              value={cardNumber}
              disabled={busy}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="Nhập số thẻ (VD: 4111222233334444)"
              style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "10px", fontSize: "14px", boxSizing: "border-box" }}
            />
          )}
          {method !== "QR" && (
            <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#6b7280" }}>
              Demo: kết thúc thông tin ví/thẻ bằng `0000` sẽ mô phỏng thanh toán thất bại.
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            style={{ padding: "12px", background: "#fee2e2", color: "#b91c1c", borderRadius: "10px", fontSize: "14px", marginBottom: "20px" }}
          >
            {error}
            {stockConflict && (
              <div style={{ marginTop: "10px" }}>
                <Link
                  href="/cart"
                  style={{ color: "#991b1b", fontWeight: 600, textDecoration: "underline" }}
                >
                  Quay lại giỏ hàng để chỉnh sửa
                </Link>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={busy || !detail || (method === "QR" && !qrPayload)}
          style={{
            width: "100%",
            padding: "14px",
            background: busy || !detail || (method === "QR" && !qrPayload) ? "#9ca3af" : "#d97706",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontWeight: 600,
            fontSize: "15px",
            cursor: busy || !detail || (method === "QR" && !qrPayload) ? "not-allowed" : "pointer",
          }}
        >
          {busy
            ? step === "creating"
              ? "Đang tạo đơn..."
              : "Đang xử lý giao dịch..."
            : method === "QR"
              ? "Xác nhận đã quét QR (demo)"
              : "Xác nhận trả tiền"}
        </button>
      </div>
    </div>
    </ProtectedRoute>
  );
}