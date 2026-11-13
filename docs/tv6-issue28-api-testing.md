# TV6 Sprint 2 — Issue #28: Kiểm thử và hoàn thiện API trạng thái đơn hàng

- Issue: <https://github.com/phuhoangcong333/brewlite-assignment2/issues/28>
- Repository: `phuhoangcong333/brewlite-assignment2`, base branch: `dev`
- API chính: `PATCH /orders/:id/status` (chỉ STAFF), `GET /orders/:id` (chủ sở hữu)
- Ngày đối chiếu: 13/11/2026, commit `41dfaa66897604f734321ffaacc844244aef423b` (dev)

> Tài liệu và các bài test là **mã nguồn / test plan**. Chỉ tick PASS sau khi thật sự chạy trên backend và DB phù hợp. Chưa có screenshot Postman hoặc kết quả kiểm thử trên hệ thống triển khai.

## 1. Bối cảnh và phạm vi

Nhánh dev đã có `order-state.ts`, `assertTransition`, `OrderService.transitionOrder()` sử dụng Prisma transaction + optimistic update và API PATCH có `JwtGuard` + `StaffGuard`. Các đầu việc bổ sung trong S2:

1. Triển khai `GET /orders/:id` vì API Contract phần 4.10 đã quy định nhưng code chưa có. API giới hạn quyền sở hữu bằng JWT `sub` + `order.userId` và trả 404 cho đơn của người khác.
2. Trả 400 khi ID không hợp lệ/không dương cho GET detail và PATCH trạng thái.
3. Sửa test E2E `task10.e2e-spec.ts` vốn đang dùng token CUSTOMER với PATCH chỉ dành cho STAFF.
4. Bổ sung suite E2E riêng `tv6-order-state.e2e-spec.ts`, unit test controller và collection Postman 31 request có assertions.
5. Ghi lại hành vi CORS/JSON và quy trình smoke test ở local và môi trường triển khai.

**Không tự đổi chính sách nghiệp vụ**: `PAID → CANCELLED` vẫn bị chặn; trạng thái terminal `COMPLETED`/`CANCELLED` không có bước tiếp; TV5 chịu trách nhiệm thanh toán. `LoyaltyTransaction` và cách cộng điểm khi hoàn thành là dependency liên nhóm, chưa được hoàn thiện trong S2 này.

## 2. Bảng chuyển trạng thái chính thức

| Trạng thái hiện tại | Chuyển trạng thái được phép | Ai thực hiện |
| --- | --- | --- |
| `PENDING` | `PAID`, `PAYMENT_FAILED`, `CANCELLED` | TV5 payment / TV4 cancel |
| `PAYMENT_FAILED` | `PENDING`, `CANCELLED` | TV5 retry / TV4 cancel |
| `PAID` | `PREPARING` | STAFF / TV6 |
| `PREPARING` | `READY` | STAFF / TV6 |
| `READY` | `COMPLETED` | STAFF / TV6 |
| `COMPLETED` | Không | Terminal |
| `CANCELLED` | Không | Terminal |

Người dùng CUSTOMER không thể tự PATCH; STAFF chỉ được đổi giữa các bước phục vụ. Backend quyết định hợp lệ, không dựa vào trạng thái/UI mà client gửi về.

## 3. Hợp đồng HTTP và mã lỗi

### 3.1 `PATCH /orders/:id/status`

- Headers: `Authorization: Bearer <staff-access_token>`; `Content-Type: application/json`
- Request: `{"status":"PREPARING"}` (với đơn hiện ở `PAID`)
- Success: `204 No Content` (không có JSON response body). Client gọi lại GET để xem trạng thái.

| HTTP | Tình huống |
| --- | --- |
| 204 | STAFF chuyển hợp lệ, dữ liệu DB cập nhật |
| 400 | ID sai định dạng / không dương, thiếu/sai `status`, JSON không parse được |
| 401 | Không có Bearer token, token sai hoặc hết hạn |
| 403 | JWT hợp lệ nhưng không phải vai trò STAFF |
| 404 | Đơn hàng ID không tồn tại |
| 409 | Bỏ qua bước, đổi trạng thái terminal, thao tác trùng hoặc xung đột cập nhật |

**Ví dụ PATCH** (chỉ với token STAFF và đơn đang PAID):

```bash
curl -i -X PATCH 'http://localhost:3001/orders/105/status' \
  -H 'Authorization: Bearer <STAFF_TOKEN>' \
  -H 'Content-Type: application/json' \
  --data '{"status":"PREPARING"}'
```

### 3.2 `GET /orders/:id`

- Headers: `Authorization: Bearer <customer-access_token>`
- Success: `200 OK`, trả thông tin đơn, trạng thái, các item và sản phẩm theo quan hệ Prisma.
- `401`: chưa có token, `400`: ID không hợp lệ, `404`: không tồn tại hoặc không phải đơn thuộc tài khoản JWT.
- Người dùng không được truyền `userId` tùy ý để truy cập đơn của người khác.

**Ví dụ response rút gọn:**

```json
{
  "id": 105,
  "userId": 7,
  "status": "READY",
  "total": 45000,
  "items": [{"productId": 1, "size": "M", "qty": 1, "toppings": [], "lineTotal": 45000}]
}
```

## 4. Cài đặt local / Windows PowerShell

Yêu cầu Node.js, PostgreSQL đã khởi tạo schema, `DATABASE_URL`, `JWT_SECRET` và file `.env` hợp lệ. Test E2E cần một **database riêng**, không chạy trên DB production. Không commit token hoặc file `.env`.

```powershell
# Ở thư mục gốc repository, branch tạo từ dev
python 'C:\duong-dan\TV6_Issue28\apply_tv6_issue28.py'
git diff --stat
git diff

cd apps/api
npm.cmd ci
npx.cmd prisma generate --schema prisma/schema.prisma
# Chạy migration trên DB test phù hợp, sau khi đã kiểm tra DATABASE_URL
npx.cmd prisma migrate deploy --schema prisma/schema.prisma

# Unit test không phụ thuộc database
npm.cmd test -- --runInBand src/orders/order-state.spec.ts src/orders/orders.status.controller.spec.ts src/auth/staff.guard.spec.ts

# E2E yêu cầu database đang chạy (nếu DATABASE_URL thiếu, suite describeDb sẽ SKIP)
npm.cmd run test:e2e -- --runInBand test/tv6-order-state.e2e-spec.ts
npm.cmd run test:e2e -- --runInBand test/task10.e2e-spec.ts
```

Nếu trước đây PowerShell báo `docker is not recognized`, phải cài/chạy Docker Desktop hoặc cung cấp PostgreSQL local/cloud test hợp lệ. Docker **không cần thiết** nếu bạn có PostgreSQL test riêng và `DATABASE_URL` đúng.

**Không đánh dấu E2E PASS khi `DATABASE_URL` chưa cấu hình**: `describeDb` tự bỏ qua suite trong trường hợp này. Nếu DB bị lỗi kết nối, cần xử lý thật trước khi chụp minh chứng.

## 5. Postman: chuẩn bị và Runner

Import `TV6_S2_Issue28.postman_collection.json`. Trong **Collection variables**, cấu hình:

| Biến | Ví dụ / ghi chú |
| --- | --- |
| `baseUrl` | `http://localhost:3001` hoặc URL backend deploy |
| `customerEmail`, `customerPassword` | tài khoản CUSTOMER thật ở DB test |
| `staffEmail`, `staffPassword` | tài khoản STAFF thật ở DB test |
| `otherCustomerEmail`, `otherCustomerPassword` | tài khoản CUSTOMER thứ hai, khác account chính |
| `productId` | ID sản phẩm còn **tối thiểu 2 tồn kho** |
| `frontendOrigin` | `http://localhost:3000` hoặc đúng `CORS_ORIGIN` đã deploy |
| `missingOrderId` | ID chắc chắn chưa tồn tại, mặc định `2147483647` |
| token/order IDs | để trống, các request trước tự lưu khi chạy |

Với seed hiện có, STAFF chỉ được tạo khi có cả `STAFF_EMAIL` và `STAFF_PASSWORD` rồi chạy seed trên **DB test**. Không dùng token CUSTOMER để gọi PATCH.

Mở collection → **Run collection** → chạy theo thứ tự 01–31, không bật chạy song song. Tự kiểm tra script assertion, HTTP code và trạng thái DB. Vì collection tự tạo đơn và thanh toán/hủy, chỉ chạy trên môi trường test.

**Các nhóm case:**

- 01–04: login/customer+staff, tạo đơn và thanh toán thành `PAID`.
- 05–12: phân quyền, bỏ qua bước, ba chuyển đổi hợp lệ, terminal và 400/401.
- 13–17: xác nhận DB qua GET danh sách, hủy `PENDING`, không mở terminal.
- 18–29: GET chi tiết và ownership, 404/400, JSON lỗi, role staff-list.
- 30–31: STAFF list và CORS preflight (kiểm tra `Access-Control-Allow-Origin`).

**Chụp minh chứng từ kết quả thực**: màn hình Runner (tổng request/test PASS/FAIL), ba request PATCH hợp lệ, response 403 CUSTOMER, 409 chuyển sai/terminal, 400 JSON và 404 ownership, GET detail 200. Lưu ảnh trong `docs/evidence/tv6-issue28/` và không đưa mật khẩu / full JWT vào ảnh.

## 6. CORS, JSON và triển khai

`apps/api/src/main.ts` đã có `ValidationPipe({ whitelist:true, forbidNonWhitelisted:true, transform:true })`, và `app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' })`.

- Với frontend khác `http://localhost:3000`, cấu hình `CORS_ORIGIN` đúng origin (đúng scheme, domain và port), sau đó khởi động lại API.
- Postman **không đại diện** cho hành vi CORS của browser. Kiểm tra browser Network/Console và request OPTIONS ở host deploy thật.
- `PATCH` thành công trả **204 không có body**: code frontend không được mặc định `response.json()` luôn hợp lệ.
- `Content-Type: application/json` và JSON body phải đúng cú pháp. DTO từ chối `status` thiếu hoặc khác enum bằng 400.

Kiểm tra preflight triển khai (thay domain/origin):

```bash
curl -i -X OPTIONS 'https://api.example.com/orders/105/status' \
  -H 'Origin: https://frontend.example.com' \
  -H 'Access-Control-Request-Method: PATCH' \
  -H 'Access-Control-Request-Headers: authorization,content-type'
```

Xác minh `Access-Control-Allow-Origin` đúng frontend, `Access-Control-Allow-Methods` chứa PATCH, không có lỗi CORS trong browser. Môi trường deploy thực tế chưa được xác định trong Issue #28; không có bằng chứng đã chạy live smoke test.

## 7. Checklist nghiệm thu và phụ thuộc

- [ ] `npm test` suite state-machine / controller / guard: PASS, không skipped
- [ ] `npm run test:e2e ...tv6-order-state...`: PASS với DB test thật, không skipped
- [ ] `npm run test:e2e ...task10...`: PASS sau fix token STAFF
- [ ] Postman Runner 31 request chạy và PASS
- [ ] Chụp ảnh minh chứng thật, không lộ credentials/tokens
- [ ] Smoke test trên backend deploy: PATCH 204 / 400 / 401 / 403 / 404 / 409
- [ ] CORS preflight và frontend STAFF thao tác thực tế
- [ ] TV2 xác nhận frontend GET detail và PATCH hoạt động
- [ ] TV5 / TV7 thống nhất việc **chỉ tích điểm khi READY → COMPLETED**; hiện code payment đang cộng điểm khi PAID, còn thiếu `LoyaltyTransaction` theo ADR. Đây là dependency ngoài phần trạng thái của Issue #28, **chưa được sửa trong bản vá này**.

## 8. Giới hạn xác minh

Bản vá được soạn từ source code branch dev ở commit nêu trên. Chưa có quyền GitHub tạo branch trong kết nối hiện tại (lỗi 403), và môi trường hiện không có PostgreSQL/Node dependencies của repo để chạy NestJS E2E. Vì vậy không tự đánh dấu Issue #28 hoàn thành trên GitHub, không tạo minh chứng giả và không tuyên bố toàn bộ test đã PASS.
