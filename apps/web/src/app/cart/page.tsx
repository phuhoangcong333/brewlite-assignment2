"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MAX_QTY_PER_LINE, useCart, useHydrated } from "@/lib/cart";
import { formatVND, TOPPINGS } from "@/lib/pricing";
import type { QuoteItemStatus } from "@/lib/quote-types";
import { useQuote } from "@/lib/use-quote";

const STATUS_TEXT: Record<QuoteItemStatus, string | null> = {
  AVAILABLE: null,
  OUT_OF_STOCK: "Món này đã hết hoặc không đủ số lượng. Hãy giảm số lượng hoặc xóa khỏi giỏ.",
  TOPPING_OUT_OF_STOCK: "Một topping đã hết. Hãy đổi topping hoặc xóa món khỏi giỏ.",
  PRODUCT_NOT_FOUND: "Món này không còn được bán. Hãy xóa khỏi giỏ.",
};

const qtyButton = {
  padding: "4px 10px",
  background: "#f9fafb",
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
} as const;

const primaryButton = {
  display: "block",
  width: "100%",
  marginTop: "16px",
  padding: "14px",
  background: "#d97706",
  color: "#ffffff",
  textAlign: "center",
  borderRadius: "12px",
  border: "none",
  fontWeight: 600,
  fontSize: "16px",
  textDecoration: "none",
  boxSizing: "border-box",
} as const;

export default function CartPage() {
  const hydrated = useHydrated();
  const {
    items,
    promotionCode,
    promoNotice,
    setQty,
    remove,
    clear,
    setPromotionCode,
    rejectPromotion,
  } = useCart();
  const { quote, loading, error, retry } = useQuote(items, promotionCode);
  const [codeInput, setCodeInput] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  // Mã bị server từ chối thì tự gỡ và giữ lại lý do để hiển thị.
  const rejected =
    !loading && quote?.promotion && !quote.promotion.valid ? quote.promotion : null;
  const rejectedMessage = rejected
    ? (rejected.message ?? "Mã khuyến mãi không áp dụng được.")
    : null;
  useEffect(() => {
    if (rejectedMessage) rejectPromotion(rejectedMessage);
  }, [rejectedMessage, rejectPromotion]);

  if (!hydrated) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Đang tải giỏ hàng...</div>;
  }

  if (items.length === 0) {
    return (
      <div style={{ width: "100%", maxWidth: "600px", margin: "40px auto", padding: "40px", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "20px", textAlign: "center", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: "0 0 12px 0" }}>Giỏ hàng</h1>
        <p style={{ color: "#6b7280", margin: "0 0 20px 0" }}>Giỏ hàng đang trống.</p>
        {promoNotice && (
          <p role="alert" style={{ color: "#b91c1c", margin: "0 0 20px 0" }}>{promoNotice}</p>
        )}
        <Link href="/" style={{ display: "inline-block", padding: "12px 24px", background: "#d97706", color: "#ffffff", borderRadius: "12px", fontWeight: 600, textDecoration: "none" }}>
          Chọn món từ menu
        </Link>
      </div>
    );
  }

  const problemCount = quote ? quote.items.filter((q) => q.status !== "AVAILABLE").length : 0;
  const canCheckout = !!quote && !loading && !error && problemCount === 0;
  const appliedPromotion = quote?.promotion?.valid ? quote.promotion : null;

  const applyCode = () => {
    if (!codeInput.trim()) return;
    setPromotionCode(codeInput);
    setCodeInput("");
  };

  let checkoutHint: string | null = null;
  if (error) checkoutHint = error;
  else if (loading) checkoutHint = "Đang tính giá...";
  else if (problemCount > 0) checkoutHint = "Hãy xử lý các món báo lỗi để tiếp tục thanh toán.";

  return (
    <div style={{ width: "100%", padding: "32px 16px", boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "12px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>Giỏ hàng của bạn</h1>
          {confirmClear ? (
            <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
              Xóa toàn bộ giỏ hàng?
              <button
                type="button"
                onClick={() => {
                  clear();
                  setConfirmClear(false);
                }}
                style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 12px", cursor: "pointer" }}
              >
                Xác nhận xóa
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "6px 12px", cursor: "pointer" }}
              >
                Giữ lại
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              style={{ background: "none", border: "none", color: "#dc2626", fontSize: "14px", cursor: "pointer", textDecoration: "underline" }}
            >
              Xóa tất cả
            </button>
          )}
        </div>

        <div className="cart-panel" style={{ width: "100%", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "20px", padding: "28px", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", boxSizing: "border-box", opacity: loading ? 0.7 : 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {items.map((i, idx) => {
              const q = quote?.items[idx];
              const statusText = q ? STATUS_TEXT[q.status] : null;
              const toppingText =
                i.toppings.length > 0
                  ? i.toppings.map((id) => TOPPINGS.find((t) => t.id === id)?.name ?? id).join(", ")
                  : "Không topping";

              return (
                <div className="cart-item" key={i.key} style={{ paddingBottom: "16px", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="cart-item__details" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{ width: 64, height: 64, minWidth: 64, borderRadius: "12px", background: "#fef3c7", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {i.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.imageUrl} alt={i.name} style={{ width: 64, height: 64, objectFit: "cover" }} />
                        ) : (
                          <span>☕</span>
                        )}
                      </div>
                      <div>
                        <p style={{ margin: "0 0 4px 0", fontWeight: 600, fontSize: "15px" }}>{i.name}</p>
                        <p style={{ margin: "0 0 2px 0", fontSize: "13px", color: "#6b7280" }}>Size {i.size}</p>
                        <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>{toppingText}</p>
                      </div>
                    </div>

                    <div className="cart-item__controls" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", border: "1px solid #d1d5db", borderRadius: "8px", overflow: "hidden" }}>
                        <button
                          type="button"
                          aria-label={`Giảm số lượng ${i.name}`}
                          onClick={() => setQty(i.key, Math.max(1, i.qty - 1))}
                          style={qtyButton}
                        >
                          -
                        </button>
                        <span style={{ padding: "0 10px", fontSize: "14px", fontWeight: 600 }}>{i.qty}</span>
                        <button
                          type="button"
                          aria-label={`Tăng số lượng ${i.name}`}
                          disabled={i.qty >= MAX_QTY_PER_LINE}
                          onClick={() => setQty(i.key, i.qty + 1)}
                          style={{ ...qtyButton, cursor: i.qty >= MAX_QTY_PER_LINE ? "not-allowed" : "pointer", opacity: i.qty >= MAX_QTY_PER_LINE ? 0.4 : 1 }}
                        >
                          +
                        </button>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: "15px", width: "90px", textAlign: "right" }}>
                        {q && q.status === "AVAILABLE" ? formatVND(q.lineTotal) : "—"}
                      </span>
                      <button
                        type="button"
                        aria-label={`Xóa ${i.name}`}
                        onClick={() => remove(i.key)}
                        style={{ background: "none", border: "none", color: "#dc2626", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                  {statusText && (
                    <p role="alert" style={{ margin: "8px 0 0 80px", fontSize: "13px", color: "#b91c1c" }}>{statusText}</p>
                  )}
                  {q?.status === "AVAILABLE" && q.priceChanged && (
                    <p style={{ margin: "8px 0 0 80px", fontSize: "13px", color: "#92400e" }}>
                      Giá món này vừa được cập nhật theo giá mới nhất.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f3f4f6" }}>
            <label htmlFor="promo-code" style={{ display: "block", fontWeight: 600, fontSize: "14px", marginBottom: "8px" }}>
              Mã khuyến mãi
            </label>
            {promotionCode ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "14px" }}>
                  <strong>{promotionCode}</strong>
                  {appliedPromotion && (
                    <span style={{ color: "#15803d" }}> — giảm {formatVND(appliedPromotion.discountAmount)}</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setPromotionCode(null)}
                  style={{ background: "none", border: "none", color: "#dc2626", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}
                >
                  Gỡ mã
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  id="promo-code"
                  value={codeInput}
                  maxLength={50}
                  onChange={(e) => setCodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyCode();
                  }}
                  placeholder="Nhập mã"
                  style={{ flex: 1, padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px" }}
                />
                <button
                  type="button"
                  onClick={applyCode}
                  style={{ padding: "10px 16px", background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}
                >
                  Áp dụng
                </button>
              </div>
            )}
            {promoNotice && (
              <p role="alert" style={{ margin: "8px 0 0 0", fontSize: "13px", color: "#b91c1c" }}>{promoNotice}</p>
            )}
          </div>

          <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "2px solid #f3f4f6", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px" }}>
              <span>Tạm tính</span>
              <span>{quote ? formatVND(quote.subtotal) : "—"}</span>
            </div>
            {quote && quote.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", color: "#15803d" }}>
                <span>Giảm giá</span>
                <span>-{formatVND(quote.discount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "18px" }}>
              <span style={{ fontWeight: 600 }}>Tổng cộng:</span>
              <span style={{ fontWeight: "bold", color: "#d97706" }}>{quote ? formatVND(quote.total) : "—"}</span>
            </div>
          </div>

          {checkoutHint && (
            <p role="status" style={{ margin: "16px 0 0 0", fontSize: "13px", color: error ? "#b91c1c" : "#6b7280" }}>
              {checkoutHint}{" "}
              {error && (
                <button type="button" onClick={retry} style={{ background: "none", border: "none", color: "#d97706", textDecoration: "underline", cursor: "pointer", fontSize: "13px" }}>
                  Thử lại
                </button>
              )}
            </p>
          )}

          {canCheckout ? (
            <Link href="/checkout" style={primaryButton}>
              Tiến hành thanh toán
            </Link>
          ) : (
            <button type="button" disabled style={{ ...primaryButton, background: "#d1d5db", cursor: "not-allowed" }}>
              Tiến hành thanh toán
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
