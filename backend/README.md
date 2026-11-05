# BrewLite Backend

Backend REST API của BrewLite, xây dựng bằng NestJS, TypeScript, Prisma và PostgreSQL.
Backend phụ trách tài khoản, sản phẩm, tạo đơn, tồn kho đồng thời, promotion,
loyalty points, thanh toán mock và máy trạng thái đơn hàng.

## 1. Yêu cầu môi trường

- Node.js 20 trở lên.
- npm.
- PostgreSQL đang chạy và có thể truy cập từ backend.
- Git.

Tất cả lệnh trong tài liệu này chạy từ thư mục `backend`:

```powershell
cd backend
```

## 2. Cài đặt nhanh

### 2.1 Cài dependencies

```powershell
npm install
```

### 2.2 Tạo file môi trường

```powershell
Copy-Item .env.example .env
```

Sửa `backend/.env`:

```env
PORT=3001
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/brewlite?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
```

Không commit `.env`. `JWT_SECRET` phải là secret đủ dài trong môi trường thật.

### 2.3 Migration, Prisma Client và seed

```powershell
npx prisma migrate dev --schema prisma/schema.prisma
npx prisma generate --schema prisma/schema.prisma
npm run db:seed
```

Seed tạo 8 sản phẩm với stock ban đầu 50, hai promotion `GIAM10` và `BREW20`,
và user mẫu `test@gmail.com` với password `password123`.

Mở Prisma Studio:

```powershell
npx prisma studio --schema prisma/schema.prisma
```

Khi thay đổi schema, tạo migration mới:

```powershell
npx prisma migrate dev --schema prisma/schema.prisma --name describe_change
npx prisma generate --schema prisma/schema.prisma
```

Không sửa hoặc xóa migration đã áp dụng.

## 3. Chạy backend

### Development

```powershell
npm run start:dev
```

Server mặc định: `http://localhost:3001`.

### Các chế độ khác

```powershell
npm run start
npm run start:debug
npm run build
npm run start:prod
```

`npm run start:prod` chạy `dist/main.js`, nên cần chạy `npm run build` trước.

## 4. Request và validation chung

Backend bật global `ValidationPipe`:

- `whitelist: true`: loại field không có trong DTO.
- `forbidNonWhitelisted: true`: field lạ trả `400`.
- `transform: true`: chuyển kiểu và validate nested DTO.

JSON request dùng:

```http
Content-Type: application/json
```

Route cần đăng nhập dùng:

```http
Authorization: Bearer <access_token>
```

JWT guard xác thực user và đặt vào request:

```json
{ "id": 1, "email": "customer@example.com" }
```

## 5. Toàn bộ endpoint

### 5.1 Bảng endpoint

| Method | Endpoint | Auth | Chức năng |
| --- | --- | --- | --- |
| GET | `/` | Không | Kiểm tra backend đang chạy |
| GET | `/products` | Không | Danh sách sản phẩm |
| GET | `/products/:id` | Không | Chi tiết sản phẩm |
| POST | `/auth/register` | Không | Đăng ký tài khoản |
| POST | `/auth/login` | Không | Đăng nhập, nhận JWT |
| GET | `/auth/me` | JWT | User hiện tại |
| POST | `/orders` | JWT | Tạo order, giữ stock |
| GET | `/orders/me` | JWT | Lịch sử order của user |
| DELETE | `/orders/:id` | JWT | Hủy order |
| PATCH | `/orders/:id/status` | JWT | Chuyển status barista |
| POST | `/payments` | JWT | Thanh toán mock |

Orders controller có thêm alias prefix `/order`. Contract khuyến nghị dùng
`/orders`, ví dụ `/orders/me` thay vì `/order/me`.

### 5.2 `GET /`

Health/root endpoint đơn giản:

```powershell
curl http://localhost:3001/
```

### 5.3 `GET /products`

Không cần JWT. Trả danh sách Product gồm id, name, price, imageUrl, stock và
version.

```powershell
curl http://localhost:3001/products
```

### 5.4 `GET /products/:id`

Không cần JWT:

```powershell
curl http://localhost:3001/products/1
```

Sản phẩm không tồn tại trả `404`.

### 5.5 `POST /auth/register`

Body:

```json
{
  "email": "customer@example.com",
  "password": "password123"
}
```

Password được hash bằng bcrypt. Schema hiện tại không có cột `User.name`, nên
register không nhận `name`.

Response `201`:

```json
{
  "message": "Đăng ký thành công",
  "user": {
    "id": 10,
    "email": "customer@example.com"
  }
}
```

Email đã tồn tại trả `409`. Body sai validation trả `400`.

### 5.6 `POST /auth/login`

Body:

```json
{
  "email": "customer@example.com",
  "password": "password123"
}
```

Response `200`:

```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "user": {
    "id": 10,
    "email": "customer@example.com"
  }
}
```

Email không tồn tại hoặc password sai đều trả `401`.

### 5.7 `GET /auth/me`

Cần JWT:

```powershell
curl http://localhost:3001/auth/me `
  -H "Authorization: Bearer <access_token>"
```

Dùng endpoint này để kiểm tra token và user hiện tại.

### 5.8 `POST /orders`

Cần JWT. Không gửi `userId`; user id lấy từ JWT.

Body:

```json
{
  "items": [
    {
      "productId": 1,
      "qty": 2,
      "size": "M",
      "toppings": ["Trân châu"]
    }
  ]
}
```

Body có mã giảm giá:

```json
{
  "promoCode": "GIAM10",
  "items": [
    {
      "productId": 1,
      "qty": 1,
      "size": "L",
      "toppings": ["Kem"]
    }
  ]
}
```

Quy tắc validation:

- `productId` và `qty` là số nguyên dương.
- `size` chỉ là `S`, `M` hoặc `L`.
- Topping hợp lệ hiện tại là `Trân châu` và `Kem`.
- `items` phải là mảng không rỗng.
- Giá được đọc từ database; client không thể tự sửa giá.

Response `201`:

```json
{
  "id": 12,
  "status": "PENDING",
  "total": 42000,
  "discount": 0
}
```

Khi tạo order, backend đọc sản phẩm, tính line total, reserve inventory và tạo
Order/OrderItem trong cùng transaction.

### 5.9 `GET /orders/me`

Cần JWT. Chỉ trả order thuộc user trong token:

```powershell
curl http://localhost:3001/orders/me `
  -H "Authorization: Bearer <access_token>"
```

Mỗi order gồm id, status, total, discount, promoCode, createdAt và items.

### 5.10 `DELETE /orders/:id`

Cần JWT và phải là chủ order:

```powershell
curl -X DELETE http://localhost:3001/orders/12 `
  -H "Authorization: Bearer <access_token>"
```

Response thành công là `204`.

Chỉ các status sau được hủy:

- `PENDING -> CANCELLED`
- `PAYMENT_FAILED -> CANCELLED`

`PAID` không được hủy. Khi hủy thành công, order chuyển `CANCELLED` và stock
được release trong cùng transaction.

- Thiếu token: `401`.
- Không tồn tại hoặc không thuộc user: `404`.
- Status không cho phép hoặc transaction conflict: `409`.

### 5.11 `PATCH /orders/:id/status`

Cần JWT và ownership. Body:

```json
{ "status": "PREPARING" }
```

State machine hợp lệ:

```text
PENDING -> PAID
PENDING -> PAYMENT_FAILED
PAYMENT_FAILED -> PENDING
PAID -> PREPARING -> READY -> COMPLETED
```

Status transition không hợp lệ trả `409`; thành công trả `204`.

### 5.12 `POST /payments`

Cần JWT và header bắt buộc:

```http
Idempotency-Key: unique-key-123
```

Key không được rỗng và dài tối đa 200 ký tự.

Thanh toán ví:

```json
{
  "orderId": 12,
  "method": "WALLET",
  "walletId": "WALLET-1234"
}
```

Thanh toán thẻ:

```json
{
  "orderId": 12,
  "method": "CARD",
  "cardNumber": "4111111111111111"
}
```

Mock payment thất bại nếu 4 ký tự cuối của `walletId` hoặc `cardNumber` là
`0000`.

Success response `201`:

```json
{
  "paymentId": 5,
  "orderId": 12,
  "amount": 42000,
  "method": "CARD",
  "payment_status": "PAID",
  "order_status": "PAID",
  "message": "Thanh toán thành công (mock)",
  "replayed": false
}
```

Failure response cũng là HTTP `201` vì đây là kết quả nghiệp vụ:

```json
{
  "payment_status": "PAYMENT_FAILED",
  "order_status": "PAYMENT_FAILED",
  "message": "Thanh toán thất bại (mock)",
  "replayed": false
}
```

Payment status error thường gặp:

- Thiếu key, method hoặc field payment: `400`.
- Không có JWT: `401`.
- Order không tồn tại/không thuộc user: `404`.
- Order đã `PAID` hoặc state transition không hợp lệ: `409`.

## 6. Flow nghiệp vụ đầy đủ

### 6.1 Flow khách hàng

1. Client gọi `GET /products` để hiển thị menu.
2. Client gọi `GET /products/:id` để xem chi tiết.
3. Khách chọn size, topping và số lượng ở frontend.
4. Khách đăng ký bằng `POST /auth/register` hoặc đăng nhập bằng
   `POST /auth/login`.
5. Frontend giữ JWT và gửi `Authorization: Bearer ...`.
6. Client gửi `POST /orders` với items và optional promoCode.
7. Backend tự đọc giá, tính tổng, kiểm tra promotion và giữ stock.
8. Order được tạo ở `PENDING`.
9. Client gửi `POST /payments` với Idempotency-Key.
10. Payment thành công chuyển order `PAID` và cộng loyalty points.
11. Payment thất bại chuyển order `PAYMENT_FAILED`, stock vẫn được giữ để retry.
12. Client dùng `GET /orders/me` để xem lịch sử và trạng thái.

### 6.2 Flow promotion

1. Client gửi `promoCode` trong `POST /orders`.
2. Backend chuẩn hóa code uppercase.
3. Kiểm tra code có tồn tại, chưa hết hạn và còn usage.
4. Tính `discount` theo phần trăm trên subtotal.
5. Giảm `usageLeft` và lưu `promoCode/discount` vào Order cùng transaction.
6. Nếu transaction lỗi, cả discount usage và stock đều rollback.

### 6.3 Flow payment retry

1. Order đang `PENDING`.
2. Payment thất bại, order chuyển `PAYMENT_FAILED`.
3. Client retry với Idempotency-Key mới.
4. Backend chuyển tạm `PAYMENT_FAILED -> PENDING`.
5. Payment thành công chuyển `PENDING -> PAID`.
6. Stock không bị reserve lần hai.

### 6.4 Flow idempotency

- Request đầu tiên tạo Payment và cập nhật order.
- Request lặp cùng key tìm thấy Payment cũ và replay kết quả.
- Không tạo Payment mới.
- Không cập nhật order lần hai.
- Không cộng loyalty points lần hai.
- Nếu key cùng nhưng order/method khác, trả `409`.

### 6.5 Flow inventory đồng thời

1. Hai request cùng đọc stock/version.
2. Cả hai tính update từ cùng snapshot.
3. Một request update đúng version và commit trước.
4. Request còn lại không match version/stock.
5. Transaction request sau rollback.
6. Service retry bằng snapshot mới tối đa 3 lần.
7. Nếu hết stock, trả `409`; stock không âm.

## 7. Database và schema

Model chính:

- `Product`: id, name, price, imageUrl, stock, version.
- `User`: id, email, passwordHash, loyaltyPoints, createdAt.
- `Order`: userId, status, total, discount, promoCode, createdAt.
- `OrderItem`: orderId, productId, size, qty, toppings, lineTotal.
- `Payment`: orderId, idempotencyKey duy nhất, amount, method, status.
- `Promotion`: code duy nhất, percent, expiresAt, usageLeft.

### Optimistic locking

Reserve dùng update có điều kiện tương đương:

```sql
UPDATE "Product"
SET "stock" = new_stock, "version" = "version" + 1
WHERE "id" = product_id
  AND "version" = expected_version
  AND "stock" >= requested_qty;
```

Nếu không có dòng nào match, repository trả conflict để service đọc lại và retry.

### Migration

```powershell
npx prisma migrate status --schema prisma/schema.prisma
npx prisma migrate dev --schema prisma/schema.prisma --name describe_change
npx prisma generate --schema prisma/schema.prisma
```

## 8. Test và kiểm thử

### 8.1 Full unit/integration suite

```powershell
npm test
```

Lệnh này chạy Prisma generate trước test. Các test database dùng `DATABASE_URL`.
Nếu không có `DATABASE_URL`, helper `describeDb` skip test PostgreSQL và in cảnh báo.

Chạy trực tiếp Jest:

```powershell
node --experimental-vm-modules .\node_modules\jest\bin\jest.js --runInBand
```

### 8.2 E2E

```powershell
npm run test:e2e -- --runInBand
```

Chạy riêng Task 10:

```powershell
node --experimental-vm-modules .\node_modules\jest\bin\jest.js `
  --config .\test\jest-e2e.json `
  test/task10.e2e-spec.ts `
  --runInBand
```

E2E kiểm tra JWT, `/orders/me`, promotion, concurrent orders, idempotency,
payment retry, cancel ownership/race và barista lifecycle.

### 8.3 Phân loại test theo database

#### Test cần PostgreSQL

Các file sau dùng `describeDb` hoặc khởi tạo `AppModule` có `PrismaService`,
nên cần `DATABASE_URL` hợp lệ và PostgreSQL đang chạy:

- `src/inventory/inventory.service.spec.ts`: optimistic locking, reserve đồng thời và rollback.
- `src/orders/order.create.spec.ts`: tạo order, reserve stock, retry và promotion.
- `src/orders/order.service.spec.ts`: cancel, release stock và state transition đồng thời.
- `src/payments/payments.spec.ts`: payment thật, idempotency, retry và loyalty points.
- `test/task10.e2e-spec.ts`: JWT, orders, `/orders/me`, payments, promotion và concurrency qua HTTP.
- `test/helpers/describe-db.spec.ts`: kiểm tra kết nối PostgreSQL và bảng Product.
- `test/app.e2e-spec.ts`: app E2E tối thiểu; vì import `AppModule`, Prisma vẫn được khởi tạo.

Chạy nhóm database:

```powershell
node --experimental-vm-modules .\node_modules\jest\bin\jest.js `
  src/inventory/inventory.service.spec.ts `
  src/orders/order.create.spec.ts `
  src/orders/order.service.spec.ts `
  src/payments/payments.spec.ts `
  test/helpers/describe-db.spec.ts `
  --runInBand

npm run test:e2e -- --runInBand
```

#### Test không cần PostgreSQL

Các test unit dùng mock/in-memory hoặc hàm thuần:

- `src/auth/auth.spec.ts`
- `src/common/errors.spec.ts`
- `src/inventory/inventory.plan.spec.ts`
- `src/inventory/inventory.release.plan.spec.ts`
- `src/orders/order-cancel.plan.spec.ts`
- `src/orders/order-state.spec.ts`
- `src/orders/orders.controller.spec.ts`
- `src/app.controller.spec.ts`

Chạy nhóm không cần database:

```powershell
node --experimental-vm-modules .\node_modules\jest\bin\jest.js `
  src/auth/auth.spec.ts `
  src/common/errors.spec.ts `
  src/inventory/inventory.plan.spec.ts `
  src/inventory/inventory.release.plan.spec.ts `
  src/orders/order-cancel.plan.spec.ts `
  src/orders/order-state.spec.ts `
  src/orders/orders.controller.spec.ts `
  src/app.controller.spec.ts `
  --runInBand
```

`npm test` chạy toàn bộ hai nhóm. Khi không có `DATABASE_URL`, những suite dùng
`describeDb` được skip và helper in cảnh báo; `test/app.e2e-spec.ts` vẫn cần DB
vì nó khởi tạo toàn bộ `AppModule`.

### 8.4 Ba tiêu chí chứng minh Task 10

#### (a) Chặn chuyển trạng thái sai

Files:

- `src/orders/order-state.spec.ts`: test toàn bộ `7 x 7 = 49` tổ hợp trạng thái,
  gồm test rõ ràng `PENDING -> READY` phải bị chặn.
- `src/orders/order.service.spec.ts`: kiểm tra transition sai không đổi status
  và không làm thay đổi stock trong transaction PostgreSQL.
- `test/task10.e2e-spec.ts`: kiểm tra gọi HTTP `PATCH /orders/:id/status` với
  transition sai trả `409`.

Các test dùng `assertTransition`, `canTransition` và `InvalidTransitionException`.

#### (b) Cùng Idempotency-Key chỉ tạo một Payment

Files:

- `src/payments/payments.spec.ts`: integration test với PostgreSQL; gửi lại cùng
  key, kiểm tra chỉ có một record Payment và lần sau trả `replayed: true`.
- `test/task10.e2e-spec.ts`: gọi thật `POST /payments` hai lần qua HTTP với cùng
  key, sau đó kiểm tra database chỉ có một Payment.

Logic được bảo vệ bằng unique constraint `Payment.idempotencyKey` và transaction
Serializable. Request cùng key không tạo payment/order thứ hai và không cộng
loyalty points lần hai.

#### (c) Đặt đồng thời không vượt tồn kho

Files:

- `src/inventory/inventory.service.spec.ts`: test in-memory và PostgreSQL cho
  stock `1`, stock `50`, retry version và stock không âm.
- `src/orders/order.create.spec.ts`: hai order đồng thời qua service, kiểm tra
  reserve stock nằm cùng transaction với tạo order.
- `test/task10.e2e-spec.ts`: hai request HTTP `POST /orders` đồng thời với stock
  `1`; chỉ một request thành công, request còn lại trả `409`, stock cuối là `0`.

Cơ chế dùng `version` optimistic locking, điều kiện `stock >= qty`, transaction
rollback và retry tối đa 3 lần.

Chạy riêng ba nhóm tiêu chí:

```powershell
node --experimental-vm-modules .\node_modules\jest\bin\jest.js `
  src/orders/order-state.spec.ts `
  src/orders/order.service.spec.ts `
  src/inventory/inventory.service.spec.ts `
  src/orders/order.create.spec.ts `
  src/payments/payments.spec.ts `
  --runInBand

npm run test:e2e -- --runInBand
```

### 8.5 Build, lint và coverage

```powershell
npm run build
npm run lint
npm run test:cov
npm run test:watch
npm run test:debug
```

## 9. Cấu trúc thư mục

```text
backend/
  prisma/
    schema.prisma
    seed.ts
    migrations/
  src/
    auth/       # register, login, JWT guard
    common/     # domain conflict exceptions
    inventory/  # plans, repository, optimistic locking
    orders/     # service, state machine, DTOs, controllers
    payments/   # mock payment, idempotency, loyalty
    Product/    # product endpoints
    users/      # user persistence and bcrypt
    prisma/     # PrismaService/module
  test/
    app.e2e-spec.ts
    task10.e2e-spec.ts
    helpers/describe-db.ts
```

## 10. Troubleshooting

### `Cannot find module '../src/app.module'`

Chạy test từ thư mục `backend`, không chạy relative path từ root:

```powershell
cd backend
npm run test:e2e -- --runInBand
```

Nếu VS Code vẫn hiện diagnostic cũ, chạy `TypeScript: Restart TS Server`.

### Prisma không kết nối được

Kiểm tra PostgreSQL, `DATABASE_URL`, username/password/port và migration:

```powershell
npx prisma migrate status --schema prisma/schema.prisma
```

### Test database bị skip

Kiểm tra `backend/.env` có `DATABASE_URL`, sau đó chạy Jest từ thư mục `backend`.

### Port 3001 đã được sử dụng

Đổi `PORT` trong `.env` hoặc dừng process đang sử dụng port đó.
