"use client";

import { useEffect, useMemo, useState } from "react";
import type { CartItem } from "./cart";
import { buildQuoteRequest, fetchQuote } from "./quote-api";
import type { Quote } from "./quote-types";

const DEBOUNCE_MS = 300;

type Result = { key: string; quote: Quote | null; error: string | null };

/**
 * Báo giá từ server mỗi khi giỏ hoặc mã đổi.
 * - Hủy request cũ khi giỏ đổi, bỏ qua kết quả đến muộn.
 * - `quote` giữ giá trị gần nhất trong lúc đang tải lại; kiểm tra `loading` trước khi dùng để thanh toán.
 */
export function useQuote(items: CartItem[], promotionCode: string | null) {
  const request = useMemo(() => buildQuoteRequest(items, promotionCode), [items, promotionCode]);
  const [retryCount, setRetryCount] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const requestKey = `${JSON.stringify(request)}#${retryCount}`;
  const empty = request.items.length === 0;

  useEffect(() => {
    if (empty) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const quote = await fetchQuote(request, controller.signal);
        setResult({ key: requestKey, quote, error: null });
      } catch (e) {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          quote: null,
          error: e instanceof Error ? e.message : "Không thể báo giá.",
        });
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [empty, request, requestKey]);

  const current = result?.key === requestKey ? result : null;
  return {
    quote: empty ? null : current ? current.quote : (result?.quote ?? null),
    error: empty ? null : (current?.error ?? null),
    loading: !empty && !current,
    retry: () => setRetryCount((c) => c + 1),
  };
}
