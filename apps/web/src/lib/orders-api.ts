import type { CartItem } from "./cart";
import { unitPriceOf } from "./cart";
import type { Size } from "./types";
import { API_BASE_URL, USE_MOCK_DATA } from "./api-client";
import { setToken } from "./auth";

const API_URL = API_BASE_URL;
const USE_MOCK = USE_MOCK_DATA;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
}

export const TOPPING_NAME: Record<string, string> = {
  pearl: "Trân châu",
  cream: "Kem",
};

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "PAYMENT_FAILED"
  | "CANCELLED";

export type UserRole = "CUSTOMER" | "STAFF";

export type AuthenticatedUser = {
  id: number;
  email: string;
  role: UserRole;
};

export type OrderItemDetail = {
  productId: number;
  product?: { name: string } | null;
  size: Size;
  qty: number;
  toppings: string[];
  lineTotal: number;
};

export type Order = {
  id: number;
  status: OrderStatus;
  total: number;
  discount?: number;
  promoCode?: string | null;
  createdAt: string;
  items?: OrderItemDetail[];
};

export type PaymentInput =
  | { orderId: number; method: "WALLET"; walletId: string }
  | { orderId: number; method: "CARD"; cardNumber: string };

export type PaymentResult = {
  orderId: number;
  order_status: OrderStatus;
  message: string;
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((init.headers as Record<string, string>) ?? {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) clearSession();
    const m = data?.message;
    throw new ApiError(
      res.status,
      Array.isArray(m) ? m.join(", ") : (m ?? "Có lỗi xảy ra, vui lòng thử lại")
    );
  }
  return data as T;
}

const MOCK_KEY = "brewlite_mock_orders";
const readMock = (): Order[] => {
  const savedOrders = localStorage.getItem(MOCK_KEY);
  if (!savedOrders) return [];
  try {
    const orders: unknown = JSON.parse(savedOrders);
    if (!Array.isArray(orders)) {
      throw new Error("Dữ liệu đơn hàng giả lập không hợp lệ");
    }
    return orders as Order[];
  } catch {
    throw new ApiError(500, "Không thể đọc dữ liệu đơn hàng giả lập");
  }
};
const writeMock = (o: Order[]) =>
  localStorage.setItem(MOCK_KEY, JSON.stringify(o));

/* ---------- auth ---------- */
type AuthResponse = {
  access_token: string;
  user: { id: number; email: string };
};

export async function login(email: string, password: string) {
  if (USE_MOCK) {
    await delay(300);
    const access_token = `mock-token:${encodeURIComponent(email)}`;
    setToken(access_token);
    return { access_token, user: { id: 1, email } } satisfies AuthResponse;
  }
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email: string, password: string) {
  if (USE_MOCK) {
    await delay(300);
    return;
  }
  await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/* ---------- orders ---------- */
export async function createOrder(
  cart: CartItem[],
  promoCode?: string
): Promise<{ id: number; total: number; discount?: number }> {
  if (USE_MOCK) {
    await delay(500);
    const subtotal = cart.reduce(
      (s, i) => s + unitPriceOf(i) * i.qty,
      0
    );
    let discount = 0;
    const cleanPromo = promoCode?.trim().toUpperCase();
    if (cleanPromo === "GIAM10") discount = Math.floor((subtotal * 10) / 100);
    if (cleanPromo === "BREW20") discount = Math.floor((subtotal * 20) / 100);
    const total = subtotal - discount;

    const order: Order = {
      id: Math.floor(Math.random() * 90000) + 10000,
      status: "PENDING",
      total,
      discount,
      promoCode: cleanPromo || null,
      createdAt: new Date().toISOString(),
      items: cart.map((i) => ({
        productId: i.productId,
        size: i.size as Size,
        qty: i.qty,
        toppings: i.toppings.map((t) => TOPPING_NAME[t] ?? t),
        lineTotal: unitPriceOf(i) * i.qty,
      })),
    };
    writeMock([order, ...readMock()]);
    return { id: order.id, total, discount };
  }

  return request<{ id: number; total: number; discount?: number }>("/orders", {
    method: "POST",
    body: JSON.stringify({
      items: cart.map((i) => ({
        productId: i.productId,
        qty: i.qty,
        size: i.size,
        toppings: i.toppings.map((t) => TOPPING_NAME[t] ?? t),
      })),
      ...(promoCode?.trim() ? { promoCode: promoCode.trim() } : {}),
    }),
  });
}

export async function getMyOrders(): Promise<Order[]> {
  if (USE_MOCK) {
    await delay(300);
    return readMock();
  }
  return request<Order[]>("/orders");
}

export async function getCurrentUser(): Promise<AuthenticatedUser> {
  if (USE_MOCK) {
    await delay(100);
    const token = getToken();
    if (!token?.startsWith("mock-token:")) {
      throw new ApiError(401, "Vui lòng đăng nhập lại");
    }
    const email = decodeURIComponent(token.slice("mock-token:".length));
    return {
      id: 1,
      email,
      role: email.toLowerCase() === "staff@brewlite.local" ? "STAFF" : "CUSTOMER",
    };
  }
  const response = await request<{ user: AuthenticatedUser }>("/auth/me");
  return response.user;
}

export async function getStaffOrders(): Promise<Order[]> {
  if (USE_MOCK) {
    await delay(300);
    return readMock();
  }
  return request<Order[]>("/orders/staff");
}

/* ---------- payment ---------- */
export async function createPayment(
  input: PaymentInput,
  idempotencyKey: string
): Promise<PaymentResult> {
  if (USE_MOCK) {
    await delay(800);
    const orders = readMock();
    const order = orders.find((o) => o.id === input.orderId);
    if (!order) throw new ApiError(404, "Không tìm thấy đơn hàng");
    const tail = input.method === "WALLET" ? input.walletId : input.cardNumber;
    const ok = !tail.endsWith("0000"); // giống BE: 4 ký tự cuối 0000 => thất bại
    order.status = ok ? "PAID" : "PAYMENT_FAILED";
    writeMock(orders);
    return {
      orderId: order.id,
      order_status: order.status,
      message: ok ? "Thanh toán thành công" : "Thanh toán thất bại",
    };
  }
  return request<PaymentResult>("/payments", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(input),
  });
}

export async function updateOrderStatus(
  orderId: number,
  status: OrderStatus
): Promise<void> {
  if (USE_MOCK) {
    await delay(300);
    const orders = readMock();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new ApiError(404, "Không tìm thấy đơn hàng");
    order.status = status;
    writeMock(orders);
    return;
  }
  await request<void>(`/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function cancelOrder(orderId: number): Promise<void> {
  if (USE_MOCK) {
    await delay(300);
    const orders = readMock();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new ApiError(404, "Không tìm thấy đơn hàng");
    order.status = "CANCELLED";
    writeMock(orders);
    return;
  }
  await request<void>(`/orders/${orderId}`, {
    method: "DELETE",
  });
}