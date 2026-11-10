# Kiến trúc hệ thống BrewLite

> **Người tổng hợp:** TV7. **Phiên bản:** bản nháp 2, 10/11/2026. **Task:** 3.1.
>
> Mỗi mục "Phần của TVx" do chủ đoạn viết hoặc do TV7 tổng hợp từ ADR của bạn đó. Đoạn nào TV7 tổng hợp có ghi chú `[TV7 tổng hợp từ ADR, TVx xác nhận]`; chủ đoạn đọc và sửa trực tiếp trong PR. Đoạn của TV5 TV7 viết từ ADR 007 của TV5 và sequence diagram checkout.

## 1. Giới thiệu

BrewLite là hệ thống đặt đồ uống trực tuyến. Khách xem menu, chọn size và topping, quản lý giỏ hàng, đặt đơn, thanh toán (mô phỏng) và theo dõi đơn; nhân viên quầy cập nhật tiến độ pha chế. Tài liệu này mô tả kiến trúc ở mức tổng thể: các khối chính, cách chúng giao tiếp, những quyết định lớn và lý do (ADR), cùng các đánh đổi.

**Phạm vi:** bản MVP của đồ án (Assignment 2). Không bao gồm cổng thanh toán thật, hoàn tiền, đăng nhập mạng xã hội, quên mật khẩu, màn hình quản trị.

## 2. Tổng quan kiến trúc

Hệ thống theo kiến trúc **phân lớp, ba tầng**: giao diện (Next.js/PWA), dịch vụ (NestJS theo module) và dữ liệu (PostgreSQL qua Prisma). Backend là một **modular monolith**: một ứng dụng NestJS duy nhất, mỗi luồng nghiệp vụ là một module riêng.

Xem sơ đồ: `architecture-diagram.svg` (mã nguồn `architecture-diagram.puml`).

![Sơ đồ kiến trúc](../diagrams/architecture-diagram.drawio.svg)

| Tầng | Công nghệ | Trách nhiệm |
|---|---|---|
| Giao diện | Next.js, React, TypeScript, PWA | Hiển thị, giỏ hàng, gọi API, giữ JWT và trạng thái đăng nhập |
| Dịch vụ | NestJS (`apps/api`), theo module | Quy tắc nghiệp vụ, phân quyền, validate, ghi log |
| Dữ liệu | PostgreSQL, Prisma ORM, migration | Lưu dữ liệu, transaction, ràng buộc unique; production dự kiến dùng Amazon RDS |
| Hạ tầng | Docker Compose, GitHub Actions | Đóng gói và CI; production/CD, HTTPS và network boundary chưa có bằng chứng triển khai trong repo |

**Một request đi qua hệ thống như thế nào:** trình duyệt gọi API kèm header `Authorization: Bearer <JWT>` → `JwtAuthGuard` kiểm tra token (và `RolesGuard` kiểm tra vai trò) → `ValidationPipe` kiểm tra dữ liệu → controller → service → Prisma → PostgreSQL. Mọi lỗi đi qua `ExceptionFilter` chung; mọi dòng log của request mang cùng một `requestId`.

### 2.1. Các module backend

| Module (`apps/api/src/modules/...`) | Chủ | Endpoint | Ghi chú |
|---|---|---|---|
| `auth` | TV7 | `POST /auth/register`, `POST /auth/login` | Băm mật khẩu bcrypt, cấp JWT |
| `health` | TV7 | `GET /health` | Kiểm tra kết nối database |
| `products` | TV1, TV2 | `GET /products`, `GET /products/:id` | Menu, chi tiết, size, topping |
| `promotions` | TV3 | `POST /promotions/validate` | Báo giá và mã khuyến mãi, chỉ đọc |
| `orders` (đặt đơn, tồn kho) | TV4 | `POST /orders` | Transaction, trừ kho có điều kiện |
| `payments` | TV5 | `POST /payments` | `Idempotency-Key`, Mock Payment Gateway |
| `orders` (theo dõi, điểm thưởng) | TV6 | `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status` | State machine, `LoyaltyTransaction` |

Hợp đồng chi tiết từng endpoint nằm ở `docs/api-contract.md`.

### 2.2. Mô hình dữ liệu

**Đối chiếu trạng thái:** `docs/diagrams/class-diagram.puml` là mô hình đích. `apps/api/prisma/schema.prisma` hiện chưa có `Category`, `ProductSize`, `Topping` và `LoyaltyTransaction` như diagram; vì vậy quan hệ `Order 1 — 0..1 LoyaltyTransaction` và migration tích điểm chưa được triển khai.

Mô hình dữ liệu (class diagram bản 3, `class-diagram.svg`) gồm: `User`, `Category`, `Product`, `ProductSize`, `Topping`, `Promotion`, `Order`, `OrderItem`, `Payment`, `LoyaltyTransaction` và các enum `Role`, `DiscountType`, `OrderStatus`, `PaymentStatus`, `PaymentMethod`. Các quan hệ chính: User 1 — 0..\* Order; Order 1 — 1..\* OrderItem; Order 1 — 0..\* Payment (thanh toán thất bại rồi thử lại tạo Payment mới); Order 1 — 0..1 LoyaltyTransaction; Promotion 0..1 — 0..\* Order.

## 3. Phần của từng thành viên

### 3.1. Frontend (TV2)

> [TV7 tổng hợp từ ADR 006, TV2 xác nhận]

Frontend dùng **Next.js kết hợp React và TypeScript**, thiết kế **mobile-first** (ưu tiên màn hình điện thoại rồi mở rộng cho tablet và desktop) và định hướng **PWA** bằng Web App Manifest và Service Worker để khách có thể cài đặt từ trình duyệt. Ưu tiên Server Components cho nội dung xử lý được ở phía server và Client Components cho phần cần tương tác. Frontend chỉ giao tiếp với backend qua REST API.

Các ràng buộc rút ra khi kết hợp với các quyết định khác:
- JWT lưu ở localStorage (ADR 009) nên Server Components không đọc được token; các trang cần đăng nhập (checkout, lịch sử, theo dõi đơn, trang nhân viên) là Client Components và gọi API ở phía trình duyệt.
- Server Components không đọc được JWT trong localStorage; các trang cần đăng nhập phải chạy phần gọi API ở Client Component.
- Khi bổ sung Service Worker, không được cache response API có header `Authorization`; hiện chưa có Service Worker để kiểm tra quy tắc này.
- Giỏ hàng lưu ở localStorage (ADR 003); giá luôn lấy từ server.

### 3.2. Triển khai (TV1)

> [TV7 tổng hợp từ ADR 001, 002, 005, TV1 xác nhận và bổ sung phần HTTPS, CD]

- **Cấu trúc mã nguồn:** một **monorepo** gồm `apps/web` (Next.js), `apps/api` (NestJS) và `docs/`, dùng chung `docker-compose.yml` và một pipeline CI.
- **Container hóa:** đóng gói web và api bằng **Docker**, khởi chạy bằng Docker Compose.
- **Hạ tầng mục tiêu:** **AWS EC2** (Ubuntu 24.04 LTS) chạy các container; **Amazon RDS PostgreSQL** lưu dữ liệu bền vững. Production phải đặt reverse proxy ở EC2, chỉ công khai 80/443 và để RDS trong private network/Security Group chỉ nhận 5432 từ Security Group của EC2. Không dùng trạng thái hiện tại của `docker-compose.yml` làm cấu hình production: file này còn chứa port DB/API công khai và endpoint HTTP mẫu.
- **Cấu hình:** `DATABASE_URL` và các biến môi trường truyền vào container qua file `.env` trên EC2; repo chỉ chứa `.env.example` (ADR 010).
- **CI/CD:** CI được mô tả là lint, typecheck, build hai container và test. CD vẫn là hạng mục cần hoàn thiện: build image theo commit SHA, push registry, deploy EC2, chạy migration, smoke test `GET /health`, và rollback về image stable nếu smoke test lỗi.
- **Trạng thái cần xác nhận:** HTTPS production qua reverse proxy/chứng chỉ TLS, RDS private chỉ nhận kết nối từ EC2, secrets/môi trường trên EC2, và bằng chứng pipeline CD.

### 3.3. Giá và khuyến mãi (TV3)

> [TV7 tổng hợp từ ADR 003, TV3 xác nhận]

**Server là nơi duy nhất tính giá; client chỉ hiển thị.** Client chỉ gửi `productId`, `sizeId`, `toppingIds`, `quantity`, `note`, `promotionCode`. Giỏ hàng gọi `POST /promotions/validate` để lấy **báo giá** (đơn giá từng dòng, `subtotal`, `discount`, `total`, trạng thái từng dòng và kết quả mã); endpoint này chỉ đọc, không trừ kho và không tăng `usedCount`. `POST /orders` **tính lại giá từ dữ liệu hiện tại** trong transaction tạo đơn và lưu giá tại thời điểm đặt; `POST /payments` so sánh số tiền với `total` đã lưu. Quy tắc tính dùng chung một hàm ở backend. Tiền tệ là VNĐ, số nguyên.

Đánh đổi: mỗi lần giỏ đổi phải gọi API (mục tiêu dưới 500 ms với giỏ 5 dòng); khi mất mạng không có tổng đáng tin cậy nên khóa nút đặt đơn; giá có thể đổi giữa lúc báo giá và lúc đặt đơn (response `POST /orders` trả `total` thực tế).

### 3.4. Đơn hàng và tồn kho (TV4)

> [TV7 tổng hợp từ ADR 004, TV4 xác nhận]

`POST /orders` đi qua `JwtAuthGuard` để lấy `userId` tin cậy từ token. Trong một khối `$transaction` của Prisma, hệ thống chốt đơn giá ở server (theo TV3), kiểm tra và **trừ kho có điều kiện** (`stock >= quantity`), rồi mới lưu `Order` (trạng thái `PENDING`) và `OrderItem`. Nếu tranh chấp món cuối cùng khiến điều kiện không còn đúng, toàn bộ transaction rollback và API trả **409 Conflict**; giao diện hiển thị thông báo để khách điều chỉnh giỏ hàng. Khi đơn bị hủy hợp lệ (từ `PENDING` hoặc `PAYMENT_FAILED`), hệ thống hoàn lại tồn kho trong transaction.

Đây là **optimistic locking bằng version**, không phải chỉ là kiểm tra `stock`. `Product.version` được lưu trong schema; repository cập nhật có điều kiện theo `id`, `version` và `stock >= quantity`, tăng version khi thành công, retry tối đa 3 lần rồi trả 409. Phần này đã có trong code `apps/api`.

### 3.5. Dịch vụ thanh toán mô phỏng (TV5)

> [TV7 tổng hợp từ ADR 007 của TV5 và sequence diagram checkout, TV5 xác nhận]

`POST /payments` là giao dịch tài chính nên phải **idempotent**: khách bấm nhiều lần, hoặc client tự gửi lại khi mạng chập chờn, không được trừ tiền hai lần. Cơ chế (ADR 007): **client sinh `Idempotency-Key` (UUIDv4)** mỗi lần khách bấm "Xác nhận thanh toán" và gửi trong header; backend lưu key ở cột `Payment.idempotencyKey` có ràng buộc **UNIQUE** trong PostgreSQL, không dùng Redis để khỏi thêm hạ tầng vào Docker Compose.

Luồng ở backend:
1. Thiếu header `Idempotency-Key` thì trả 400.
2. Xác thực JWT, đọc đơn, kiểm tra đơn thuộc người dùng, trạng thái đơn là `PENDING` hoặc `PAYMENT_FAILED` và `amount` khớp `Order.total`.
3. Tra `Payment` theo `idempotencyKey`. **Đã có:** nếu key thuộc đơn khác của cùng người dùng thì trả 409; nếu thuộc người dùng khác thì không tiết lộ bản ghi và trả 404; nếu đúng request thì replay, không gọi cổng thanh toán và không tạo `Payment` mới. Replay kết quả thất bại phải giữ semantics 422 của hợp đồng thanh toán, không biến thành thành công 200.
4. **Chưa có:** gọi `MockPaymentGatewayService` (mô phỏng, không có cổng thật), rồi trong một transaction lưu `Payment` kèm key và cập nhật đơn. Thành công: `Payment` `PAID`, đơn `PAID` (201). Thất bại: `Payment` `FAILED`, đơn `PAYMENT_FAILED`, trả 422 kèm `canRetry`; **không hoàn kho** vì khách có thể thử lại.

**Thử lại:** sau khi thất bại, client phải sinh `Idempotency-Key` **mới**, nếu không sẽ nhận lại kết quả thất bại cũ với mã 422. Đơn quay về `PENDING` rồi mới nhận kết quả mới (ADR 008). `Payment.orderId` không unique vì một đơn có thể có nhiều lần thanh toán.

Đánh đổi: transaction Serializable và xử lý P2002/P2034 trong code đã bao phủ race cùng key và xung đột hai key trên cùng đơn; tuy nhiên gateway mock vẫn được gọi trước khi bản ghi thắng được commit. Với cổng thật cần reservation/outbox hoặc ghi trạng thái idempotency trước khi gọi gateway. Code hiện chỉ kiểm tra key không rỗng và dài tối đa 200 ký tự, chưa validate UUIDv4; frontend dùng `crypto.randomUUID()`, phụ thuộc HTTPS hoặc localhost trong production.

### 3.6. Trạng thái đơn và điểm thưởng (TV6)

> Nguyên văn theo đoạn TV6 gửi, rút gọn.

Luồng theo dõi đơn dùng **State Machine** ở tầng nghiệp vụ NestJS để kiểm soát vòng đời đơn: `PENDING`, `PAYMENT_FAILED`, `PAID`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`. Luồng chính là `PENDING → PAID → PREPARING → READY → COMPLETED`. Thanh toán lỗi chuyển đơn sang `PAYMENT_FAILED`; khi khách thử lại, đơn về `PENDING` trước khi xử lý kết quả mới. Việc hủy do TV4 thực hiện từ `PENDING` hoặc `PAYMENT_FAILED`; **không cho `PAID → CANCELLED`**. Nhân viên chỉ thao tác `PAID → PREPARING → READY → COMPLETED`. Chuyển trạng thái sai trả `409 Conflict`.

Việc đổi trạng thái kiểm tra chuyển hợp lệ rồi cập nhật có điều kiện trong **Prisma transaction** (chỉ đổi nếu trạng thái hiện tại vẫn khớp). Code hiện đã có state machine, transaction và polling; bảng chuyển đổi không cho `PAID → CANCELLED`. Tuy nhiên code thanh toán hiện còn tăng `User.loyaltyPoints` khi thanh toán thành công, trong khi `LoyaltyTransaction` chưa có trong `schema.prisma` và chưa có migration. Thiết kế đúng là chỉ tạo `LoyaltyTransaction` và tăng điểm khi `READY → COMPLETED`, cùng transaction, với unique `orderId`; đây là hạng mục chưa triển khai. Giao diện theo dõi gọi lại `GET /orders/:id` mỗi **5 đến 10 giây** (polling, không dùng WebSocket).

### 3.7. Xác thực và nền tảng chung (TV7)

**Xác thực.** Đăng nhập qua `POST /auth/login` trả JWT chứa `sub` (mã người dùng), `role` (`CUSTOMER` hoặc `STAFF`) và `exp`; mật khẩu băm bằng bcrypt. Token **lưu ở localStorage và gửi bằng header `Authorization: Bearer`** (ADR 009). `JwtAuthGuard` kiểm tra chữ ký và hạn (thiếu, sai hoặc hết hạn trả 401); `RolesGuard` kiểm tra vai trò (sai quyền trả 403). Token sống 1 giờ, không dùng refresh token. Rủi ro XSS được giảm bằng token ngắn hạn, cấm `dangerouslySetInnerHTML`, header `Content-Security-Policy` và xóa token khi API trả 401.

**Nền tảng chung** (ADR 010), mọi module dùng chung:
- **Validate:** `ValidationPipe` toàn cục với `class-validator` (`whitelist`, `forbidNonWhitelisted`, `transform`); sai dữ liệu trả 400.
- **Lỗi:** `ExceptionFilter` toàn cục, định dạng `{statusCode, error, message, requestId}`; không trả stack trace hay câu SQL.
- **Log:** `nestjs-pino`, log JSON, mỗi request có `requestId` (header `X-Request-Id`); che `Authorization`, không ghi body.
- **Cấu hình:** `ConfigModule` kiểm tra biến môi trường khi khởi động (thiếu thì dừng ngay); `.env` không vào repo, chỉ có `.env.example`.
- **Health:** `GET /health` kiểm tra kết nối database (200 hoặc 503) cho smoke test sau deploy.

## 4. Luồng chính: đặt đơn và thanh toán

1. Khách (đã đăng nhập) bấm đặt hàng; giao diện gọi `POST /orders` kèm JWT.
2. `JwtAuthGuard` và `ValidationPipe` kiểm tra; module `orders` (TV4) tính lại giá theo TV3, trừ kho có điều kiện, lưu đơn `PENDING` trong một transaction (hết hàng trả 409).
3. Khách chọn phương thức và xác nhận; giao diện sinh `Idempotency-Key` và gọi `POST /payments`.
4. Module `payments` (TV5) kiểm tra chủ đơn, trạng thái, số tiền và khóa idempotency, rồi gọi Mock Payment Gateway.
5. Thành công: đơn `PAID`. Thất bại: đơn `PAYMENT_FAILED`, khách thử lại.
6. Nhân viên chuyển `PAID → PREPARING → READY → COMPLETED` (TV6); khi `COMPLETED` cộng điểm thưởng; khách xem trạng thái bằng polling.

Chi tiết từng bước: sequence diagram checkout (Task 2.2) và activity diagram của từng luồng.

## 5. Ưu nhược điểm và đánh đổi

| Quyết định (ADR) | Ưu điểm | Nhược điểm và đánh đổi |
|---|---|---|
| Monorepo (001) | Một nơi quản lý, dùng chung Docker Compose và CI, thuận tiện chấm bài | Phải cẩn thận đường dẫn build để không build nhầm ứng dụng |
| AWS EC2 + RDS + Docker (002) | Môi trường local và production đồng nhất, dữ liệu bền vững | Cấu hình Security Group, IAM, biến môi trường và HTTPS cần bằng chứng triển khai; RDS không được public |
| GitHub Actions CI/CD (005) | Phát hiện lỗi build sớm trước khi merge | CI đã mô tả; CD deploy, smoke test và rollback còn cần hoàn thiện |
| Next.js + PWA (006) | Responsive, nhiều chiến lược render, có hướng mở rộng thành PWA | Next.js/mobile-first đã có; Manifest và Service Worker chưa thấy trong `apps/web`, offline chưa được triển khai |
| Giá tính ở server (003) | Không sửa được giá từ client; giá và mã luôn mới nhất | Mỗi lần giỏ đổi phải gọi API; xử lý mất mạng; giá có thể đổi giữa báo giá và đặt đơn |
| Trừ kho có điều kiện trong transaction (004) | Không âm kho, đọc không khóa nên nhanh | Request đến sau món cuối bị 409 |
| Idempotency thanh toán (007) | Bấm nhiều lần hay gửi lại không trừ tiền hai lần; dùng sẵn PostgreSQL, không cần Redis; UNIQUE chống trùng bản ghi | Bảng `Payment` tăng dần; khách thử lại phải sinh key mới; hai request cùng key đồng thời có thể cùng gọi cổng (chỉ một bản ghi được lưu) |
| State machine đơn hàng (008) | Quy trình nhất quán, dễ kiểm thử, không nhảy bước hay cộng điểm trùng | Phải bảo trì bảng chuyển trạng thái; polling tăng số request |
| JWT ở localStorage + Bearer (009) | Đơn giản, tách web và API dễ, dễ test | XSS đọc được token; chặn route chỉ ở client |
| Validate, lỗi, log, cấu hình chung (010) | Đồng nhất giữa các module, truy vết bằng `requestId`, phát hiện thiếu cấu hình khi khởi động | Thêm thư viện; `forbidNonWhitelisted` làm request gửi thừa trường bị từ chối |
| Modular monolith (NestJS theo module) | Một ứng dụng, triển khai và debug đơn giản, hợp đồ án 7 người | Các module dùng chung một codebase và một database nên phải giữ ranh giới bằng quy ước thư mục |

## 6. Danh mục ADR

| Số | Tên | Người | Trạng thái |
|---|---|---|---|
| 001 | Monorepo | TV1 | Accepted |
| 002 | Nền tảng triển khai AWS và Docker | TV1 | Accepted |
| 003 | Giá tính ở server | TV3 | Đề xuất |
| 004 | Tồn kho: optimistic locking và transaction | TV4 | Accepted |
| 005 | CI/CD với GitHub Actions | TV1 | Accepted |
| 006 | Next.js và PWA cho frontend | TV2 | Đề xuất |
| 007 | Idempotency thanh toán | TV5 | Đề xuất |
| 008 | State machine đơn hàng | TV6 | Đề xuất |
| 009 | JWT: lưu ở localStorage, gửi bằng header Bearer | TV7 | Đề xuất |
| 010 | Validate, lỗi, log và cấu hình | TV7 | Đề xuất |

Thư mục thực tế: `docs/architecture/adr/`; các file `00x-*.md` vẫn dùng số tạm và cần đổi tên khi nhóm chốt số chính thức.

## 7. Điểm còn tồn đọng

1. **TV5:** Code đã xử lý P2002/P2034 và key khác đơn; cần bổ sung UUIDv4 validation và ánh xạ replay thất bại thành HTTP 422 ở controller/filter. Hiện frontend tạo UUID bằng `crypto.randomUUID()`.
2. **TV1:** Cần hoàn thiện HTTPS qua reverse proxy, RDS private chỉ nhận kết nối từ EC2, CD deploy/migration/smoke test `/health`/rollback và ghi bằng chứng.
3. **TV4:** Đã xác nhận optimistic locking bằng `Product.version`, điều kiện stock và retry; cần giữ thuật ngữ này nhất quán trong ADR/sơ đồ.
4. **TV2:** ADR PWA đã bổ sung ràng buộc JWT localStorage và quy tắc Service Worker; cần tạo Manifest/Service Worker nếu vẫn nhận phạm vi PWA.
5. **TV2, TV4:** SRS phải bỏ `PAID → CANCELLED`; state machine code và class diagram đã cấm chuyển đổi này.
6. **TV6:** Đường dẫn đúng là `docs/architecture/adr/`; `LoyaltyTransaction` và migration chưa có trong schema/code, còn cộng điểm đang nằm sai thời điểm trong payment service.
7. **TV7:** API contract cần ghi 422 và đánh dấu mismatch hiện tại; class diagram đang là mô hình đích, chưa khớp schema Prisma hiện tại.

## 8. Tài liệu liên quan

`docs/api-contract.md`, `docs/srs.md`, `class-diagram.svg`, `activity-xac-thuc.svg`, sequence diagram checkout (Task 2.2), `docs/architecture/adr/*.md`, `docs/diagrams/`.