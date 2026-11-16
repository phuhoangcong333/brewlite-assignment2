# BrewLite Web

Ứng dụng Frontend dùng Next.js App Router, nằm trong `apps/web` của monorepo.

## Chạy local

```bash
cd apps/web
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Cấu hình mẫu bật dữ liệu giả,
cho phép xem menu, đăng nhập demo và thực hiện luồng giỏ hàng/đơn hàng mà không
cần Backend. Trong mock mode, đăng nhập bằng `staff@brewlite.local` để mở trang
nhân viên; email khác dùng vai trò khách hàng. Mật khẩu chỉ cần nhập giá trị bất kỳ.

## Cấu hình API

- `NEXT_PUBLIC_API_URL`: Base URL của Backend, mặc định `http://localhost:3001`.
- `NEXT_PUBLIC_USE_MOCK`: đặt `true` để dùng dữ liệu giả hoặc `false` để gọi Backend.

Các request tập trung trong `src/lib/api-client.ts`; hàm nghiệp vụ sản phẩm và
đơn hàng/xác thực nằm trong `src/lib/api.ts` và `src/lib/orders-api.ts`.
Sau khi đổi biến môi trường, khởi động lại Next.js.

## Kiểm tra

```bash
npm run lint
npm run build
```
