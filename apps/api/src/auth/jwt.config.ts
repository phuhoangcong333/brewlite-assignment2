const DEV_FALLBACK_SECRET = 'dev-only-insecure-secret-do-not-use-in-prod';

/**
 * Đọc JWT secret tại thời điểm KHỞI TẠO module (không phải lúc import file),
 * để chắc chắn `.env` đã được nạp (main.ts import 'dotenv/config' đầu tiên).
 *  - production: bắt buộc có JWT_SECRET (>= 16 ký tự), thiếu thì không cho chạy.
 *  - môi trường khác: cho dùng secret dev để chạy test/local, kèm cảnh báo.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret && secret.length >= 16) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET chưa được cấu hình hoặc quá ngắn (cần >= 16 ký tự)',
    );
  }
  if (process.env.NODE_ENV !== 'test') {
    console.warn(
      '[auth] JWT_SECRET chưa đặt/quá ngắn - đang dùng secret DEV, không dùng cho production',
    );
  }
  return DEV_FALLBACK_SECRET;
}
