"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { getProducts } from "@/lib/api";
import { formatVND } from "@/lib/pricing";
import type { Product } from "@/lib/types";

const CATEGORIES = [
  { key: "ALL", label: "Tất cả" },
  { key: "COFFEE", label: "Cà phê" },
  { key: "FRUIT_TEA", label: "Trà trái cây" },
  { key: "MILK_TEA", label: "Trà sữa" },
] as const;

const emptySubscribe = () => () => {};
const getTokenSnapshot = () => Boolean(localStorage.getItem("access_token"));
const getServerSnapshot = () => false;

export default function MenuPage() {
  const router = useRouter();
  const hasToken = useSyncExternalStore(
    emptySubscribe,
    getTokenSnapshot,
    getServerSnapshot,
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasToken) {
      router.replace("/login");
    }
  }, [hasToken, router]);

  useEffect(() => {
    if (!hasToken) return;

    let cancelled = false;

    getProducts(selectedCategory)
      .then((data) => {
        if (!cancelled) {
          setProducts(data);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Không thể tải danh sách món",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasToken, selectedCategory]);

  const handleSelectCategory = (category: string) => {
    if (category === selectedCategory) return;
    setLoading(true);
    setError(null);
    setSelectedCategory(category);
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    getProducts(selectedCategory)
      .then((data) => {
        setProducts(data);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(
          e instanceof Error ? e.message : "Không thể tải danh sách món",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  if (!hasToken) {
    return null;
  }

  return (
    <main className="mx-auto max-w-5xl p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">BrewLite - Menu</h1>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => handleSelectCategory(cat.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-amber-700 text-white"
                    : "bg-amber-50 text-amber-900 hover:bg-amber-100"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading && <p>Đang tải menu...</p>}

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-red-700">
          <p>{error}</p>

          <button
            type="button"
            onClick={handleRetry}
            className="mt-2 underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <p>Hiện chưa có sản phẩm nào.</p>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {products.map((p) => {
            const isOutOfStock = p.availableQuantity <= 0;

            return (
              <div
                key={p.id}
                className={`flex flex-col justify-between rounded-lg border p-3 transition ${
                  isOutOfStock
                    ? "border-gray-200 bg-gray-50 opacity-60"
                    : "hover:shadow-md"
                }`}
              >
                {isOutOfStock ? (
                  <div className="cursor-not-allowed">
                    <div className="mb-2 flex h-28 items-center justify-center rounded bg-gray-200 text-4xl grayscale">
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

                    <p className="font-medium text-gray-600">{p.name}</p>

                    <p className="text-gray-500">{formatVND(p.price)}</p>
                  </div>
                ) : (
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
                )}

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => !isOutOfStock && router.push(`/products/${p.id}`)}
                  className={`mt-3 w-full rounded-md py-1.5 text-center text-xs font-semibold ${
                    !isOutOfStock
                      ? "bg-amber-50 text-amber-800 hover:bg-amber-100"
                      : "cursor-not-allowed bg-gray-200 text-gray-500"
                  }`}
                  aria-live="polite"
                >
                  {!isOutOfStock
                    ? `Có thể pha: ${p.availableQuantity} ly`
                    : "Hết hàng"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}