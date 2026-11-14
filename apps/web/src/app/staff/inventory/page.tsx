"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { ProtectedRoute } from "@/lib/auth-context";
import {
  getIngredients,
  getInventoryProducts,
  restockIngredient,
  updateProductRecipe,
  type InventoryIngredient,
  type InventoryProduct,
  type RecipeItemInput,
} from "@/lib/inventory-api";
import { ApiError as AuthApiError, getCurrentUser } from "@/lib/orders-api";

type RecipeDraftItem = {
  ingredientId: number | null;
  amountRequired: string;
};

function getApiStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }
  return undefined;
}

function toRecipeDraft(product: InventoryProduct): RecipeDraftItem[] {
  return product.recipeItems.map((item) => ({
    ingredientId: item.ingredientId,
    amountRequired: String(item.amountRequired),
  }));
}

export default function StaffInventoryPage() {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<InventoryIngredient[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [recipeDrafts, setRecipeDrafts] = useState<
    Record<number, RecipeDraftItem[]>
  >({});
  const [restockAmounts, setRestockAmounts] = useState<Record<number, string>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restockingId, setRestockingId] = useState<number | null>(null);
  const [savingProductId, setSavingProductId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const handleRequestError = useCallback(
    (requestError: unknown, fallback: string) => {
      const status = getApiStatus(requestError);
      if (status === 401) {
        router.replace("/login?next=/staff/inventory");
        return;
      }
      if (status === 403) {
        setAccessDenied(true);
        return;
      }
      setError(
        requestError instanceof Error ? requestError.message : fallback,
      );
    },
    [router],
  );

  const loadInventory = useCallback(
    async (background = false) => {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [nextIngredients, nextProducts] = await Promise.all([
          getIngredients(),
          getInventoryProducts(),
        ]);
        setIngredients(nextIngredients);
        setProducts(nextProducts);
        setRecipeDrafts((current) => {
          const next = { ...current };
          for (const product of nextProducts) {
            next[product.id] ??= toRecipeDraft(product);
          }
          return next;
        });
        setError(null);
      } catch (requestError) {
        handleRequestError(
          requestError,
          "Không tải được dữ liệu kho nguyên liệu.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [handleRequestError],
  );

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?next=/staff/inventory");
      return;
    }

    let active = true;

    void getCurrentUser()
      .then(async (user) => {
        if (!active) return;
        if (user.role !== "STAFF") {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        await loadInventory();
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof AuthApiError && requestError.status === 401) {
          router.replace("/login?next=/staff/inventory");
          return;
        }
        if (requestError instanceof AuthApiError && requestError.status === 403) {
          setAccessDenied(true);
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Không thể xác minh quyền truy cập.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadInventory, router]);

  async function handleRestock(
    event: React.FormEvent<HTMLFormElement>,
    ingredient: InventoryIngredient,
  ) {
    event.preventDefault();
    const amount = Number(restockAmounts[ingredient.id]);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setError("Số lượng nhập thêm phải là số nguyên dương.");
      return;
    }

    setRestockingId(ingredient.id);
    setError(null);
    setNotice(null);

    try {
      const updatedIngredient = await restockIngredient(ingredient.id, amount);
      setIngredients((current) =>
        current.map((item) =>
          item.id === updatedIngredient.id ? updatedIngredient : item,
        ),
      );
      setRestockAmounts((current) => ({ ...current, [ingredient.id]: "" }));
    } catch (requestError) {
      handleRequestError(requestError, "Không thể nhập thêm nguyên liệu.");
      setRestockingId(null);
      return;
    }

    try {
      setProducts(await getInventoryProducts());
      setNotice(`Đã nhập thêm ${amount} ${ingredient.unit} ${ingredient.name}.`);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Không thể làm mới số lượng món có thể pha.";
      handleRequestError(
        requestError,
        `Đã nhập kho thành công nhưng không thể làm mới số lượng món: ${message}`,
      );
      if (getApiStatus(requestError) !== 401 && getApiStatus(requestError) !== 403) {
        setError(
          `Đã nhập kho thành công nhưng không thể làm mới số lượng món: ${message}`,
        );
      }
    } finally {
      setRestockingId(null);
    }
  }

  function updateRecipeDraft(
    productId: number,
    index: number,
    update: Partial<RecipeDraftItem>,
  ) {
    setRecipeDrafts((current) => ({
      ...current,
      [productId]: current[productId].map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...update } : item,
      ),
    }));
  }

  function addRecipeIngredient(productId: number) {
    const draft = recipeDrafts[productId] ?? [];
    const usedIngredientIds = new Set(
      draft
        .map((item) => item.ingredientId)
        .filter((id): id is number => id !== null),
    );
    const nextIngredient = ingredients.find(
      (ingredient) => !usedIngredientIds.has(ingredient.id),
    );
    if (!nextIngredient) return;

    setRecipeDrafts((current) => ({
      ...current,
      [productId]: [
        ...(current[productId] ?? []),
        { ingredientId: nextIngredient.id, amountRequired: "1" },
      ],
    }));
  }

  function removeRecipeIngredient(productId: number, index: number) {
    setRecipeDrafts((current) => ({
      ...current,
      [productId]: current[productId].filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  }

  async function handleSaveRecipe(
    event: React.FormEvent<HTMLFormElement>,
    product: InventoryProduct,
  ) {
    event.preventDefault();
    const draft = recipeDrafts[product.id] ?? [];
    const items: RecipeItemInput[] = [];

    for (const item of draft) {
      const amountRequired = Number(item.amountRequired);
      if (
        item.ingredientId === null ||
        !Number.isSafeInteger(amountRequired) ||
        amountRequired <= 0
      ) {
        setError("Mỗi nguyên liệu cần có định lượng là số nguyên dương.");
        return;
      }
      items.push({ ingredientId: item.ingredientId, amountRequired });
    }

    if (items.length === 0) {
      setError("Công thức cần có ít nhất một nguyên liệu.");
      return;
    }
    if (new Set(items.map((item) => item.ingredientId)).size !== items.length) {
      setError("Mỗi nguyên liệu chỉ được xuất hiện một lần trong công thức.");
      return;
    }

    setSavingProductId(product.id);
    setError(null);
    setNotice(null);

    try {
      await updateProductRecipe(product.id, items);
    } catch (requestError) {
      handleRequestError(requestError, "Không thể lưu công thức.");
      setSavingProductId(null);
      return;
    }

    try {
      const nextProducts = await getInventoryProducts();
      setProducts(nextProducts);
      const savedProduct = nextProducts.find((item) => item.id === product.id);
      if (savedProduct) {
        setRecipeDrafts((current) => ({
          ...current,
          [product.id]: toRecipeDraft(savedProduct),
        }));
      }
      setNotice(`Đã cập nhật công thức cho ${product.name}.`);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Không thể làm mới số lượng món có thể pha.";
      handleRequestError(
        requestError,
        `Đã lưu công thức nhưng không thể làm mới số lượng món: ${message}`,
      );
      if (getApiStatus(requestError) !== 401 && getApiStatus(requestError) !== 403) {
        setError(
          `Đã lưu công thức nhưng không thể làm mới số lượng món: ${message}`,
        );
      }
    } finally {
      setSavingProductId(null);
    }
  }

  if (accessDenied) {
    return (
      <ProtectedRoute role="STAFF">
        <main className="mx-auto my-20 max-w-lg p-6 text-center">
          <h1 className="mb-2 text-2xl font-bold">Không có quyền truy cập</h1>
          <p className="mb-4 text-gray-600">
            Chỉ nhân viên mới có thể quản lý kho nguyên liệu.
          </p>
          <Link className="text-amber-700 underline" href="/">
            Về trang chủ
          </Link>
        </main>
      </ProtectedRoute>
    );
  }

  const busy = restockingId !== null || savingProductId !== null;

  return (
    <ProtectedRoute role="STAFF">
      <main className="mx-auto w-full max-w-5xl px-5 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-bold text-amber-700">
              KHU VỰC NHÂN VIÊN
            </p>
            <h1 className="text-3xl font-bold">Kho nguyên liệu</h1>
            <p className="mt-2 text-sm text-gray-600">
              Theo dõi nguyên liệu, nhập thêm và chỉnh định lượng công thức món.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadInventory(true)}
            disabled={refreshing || loading || busy}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 disabled:cursor-wait disabled:opacity-60"
          >
            {refreshing ? "Đang làm mới..." : "Làm mới"}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            {notice}
          </div>
        )}

        {loading ? (
          <p className="py-12 text-center text-gray-600">
            Đang tải dữ liệu kho...
          </p>
        ) : (
          <>
            <section className="mb-10">
              <h2 className="mb-4 text-xl font-bold">Tồn kho nguyên liệu</h2>
              {ingredients.length === 0 ? (
                <p className="rounded-xl border bg-white p-5 text-gray-600">
                  Chưa có nguyên liệu trong kho.
                </p>
              ) : (
                <div className="grid gap-4">
                  {ingredients.map((ingredient) => (
                    <article
                      key={ingredient.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-4 shadow-sm"
                    >
                      <div>
                        <h3 className="font-semibold">{ingredient.name}</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          Hiện có:{" "}
                          <strong>
                            {ingredient.stockQuantity} {ingredient.unit}
                          </strong>
                        </p>
                      </div>
                      <form
                        className="flex flex-wrap items-end gap-2"
                        onSubmit={(event) => void handleRestock(event, ingredient)}
                      >
                        <label className="text-sm text-gray-700">
                          Nhập thêm ({ingredient.unit})
                          <input
                            aria-label={`Số lượng nhập thêm ${ingredient.name}`}
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={restockAmounts[ingredient.id] ?? ""}
                            onChange={(event) =>
                              setRestockAmounts((current) => ({
                                ...current,
                                [ingredient.id]: event.target.value,
                              }))
                            }
                            className="mt-1 block w-36 rounded-lg border border-gray-300 px-3 py-2"
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={busy || loading}
                          className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white disabled:cursor-wait disabled:opacity-60"
                        >
                          {restockingId === ingredient.id
                            ? "Đang nhập..."
                            : "Nhập kho"}
                        </button>
                      </form>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-4 text-xl font-bold">Công thức món</h2>
              {products.length === 0 ? (
                <p className="rounded-xl border bg-white p-5 text-gray-600">
                  Chưa có món trong hệ thống.
                </p>
              ) : (
                <div className="grid gap-5">
                  {products.map((product) => {
                    const draft = recipeDrafts[product.id] ?? [];
                    const isSaving = savingProductId === product.id;

                    return (
                      <article
                        key={product.id}
                        className="rounded-xl border bg-white p-5 shadow-sm"
                      >
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-bold">{product.name}</h3>
                            <p className="mt-1 text-sm text-gray-600">
                              Có thể pha:{" "}
                              <strong>{product.availableQuantity} ly</strong>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addRecipeIngredient(product.id)}
                            disabled={
                              busy || draft.length >= ingredients.length
                            }
                            className="rounded-lg border border-amber-600 px-3 py-2 text-sm font-semibold text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Thêm nguyên liệu
                          </button>
                        </div>

                        {draft.length === 0 && (
                          <p className="mb-3 text-sm text-gray-500">
                            Món chưa có công thức. Thêm nguyên liệu để bắt đầu.
                          </p>
                        )}
                        {ingredients.length === 0 && (
                          <p className="mb-3 text-sm text-amber-800">
                            Cần có nguyên liệu trong kho trước khi tạo công thức.
                          </p>
                        )}

                        <form
                          onSubmit={(event) =>
                            void handleSaveRecipe(event, product)
                          }
                        >
                          <div className="grid gap-3">
                            {draft.map((item, index) => {
                              const selectedIngredient = ingredients.find(
                                (ingredient) =>
                                  ingredient.id === item.ingredientId,
                              );
                              const usedByOtherRows = new Set(
                                draft
                                  .filter((_, rowIndex) => rowIndex !== index)
                                  .map((row) => row.ingredientId),
                              );

                              return (
                                <div
                                  key={`${product.id}-${index}`}
                                  className="flex flex-wrap items-end gap-3"
                                >
                                  <label className="min-w-52 flex-1 text-sm text-gray-700">
                                    Nguyên liệu
                                    <select
                                      aria-label={`Nguyên liệu ${index + 1} cho ${product.name}`}
                                      required
                                      value={item.ingredientId ?? ""}
                                      onChange={(event) =>
                                        updateRecipeDraft(product.id, index, {
                                          ingredientId: Number(
                                            event.target.value,
                                          ),
                                        })
                                      }
                                      className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                                    >
                                      <option value="" disabled>
                                        Chọn nguyên liệu
                                      </option>
                                      {ingredients
                                        .filter(
                                          (ingredient) =>
                                            !usedByOtherRows.has(ingredient.id),
                                        )
                                        .map((ingredient) => (
                                          <option
                                            key={ingredient.id}
                                            value={ingredient.id}
                                          >
                                            {ingredient.name}
                                          </option>
                                        ))}
                                    </select>
                                  </label>
                                  <label className="w-44 text-sm text-gray-700">
                                    Định lượng (
                                    {selectedIngredient?.unit ?? "đơn vị"})
                                    <input
                                      aria-label={`Định lượng nguyên liệu ${index + 1} cho ${product.name}`}
                                      type="number"
                                      min="1"
                                      step="1"
                                      required
                                      value={item.amountRequired}
                                      onChange={(event) =>
                                        updateRecipeDraft(product.id, index, {
                                          amountRequired: event.target.value,
                                        })
                                      }
                                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    aria-label={`Xóa nguyên liệu ${index + 1} khỏi ${product.name}`}
                                    onClick={() =>
                                      removeRecipeIngredient(product.id, index)
                                    }
                                    disabled={busy}
                                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          <div className="mt-5 flex justify-end">
                            <button
                              type="submit"
                              disabled={busy || draft.length === 0}
                              className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white disabled:cursor-wait disabled:opacity-60"
                            >
                              {isSaving ? "Đang lưu..." : "Lưu công thức"}
                            </button>
                          </div>
                        </form>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </ProtectedRoute>
  );
}
