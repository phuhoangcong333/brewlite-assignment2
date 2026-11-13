import type { Size } from "./types";

/**
 * Đổi mã size / topping của giao diện sang id trong database để gọi API.
 * GIẢ ĐỊNH: S=1, M=2, L=3 và pearl=1, cream=2. Hãy đối chiếu với file seed của
 * TV1/TV2 và sửa tại đây nếu id khác. Đây là nơi duy nhất cần sửa.
 */
export const SIZE_IDS: Record<Size, number> = { S: 1, M: 2, L: 3 };

export const TOPPING_IDS: Record<string, number> = { pearl: 1, cream: 2 };
