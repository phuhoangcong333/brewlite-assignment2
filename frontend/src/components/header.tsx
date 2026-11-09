
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cartCount, useCart, useHydrated } from "@/lib/cart";
import { getCurrentUser, getToken } from "@/lib/orders-api";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const count = useCart((s) => cartCount(s.items));
  const [isStaff, setIsStaff] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;
    const refreshRole = () => {
      if (!getToken()) {
        setIsStaff(false);
        setIsAuthenticated(false);
        return;
      }

      void getCurrentUser()
        .then((user) => {
          if (active) {
            setIsStaff(user.role === "STAFF");
            setIsAuthenticated(true);
          }
        })
        .catch(() => {
          if (active) {
            setIsStaff(false);
            setIsAuthenticated(false);
          }
        });
    };

    refreshRole();
    window.addEventListener("auth-changed", refreshRole);
    window.addEventListener("storage", refreshRole);
    return () => {
      active = false;
      window.removeEventListener("auth-changed", refreshRole);
      window.removeEventListener("storage", refreshRole);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    window.dispatchEvent(new Event("auth-changed"));
    setIsAuthenticated(false);
    setIsStaff(false);
    router.replace("/login");
  };

  const hideNavigation =
    pathname === "/login" || pathname === "/register";

  return (
    <header
      style={{
        borderBottom: "1px solid #fed7aa",
        background: "#ffffff",
        position: "relative",
        zIndex: 50,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "1150px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 24px",
          boxSizing: "border-box",
        }}
      >
        {/* Logo BrewLite */}
        <Link
          href="/"
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            color: "#c2410c",
            textDecoration: "none",
          }}
        >
          BrewLite
        </Link>

        {!hideNavigation && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              whiteSpace: "nowrap",
            }}
          >
            {isStaff && (
              <Link
                href="/staff/orders"
                style={{
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#4b5563",
                  textDecoration: "none",
                  boxSizing: "border-box",
                }}
              >
                Nhân viên
              </Link>
            )}

            <Link
              href="/orders"
              style={{
                padding: "8px 16px",
                border: "1px solid #d97706",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#c2410c",
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              Đơn hàng của tôi
            </Link>

            <Link
              href="/cart"
              aria-label="Giỏ hàng"
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                background: "#d97706",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#ffffff",
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: "18px", height: "18px" }}
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
              </svg>

              <span>Giỏ hàng</span>

              {hydrated && count > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-6px",
                    right: "-6px",
                    display: "flex",
                    minWidth: "20px",
                    height: "20px",
                    padding: "0 4px",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    background: "#dc2626",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: "bold",
                  }}
                >
                  {count}
                </span>
              )}
            </Link>

            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  background: "#ffffff",
                  color: "#4b5563",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Đăng xuất
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
