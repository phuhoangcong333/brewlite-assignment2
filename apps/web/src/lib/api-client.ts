import { getToken, clearSession } from "./auth";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
).replace(/\/+$/, "");

export const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
  const responseText = await response.text();
  let data: unknown;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      if (response.ok) {
        throw new ApiError(response.status, "Phản hồi từ máy chủ không hợp lệ");
      }
      data = responseText;
    }
  }

  if (!response.ok) {
    if (response.status === 401) clearSession();
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? data.message
        : data;
    throw new ApiError(
      response.status,
      Array.isArray(message)
        ? message.join(", ")
        : typeof message === "string"
          ? message
          : "Có lỗi xảy ra, vui lòng thử lại"
    );
  }

  return data as T;
}
