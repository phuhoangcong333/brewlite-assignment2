"use client";

import { useEffect, useState } from "react";
import { getToppings, type Topping } from "./toppings-api";

export function useToppings() {
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getToppings()
      .then((items) => {
        if (active) setToppings(items);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Không thể tải danh sách topping.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { toppings, loading, error };
}
