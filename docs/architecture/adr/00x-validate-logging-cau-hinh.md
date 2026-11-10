# ADR-00x: Validate input, xử lý lỗi, logging và cấu hình ở backend

- **Trạng thái:** Đề xuất, chờ nhóm phản hồi; sau đó chuyển thành Đã chốt.
- **Ngày:** 08/11/2026
- **Người viết:** TV7 (xác thực và nền tảng chung)
- **Liên quan:** `docs/api-contract.md` (định dạng lỗi chung), `TV7-FR-07`, `TV7-NFR-03`, `TV7-NFR-04`, `TV7-NFR-05`, `TV7-NFR-06`, `TV7-NFR-07`

## Bối cảnh

Backend NestJS do 7 người cùng viết, mỗi người một module. Nếu mỗi người tự validate dữ liệu, tự trả lỗi, tự ghi log và tự đọc biến môi trường thì định dạng lỗi sẽ khác nhau, khó truy vết khi gặp sự cố, và secret dễ lọt vào repo hay log CI. Đề yêu cầu có `GET /health`, cấu hình qua biến môi trường, log và không để secret trong repo.

Cần quyết định bốn việc nền tảng chung, mọi module đều dùng:
1. Validate dữ liệu client gửi lên bằng cách nào?
2. Trả lỗi theo định dạng nào?
3. Ghi log ra sao để truy vết được một request?
4. Đọc và kiểm tra cấu hình thế nào?

Ràng buộc: còn rất ít thời gian, phải kịp CI/CD và triển khai production, mọi người đã có sẵn DTO dạng class (ví dụ `CreateOrderDto` của TV4).

## Các phương án đã cân nhắc

### 1. Validate input

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| **A. `class-validator` + `ValidationPipe` toàn cục** | Là cách chuẩn của NestJS, hợp với DTO dạng class đã có, mỗi người chỉ cần thêm decorator vào DTO. | Phải cấu hình đúng (whitelist) để không lọt trường thừa. |
| B. Zod | Schema và kiểu TypeScript đi cùng nhau. | Thêm thư viện mới, không hợp với DTO class hiện có, mọi người phải học thêm. |
| C. Tự kiểm tra trong service | Không thêm thư viện. | Lặp code, mỗi người một kiểu, dễ sót. |

### 2. Log và mã request

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| **A. `nestjs-pino` (pino)** | Log dạng JSON, tự gắn mã request cho mọi dòng log của request đó, có `redact` để che header nhạy cảm. Cài đặt ngắn. | Thêm 3 thư viện. |
| B. `Logger` có sẵn của NestJS + middleware tự viết | Không thêm thư viện. | Phải tự viết cách truyền mã request qua các lớp, log là chuỗi văn bản khó lọc. |

### 3. Cấu hình

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| **A. `@nestjs/config` (`ConfigModule`) kèm schema kiểm tra khi khởi động** | Thiếu biến là dừng ngay và báo tên biến; mọi nơi đọc cấu hình qua một chỗ. | Phải viết schema một lần. |
| B. Đọc thẳng `process.env` rải rác | Nhanh nhất lúc đầu. | Thiếu biến chỉ phát hiện khi chạy tới đoạn đó, dễ lỗi trên production. |

## Quyết định

Chọn **A ở cả ba nhóm**. Cụ thể:

**1. Validate input**
- Đăng ký `ValidationPipe` toàn cục với `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`: bỏ và từ chối trường lạ, tự ép kiểu.
- Mỗi endpoint nhận dữ liệu phải có DTO với decorator của `class-validator`. Dữ liệu sai trả **400**.
- `JwtAuthGuard` chạy trước `ValidationPipe` (guard chạy trước pipe trong NestJS), nên request chưa đăng nhập bị 401 trước khi validate.

**2. Định dạng lỗi thống nhất**
- Một `ExceptionFilter` toàn cục biến mọi lỗi thành:
  ```json
  { "statusCode": 400, "error": "Bad Request", "message": ["..."], "requestId": "..." }
  ```
- Các module ném `HttpException` (hoặc lớp con như `BadRequestException`, `ConflictException`), không tự trả response lỗi theo kiểu riêng. Filter giữ nguyên các trường bổ sung mà module đính kèm (ví dụ `canRetry` của TV5 khi thanh toán thất bại).
- Lỗi không lường trước trả **500** với thông báo chung; **không bao giờ** trả stack trace hay câu SQL ra ngoài (chi tiết chỉ ghi vào log).
- Lỗi của Prisma được chuyển về mã HTTP thích hợp (ví dụ trùng khóa unique thành 409).

**3. Logging và mã request**
- Dùng `nestjs-pino`, log dạng JSON, mỗi request có `requestId`.
- Nếu client gửi header `X-Request-Id` hợp lệ thì dùng lại, không thì tự sinh UUID. Response luôn trả header `X-Request-Id`, và lỗi có trường `requestId`.
- Che (`redact`) header `Authorization` và cookie, không ghi body của request. Mật khẩu và token **không bao giờ** xuất hiện trong log.
- Mức log: `info` ở production, `debug` khi chạy local (biến `LOG_LEVEL`).

**4. Cấu hình**
- `ConfigModule.forRoot({ isGlobal: true })` kèm schema kiểm tra khi khởi động. Biến bắt buộc: `DATABASE_URL`, `JWT_SECRET` (tối thiểu 32 ký tự). Có giá trị mặc định: `JWT_EXPIRES_IN` (`1h`), `PORT`, `NODE_ENV`, `LOG_LEVEL`, `CORS_ORIGIN`.
- Thiếu hoặc sai biến thì ứng dụng **dừng ngay** và báo rõ tên biến, không chạy tiếp.
- `.env` nằm trong `.gitignore`; repo chỉ có `.env.example` với giá trị giả. Trên CI và production, secret lấy từ GitHub Secrets và biến môi trường của nền tảng triển khai, không in ra log.
- CORS chỉ cho phép origin trong `CORS_ORIGIN` (không dùng `*` ở production).
- `GET /health` kiểm tra kết nối database (`SELECT 1` qua Prisma): 200 khi ổn, 503 khi mất kết nối.

## Lý do

- Đây là các mặc định chuẩn của NestJS, mọi người đã quen, nên ít tốn thời gian học trong lúc còn nhiều việc phải làm.
- Một chỗ cấu hình thay vì bảy chỗ tự làm giúp lỗi có cùng định dạng, ai cũng dùng được `requestId` để truy log, và giảm rủi ro lộ secret.
- Phát hiện thiếu cấu hình ngay lúc khởi động rẻ hơn nhiều so với phát hiện trên production sau khi deploy.
- `redact` và không ghi body giúp đáp ứng yêu cầu không lưu hay log mật khẩu gốc (`TV7-NFR-01`).

## Hệ quả

**Ưu điểm:**
- Định dạng lỗi, log và cấu hình đồng nhất giữa các module.
- Truy vết một request qua log bằng `requestId`; smoke test sau deploy bằng `/health`.
- Có thể kiểm thử được: gửi payload sai nhận 400 đúng định dạng, thiếu biến thì app không khởi động, log có cùng `requestId`.

**Nhược điểm chấp nhận:**
- Thêm thư viện (`class-validator`, `class-transformer`, `nestjs-pino`, `pino-http`, `pino`, `@nestjs/config`); nếu `nestjs-pino` gây lỗi khi cài thì quay về `Logger` của NestJS cộng middleware mã request.
- `forbidNonWhitelisted` có thể làm request bị từ chối nếu frontend gửi thừa trường; cần thống nhất request mẫu trong `docs/api-contract.md`.
- Mã lỗi 422 của TV5 đã được bổ sung vào bảng mã HTTP chung và mục `POST /payments` trong `docs/api-contract.md`; phần mapping ở code vẫn cần hoàn thiện.

**Việc cần làm theo (cho cả nhóm):**
- **TV1:** khai báo biến môi trường trên CI và nền tảng deploy (đúng danh sách ở mục Quyết định); dùng `/health` cho smoke test và rollback.
- **TV4, TV5, TV6 (và mọi người có endpoint nhận dữ liệu):** viết DTO với decorator `class-validator`; ném `HttpException` thay vì tự trả lỗi; không ghi mật khẩu hay token vào log.
- **TV5:** lỗi thanh toán thất bại (422 kèm `canRetry`) đi qua filter chung; tên mã lỗi `PAYMENT_FAILED` đặt trong nội dung lỗi.
- **TV7:** viết `ValidationPipe`, `ExceptionFilter`, cấu hình `nestjs-pino`, `ConfigModule` và `/health`; viết test kiểm tra `TV7-NFR-04`, `TV7-NFR-05`, `TV7-NFR-06`.

## Khi nào xem lại

Nếu nhóm chuyển sang kiến trúc nhiều dịch vụ, hoặc cần thu thập log tập trung (ví dụ gửi lên dịch vụ giám sát), thì xem lại phần logging; định dạng JSON của pino đã sẵn để làm việc đó.
