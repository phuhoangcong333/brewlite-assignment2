"use client";

import Link from "next/link";
import { cartSubtotal, lineTotalOf, useCart, useHydrated } from "@/lib/cart";
import { formatVND, TOPPINGS } from "@/lib/pricing";

export default function CartPage() {
  const hydrated = useHydrated();
  const { items, setQty, remove } = useCart();

  if (!hydrated) return <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Đang tải giỏ hàng...</div>;

  if (items.length === 0) {
    return (
      <div style={{ width: "100%", maxWidth: "600px", margin: "40px auto", padding: "40px", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "20px", textAlign: "center", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: "0 0 12px 0" }}>Giỏ hàng</h1>
        <p style={{ color: "#6b7280", margin: "0 0 20px 0" }}>Giỏ hàng đang trống.</p>
        <Link href="/" style={{ display: "inline-block", padding: "12px 24px", background: "#d97706", color: "#ffffff", borderRadius: "12px", fontWeight: 600, textDecoration: "none" }}>
          Chọn món từ menu
        </Link>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", padding: "32px 16px", boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px" }}>Giỏ hàng của bạn</h1>

        <div style={{ width: "100%", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "20px", padding: "28px", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", boxSizing: "border-box" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {items.map((i) => {
              const toppingText =
                i.toppings.length > 0
                  ? i.toppings.map((id) => TOPPINGS.find((t) => t.id === id)?.name ?? id).join(", ")
                  : "Không topping";

              return (
                <div key={i.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "16px", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ width: 64, height: 64, minWidth: 64, borderRadius: "12px", background: "#fef3c7", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {i.imageUrl ? (
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

                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #d1d5db", borderRadius: "8px", overflow: "hidden" }}>
                      <button
                        onClick={() => setQty(i.key, Math.max(1, i.qty - 1))}
                        style={{ padding: "4px 10px", background: "#f9fafb", border: "none", cursor: "pointer", fontWeight: "bold" }}
                      >
                        -
                      </button>
                      <span style={{ padding: "0 10px", fontSize: "14px", fontWeight: 600 }}>{i.qty}</span>
                      <button
                        onClick={() => setQty(i.key, i.qty + 1)}
                        style={{ padding: "4px 10px", background: "#f9fafb", border: "none", cursor: "pointer", fontWeight: "bold" }}
                      >
                        +
                      </button>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: "15px", width: "90px", textAlign: "right" }}>{formatVND(lineTotalOf(i))}</span>
                    <button
                      onClick={() => remove(i.key)}
                      style={{ background: "none", border: "none", color: "#dc2626", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: "2px solid #f3f4f6", fontSize: "18px" }}>
            <span style={{ fontWeight: 600 }}>Tổng cộng:</span>
            <span style={{ fontWeight: "bold", color: "#d97706" }}>{formatVND(cartSubtotal(items))}</span>
          </div>

          <Link
            href="/checkout"
            style={{
              display: "block",
              width: "100%",
              marginTop: "24px",
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
            Tiến hành thanh toán
          </Link>
        </div>
      </div>
    </div>
  );
}