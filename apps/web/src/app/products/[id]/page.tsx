"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getProduct } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { calcUnitPrice, formatVND, SIZE_EXTRA, TOPPINGS } from "@/lib/pricing";
import type { Product, Size } from "@/lib/types";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const addToCart = useCart((s) => s.add);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState<Size>("M");
  const [toppings, setToppings] = useState<string[]>([]);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    getProduct(Number(params.id))
      .then(setProduct)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const toggleTopping = (id: string) =>
    setToppings((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );

  if (loading) return <p className="p-4">Đang tải...</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (!product) return <p className="p-4">Không tìm thấy sản phẩm.</p>;

  const unitPrice = calcUnitPrice(product.price, size, toppings);
  const canAdd = product.stock > 0 && qty <= product.stock;

  const handleAdd = () => {
    if (!canAdd) return;
    addToCart({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      basePrice: product.price,
      size,
      toppings,
      qty,
    });
    router.push("/cart");
  };

  return (
    <main className="mx-auto max-w-xl p-4">
      <Link href="/" className="text-sm underline">
        ← Quay lại menu
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{product.name}</h1>
      <p className="text-amber-700">Giá gốc: {formatVND(product.price)}</p>
      <p className={product.stock > 0 ? "mt-1 text-sm text-green-700" : "mt-1 text-sm text-red-600"}>
        {product.stock > 0 ? `Còn lại trong kho: ${product.stock}` : "Hết hàng"}
      </p>

      <div className="mt-3 flex h-64 items-center justify-center rounded bg-amber-100 text-6xl">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full rounded object-cover"
          />
        ) : (
          "☕"
        )}
      </div>

      <section className="mt-4">
        <h2 className="mb-2 font-medium">Size</h2>
        <div className="flex gap-2">
          {(["S", "M", "L"] as Size[]).map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`rounded border px-4 py-2 ${
                size === s ? "bg-amber-600 text-white" : ""
              }`}
            >
              {s} {SIZE_EXTRA[s] > 0 && `(+${formatVND(SIZE_EXTRA[s])})`}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4">
        <h2 className="mb-2 font-medium">Topping</h2>
        <div className="flex flex-col gap-1">
          {TOPPINGS.map((t) => (
            <label key={t.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={toppings.includes(t.id)}
                onChange={() => toggleTopping(t.id)}
              />
              {t.name} (+{formatVND(t.price)})
            </label>
          ))}
        </div>
      </section>

      <section className="mt-4 flex items-center gap-3">
        <h2 className="font-medium">Số lượng</h2>
        <button
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="rounded border px-3"
          disabled={qty <= 1}
        >
          -
        </button>
        <span>{qty}</span>
        <button
          onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
          className="rounded border px-3"
          disabled={qty >= product.stock}
        >
          +
        </button>
      </section>

      <button
        onClick={handleAdd}
        disabled={!canAdd}
        className="mt-6 w-full rounded bg-amber-600 py-3 text-white disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {product.stock > 0 ? `Thêm vào giỏ - ${formatVND(unitPrice * qty)}` : "Hết hàng"}
      </button>
    </main>
  );
}