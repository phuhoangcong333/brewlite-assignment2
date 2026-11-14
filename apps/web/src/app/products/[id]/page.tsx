"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getProduct } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatVND } from "@/lib/pricing";
import type { ProductDetail, Size } from "@/lib/types";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const addToCart = useCart((s) => s.add);

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState<Size>("M");
  const [selectedToppingIds, setSelectedToppingIds] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);
  const [cartError, setCartError] = useState<string | null>(null);

  useEffect(() => {
    getProduct(Number(params.id))
      .then((detail) => {
        setProduct(detail);

        if (detail && !detail.sizes.some((option) => option.code === "M")) {
          setSize(detail.sizes[0]?.code ?? "M");
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Không thể tải sản phẩm.");
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <p className="p-4">Đang tải...</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (!product) return <p className="p-4">Không tìm thấy sản phẩm.</p>;

  const selectedSize = product.sizes.find((option) => option.code === size);
  const selectedToppings = product.toppings.filter((topping) =>
    selectedToppingIds.includes(topping.id),
  );
  const availableQuantity = product.availableQuantityBySize[size] ?? 0;

  const unitPrice =
    product.price +
    (selectedSize?.additionalPrice ?? 0) +
    selectedToppings.reduce(
      (total, topping) => total + topping.additionalPrice,
      0,
    );

  const canAdd =
    Boolean(selectedSize) && availableQuantity > 0 && qty <= availableQuantity;

  const toggleTopping = (id: number, isAvailable: boolean) => {
    if (!isAvailable) return;

    setSelectedToppingIds((current) =>
      current.includes(id)
        ? current.filter((toppingId) => toppingId !== id)
        : [...current, id],
    );
  };

  const handleAdd = () => {
    if (!canAdd || !selectedSize) return;

    const result = addToCart({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      basePrice: product.price,
      size,
      sizeId: selectedSize.id,
      toppings: selectedToppings.map((topping) => topping.name),
      toppingIds: selectedToppings.map((topping) => topping.id),
      clientUnitPrice: unitPrice,
      note: note.trim() || undefined,
      qty,
    });

    if (!result.ok) {
      setCartError(result.error);
      return;
    }

    router.push("/cart");
  };

  return (
    <main className="mx-auto max-w-xl p-4">
      <Link href="/" className="text-sm underline">
        ← Quay lại menu
      </Link>

      <h1 className="mt-2 text-2xl font-bold">{product.name}</h1>

      {product.description && (
        <p className="mt-1 text-sm text-gray-600">{product.description}</p>
      )}

      <p className="mt-2 text-amber-700">
        Giá gốc: {formatVND(product.price)}
      </p>

      <p
        className={
          availableQuantity > 0
            ? "mt-1 text-sm text-green-700"
            : "mt-1 text-sm text-red-600"
        }
      >
        {availableQuantity > 0
          ? `Có thể pha: ${availableQuantity} ly (Size ${size})`
          : `Hết hàng (Size ${size})`}
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
          {product.sizes.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setSize(option.code);
                setQty((current) =>
                  Math.max(
                    1,
                    Math.min(
                      current,
                      product.availableQuantityBySize[option.code] ?? 0,
                    ),
                  ),
                );
              }}
              className={`rounded border px-4 py-2 ${
                size === option.code ? "bg-amber-600 text-white" : ""
              }`}
            >
              {option.code}
              {option.additionalPrice > 0 &&
                ` (+${formatVND(option.additionalPrice)})`}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4">
        <h2 className="mb-2 font-medium">Topping</h2>

        {product.toppings.length === 0 ? (
          <p className="text-sm text-gray-500">
            Chưa có topping khả dụng.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {product.toppings.map((topping) => (
              <label
                key={topping.id}
                className={
                  topping.isAvailable
                    ? "flex items-center gap-2"
                    : "flex items-center gap-2 text-gray-400"
                }
              >
                <input
                  type="checkbox"
                  checked={selectedToppingIds.includes(topping.id)}
                  disabled={!topping.isAvailable}
                  onChange={() =>
                    toggleTopping(topping.id, topping.isAvailable)
                  }
                />
                {topping.name} (+{formatVND(topping.additionalPrice)})
                {!topping.isAvailable && " — Hết hàng"}
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="mt-4">
        <label htmlFor="product-note" className="mb-2 block font-medium">
          Ghi chú
        </label>

        <textarea
          id="product-note"
          value={note}
          maxLength={200}
          rows={3}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ví dụ: ít đá, ít ngọt"
          className="w-full rounded border p-2"
        />
      </section>

      <section className="mt-4 flex items-center gap-3">
        <h2 className="font-medium">Số lượng</h2>

        <button
          type="button"
          onClick={() => setQty((current) => Math.max(1, current - 1))}
          className="rounded border px-3"
          disabled={qty <= 1}
        >
          -
        </button>

        <span>{qty}</span>

        <button
          type="button"
          onClick={() =>
            setQty((current) => Math.min(availableQuantity, current + 1))
          }
          className="rounded border px-3"
          disabled={qty >= availableQuantity}
        >
          +
        </button>
      </section>

      {cartError && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {cartError}
        </p>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={!canAdd}
        className="mt-6 w-full rounded bg-amber-600 py-3 text-white disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {availableQuantity > 0
          ? `Thêm vào giỏ - ${formatVND(unitPrice * qty)}`
          : "Hết hàng"}
      </button>
    </main>
  );
}