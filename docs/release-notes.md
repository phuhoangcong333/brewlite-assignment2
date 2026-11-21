# BrewLite Assignment 2 – Release Notes

## Release candidate

- **Mã phát hành:** `assignment-2-handoff`
- **Nhánh đối chiếu:** `main`
- **Commit đối chiếu mới nhất:** `9c371ef` (Merge PR #76 – hoàn thiện tính năng hủy đơn khách hàng và toàn bộ luồng Assignment 2)
- **URL Production HTTPS:** `https://47.129.180.144.sslip.io`
- **Ngày cập nhật:** 2026-11-21
- **Trạng thái:** Đã triển khai Production trên AWS EC2 + RDS và xác minh CI/CD thành công; thông tin PR/Issue chi tiết của các thành viên tiếp tục được tổng hợp tại `docs/traceability-matrix.md`.

## Nội dung đã có trong repository

### Hạ tầng Production & CI/CD (TV1)

- Triển khai thành công trên **AWS EC2** (Ubuntu 24.04, Docker Compose `docker-compose.prod.yml`) sau reverse proxy HTTPS tại `https://47.129.180.144.sslip.io`.
- Database **Amazon RDS PostgreSQL** cấu hình chế độ private (`Publicly accessible: No`), chỉ mở cổng `5432` nội bộ cho Security Group của EC2.
- Pipeline **GitHub Actions CD** (`.github/workflows/cd.yml`) chạy thành công (Run `#10`, commit `9c371ef`): build Docker image gắn tag SHA, push lên `ghcr.io`, chạy `prisma migrate deploy`, smoke test `GET http://localhost:3001/health` và tự động rollback về `.deploy.env.bak` khi lỗi. Tài liệu vận hành tại `docs/deploy-and-rollback.md` và `docs/deployment.md`.

### Product detail và lựa chọn món (TV2)

- `GET /products/:id` trả thông tin sản phẩm, mô tả, Size, topping và tồn kho theo Size.
- Trang chi tiết cho phép chọn Size/topping, nhập ghi chú và cập nhật giá.
- Topping hết hàng được hiển thị nhưng không thể chọn.
- Cart giữ cấu hình Size/topping/ghi chú của từng dòng món.
- Prisma schema có `Product.description`, `Topping` và liên kết tới `Ingredient`; migration tương ứng nằm trong `apps/api/prisma/migrations/`.
- Có seed cho topping `Trân châu` và `Kem`; không tự suy diễn định lượng ngoài giá trị đang có trong schema/seed.

### Pricing, cart và API integration (TV3)

- API client dùng chung hỗ trợ dữ liệu thật hoặc mock theo `NEXT_PUBLIC_USE_MOCK`.
- Hàm `calculateUnitPrice` và unit test tại `apps/web/src/lib/pricing.ts` và `apps/web/src/lib/pricing.test.ts`.
- Quote/cart gửi ID Size/topping và dùng giá server trả về khi checkout.

### Đặt đơn, tồn kho, thanh toán, trạng thái & xác thực (TV4 – TV7)

- Đặt đơn và trừ/hoàn kho nguyên liệu nguyên tử trong Prisma transaction (TV4), hỗ trợ khách hủy đơn ở trạng thái `PENDING` / `PAYMENT_FAILED` (PR #76).
- Thanh toán mô phỏng hỗ trợ `Idempotency-Key` chống trùng lặp giao dịch (TV5).
- State machine kiểm soát vòng đời đơn hàng và tích điểm `LoyaltyTransaction` khi hoàn thành `READY → COMPLETED` (TV6).
- Xác thực JWT (`JwtAuthGuard`, `RolesGuard`), `ValidationPipe`, `ExceptionFilter` và `GET /health` dùng chung toàn hệ thống (TV7).

### Kiểm thử & Tài liệu

- Docker Compose chạy PostgreSQL, NestJS API và Next.js frontend.
- Bộ kiểm thử tự động tích hợp trong CI/CD: Backend Unit/API E2E (`apps/api/test/`), Frontend Unit (`69/69` passed) và Browser E2E Playwright (`apps/web/e2e/`).
- Tổng hợp hướng dẫn kiểm thử và Postman Collections tại `tests/README.md` và `tests/postman/`.

## Cần xác nhận trước khi nộp bản cuối cùng

- PR/Issue/commit và người xác nhận cho TV2, TV3, TV4, TV5, TV6, TV7 trên `docs/traceability-matrix.md`.
- Hoàn thiện danh sách thành viên xác nhận tại `docs/sprint2-review-retro.md`.

## Known limitations / lưu ý

- Không commit file `.env` hoặc secret.
- `docker compose down -v` xóa dữ liệu PostgreSQL local.
- Các mục còn `TBD` trong `docs/traceability-matrix.md` là dữ liệu cần nhóm điền từ GitHub/CI, không phải cam kết đã triển khai.