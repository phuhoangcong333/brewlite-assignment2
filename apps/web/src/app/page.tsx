"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getProducts } from "@/lib/api";
import { formatVND } from "@/lib/pricing";
import type { Product } from "@/lib/types";

export default function MenuPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const data = await getProducts();
        if (!active) return;
        setProducts(data);
        setError(null);
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Không tải được menu");
      } finally {
        if (active) {
          setAuthorized(true);
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [router, retryCount]);

  if (!authorized) {
    return null;
  }

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-2xl font-bold">BrewLite - Menu</h1>

      {loading && <p>Đang tải menu...</p>}

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-red-700">
          <p>{error}</p>

          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              setRetryCount((value) => value + 1);
            }}
            className="mt-2 underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <p>Hiện chưa có sản phẩm nào.</p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex flex-col justify-between rounded-lg border p-3 transition hover:shadow-md"
          >
            <Link href={`/products/${p.id}`}>
              <div className="mb-2 flex h-28 items-center justify-center rounded bg-amber-100 text-4xl">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="h-full w-full rounded object-cover"
                  />
                ) : (
                  "☕"
                )}
              </div>

              <p className="font-medium">{p.name}</p>

              <p className="text-amber-700">{formatVND(p.price)}</p>
            </Link>

            <p
              className={`mt-3 rounded-md py-1.5 text-center text-xs font-semibold ${
                p.availableQuantity > 0
                  ? "bg-amber-50 text-amber-800"
                  : "bg-gray-100 text-gray-500"
              }`}
              aria-live="polite"
            >
              {p.availableQuantity > 0
                ? `Có thể pha: ${p.availableQuantity} ly`
                : "Hết hàng"}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
