# TV6 – S1 Issue #21: State Machine trạng thái đơn hàng

- Repo: `phuhoangcong333/brewlite-assignment2` – base branch `dev`
- GitHub: <https://github.com/phuhoangcong333/brewlite-assignment2/issues/21>
- State Machine (đã có trên dev): `apps/api/src/orders/order-state.ts`
- Service tích hợp Prisma transaction + optimistic update: `apps/api/src/orders/order.service.ts`
- PATCH dành cho STAFF: `apps/api/src/orders/orders.controller.ts`

## Quy tắc trạng thái

| Trạng thái nguồn | Trạng thái đích hợp lệ |
|---|---|
| `PENDING` | `PAID`, `PAYMENT_FAILED`, `CANCELLED` |
| `PAYMENT_FAILED` | `PENDING`, `CANCELLED` |
| `PAID` | `PREPARING` |
| `PREPARING` | `READY` |
| `READY` | `COMPLETED` |
| `COMPLETED` | Không (terminal) |
| `CANCELLED` | Không (terminal) |

Không hỗ trợ `PAID → CANCELLED`. Nhân viên chỉ cập nhật ba bước `PAID → PREPARING → READY → COMPLETED`; thanh toán/hủy qua API khác.

## Áp dụng vào nhánh dev

1. Giải nén thư mục `TV6_Issue21` vào một nơi bên ngoài hoặc trong repo.
2. Checkout từ `dev`, tạo branch riêng, ví dụ:

   ```bash
   git switch dev
   git pull
   git switch -c fix/tv6-s1-order-state-issue21
   ```

3. Tại **thư mục gốc repo**, chạy:

   ```bash
   python path/to/TV6_Issue21/apply_tv6_issue21.py
   ```

   Chương trình cập nhật `apps/api/test/task10.e2e-spec.ts` và thêm `docs/postman/TV6_Order_State_Machine.postman_collection.json`, `docs/postman/README-TV6-Issue21.md`. Script cố tình từ chối sửa nếu nội dung gốc không giống phần được kiểm tra.

4. Cài packages, chạy unit test:

   ```bash
   cd apps/api
   npm ci
   npm test -- --runInBand src/orders/order-state.spec.ts src/orders/orders.controller.spec.ts src/auth/staff.guard.spec.ts
   ```

5. Với Postgres thật/test đã migrate và `DATABASE_URL`, `JWT_SECRET` hợp lệ, chạy:

   ```bash
   npm run test:e2e -- --runInBand test/task10.e2e-spec.ts
   ```

   Nếu không có DB, integration tests có thể bị skip / không chạy. Không được ghi là PASS nếu chưa thực thi.

6. Chạy API với biến môi trường được cấu hình (`npm run start:dev`) và import collection vào Postman. Điền các giá trị `customerEmail`, `customerPassword`, `staffEmail`, `staffPassword`, `productId` (sản phẩm còn ít nhất 2 tồn kho). Có thể seed STAFF qua `STAFF_EMAIL`/`STAFF_PASSWORD` theo `prisma/seed.ts`. **Không commit password/token**. Chạy collection theo thứ tự. Dùng Collection Runner để có bảng PASS/FAIL và chụp màn hình minh chứng.
7. Xem `git diff`, commit, push và tạo PR vào `dev`:

   ```bash
   git add apps/api/test/task10.e2e-spec.ts docs/postman/
   git commit -m "test(tv6): cover order status roles and terminal states (#21)"
   git push -u origin fix/tv6-s1-order-state-issue21
   ```

## Kết quả kỳ vọng Postman

- Login CUSTOMER & STAFF: `200`, lưu `access_token` trong collection variables.
- Tạo đơn: `201`, trạng thái `PENDING`; thanh toán mock: `201`, trạng thái `PAID`.
- STAFF PATCH hợp lệ: `204` và không có body.
- Không có JWT: `401`; CUSTOMER PATCH: `403`; status payload không thuộc enum: `400`.
- Bỏ qua bước hoặc sửa `COMPLETED`/`CANCELLED`: `409`.
- `GET /orders`: `200`, xác nhận trạng thái cuối cùng được lưu.

## Các giới hạn đã xác minh

- `GET /orders/:id` có trong API Contract nhưng hiện **chưa được implement** trên `dev`; trang frontend đang dùng GET `/orders` rồi lọc. Không gọi endpoint này trong collection.
- ADR tính điểm khi `READY → COMPLETED` nhưng `payments.service.ts` trên `dev` đang cộng điểm khi thanh toán thành công. Đây là sai lệch nghiệp vụ cần xử lý riêng và phối hợp TV5; bộ kiểm thử S1 này chưa sửa.
- Test E2E cũ dùng CUSTOMER token cho PATCH dành riêng STAFF, vì thế sửa test để tạo STAFF fixture và sử dụng token phù hợp.
- Các file/bản vá này **chưa được chạy trên DB hoặc deploy** trong môi trường của ChatGPT. Không thay cho ảnh minh chứng Postman.
