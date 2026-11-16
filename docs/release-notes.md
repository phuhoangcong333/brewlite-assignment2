# BrewLite Assignment 2 – Release Notes

## Release candidate

- **Mã phát hành:** `assignment-2-handoff` (chưa gắn Git tag)
- **Nhánh đối chiếu:** `feat/tv2-product-detail`
- **Commit đối chiếu sau khi đồng bộ `origin/dev`:** `4bcaf13`
- **Ngày lập tài liệu:** 2026-11-16
- **Trạng thái:** Release candidate cho nghiệm thu; thông tin production và
  PR/Issue của TV1–TV7 còn phải được nhóm xác nhận.

## Nội dung đã có trong repository

### Product detail và lựa chọn món (TV2)

- `GET /products/:id` trả thông tin sản phẩm, mô tả, Size, topping và tồn kho
  theo Size.
- Trang chi tiết cho phép chọn Size/topping, nhập ghi chú và cập nhật giá.
- Topping hết hàng được hiển thị nhưng không thể chọn.
- Cart giữ cấu hình Size/topping/ghi chú của từng dòng món.
- Prisma schema có `Product.description`, `Topping` và liên kết tới
  `Ingredient`; migration tương ứng nằm trong `apps/api/prisma/migrations/`.
- Có seed cho topping `Trân châu` và `Kem`; không tự suy diễn định lượng ngoài
  giá trị đang có trong schema/seed.

### Pricing, cart và API integration

- API client dùng chung hỗ trợ dữ liệu thật hoặc mock theo
  `NEXT_PUBLIC_USE_MOCK`.
- Hàm `calculateUnitPrice` và unit test tại
  `apps/web/src/lib/pricing.ts` và `apps/web/src/lib/pricing.test.ts`.
- Quote/cart gửi ID Size/topping và dùng giá server trả về khi checkout.

### Nền tảng và kiểm thử

- Docker Compose chạy PostgreSQL, NestJS API và Next.js frontend.
- Có CD workflow tại `.github/workflows/cd.yml`, production Compose tại
  `docker-compose.prod.yml` và runbook chi tiết tại
  `docs/deploy-and-rollback.md`.
- Có API/client cho nhập tồn kho topping và Postman smoke collection.
- Prisma migration/seed và Swagger/health endpoint được ghi trong README.
- Local full test frontend đã ghi nhận `69/69` passed. Backend build passed sau
  khi chạy `npx.cmd prisma generate`; backend test cần PostgreSQL đúng
  credentials. Frontend build Turbopack cần xác nhận lại trên CI/máy dev vì
  môi trường hiện tại gặp `EPERM` khi tạo `.next`.

## Cần xác nhận trước khi phát hành chính thức

- URL production HTTPS, commit/image SHA đã deploy và bằng chứng rollback của
  TV1.
- PR/Issue/commit và người xác nhận cho TV1, TV3, TV4, TV5, TV6, TV7.
- Kết quả test đầy đủ Backend, Frontend, E2E và smoke test production.
- Git tag/release URL chính thức.

## Known limitations / lưu ý

- Không commit file `.env` hoặc secret.
- `docker compose down -v` xóa dữ liệu PostgreSQL local.
- Các mục còn `TBD` trong `docs/traceability-matrix.md` là dữ liệu cần nhóm
  điền từ GitHub/CI, không phải cam kết đã triển khai.
