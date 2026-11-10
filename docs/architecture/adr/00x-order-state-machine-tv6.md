# ADR-00x: Quản lý vòng đời đơn hàng bằng State Machine

- **Trạng thái ADR:** Đề xuất để TV7 review (quy tắc chuyển trạng thái đã được TV7 thống nhất ở Class Diagram v3).
- **Ngày:** 10/11/2026
- **Người viết:** TV6 – Theo dõi đơn và điểm thưởng
- **Task:** 3.1 – Thiết kế kiến trúc
- **Liên quan:** `FR-34`–`FR-39`, `docs/diagrams/activity-theo-doi-don.puml`, `docs/diagrams/class-diagram.puml`, `backend/src/orders/order-state.ts`, `backend/src/orders/order.service.ts`.

> **Quy ước đặt tên:** `00x` là số tạm theo thư mục ADR của nhóm trong bản `dev(2)`. TV7 cần xác nhận số ADR chính thức trước khi merge.
>
> **Phạm vi:** Tài liệu mô tả quyết định thiết kế đích, **không khẳng định rằng mọi thay đổi đã được cài đặt và kiểm thử** trên nhánh `dev`.

## 1. Bối cảnh (Context)

BrewLite cho phép khách đặt đồ uống, thanh toán mô phỏng, xem tiến độ và nhân viên quầy cập nhật tình trạng đơn hàng. Một đơn đi qua các trạng thái như chờ thanh toán, đã thanh toán, đang pha chế, sẵn sàng, hoàn thành hoặc hủy. Thanh toán thất bại cũng phải có trạng thái riêng để khách thử lại.

Nếu API cho phép cập nhật `Order.status` tùy ý, nhân viên có thể bỏ qua công đoạn pha chế; yêu cầu thanh toán gửi lại có thể làm trạng thái sai; nhiều request đồng thời có thể gây cập nhật chồng chéo. Điểm thưởng cũng có nguy cơ cộng hai lần khi một yêu cầu hoàn thành được gửi lại. Nhiệm vụ TV6 còn yêu cầu theo dõi đơn, API cập nhật trạng thái có phân quyền và ghi nhận điểm khi đơn hoàn thành (FR-35–FR-39).

Kiến trúc nhóm sử dụng Next.js (frontend), NestJS (backend), PostgreSQL với Prisma; việc bảo vệ API thực hiện thông qua JWT và phân quyền `CUSTOMER`/`STAFF` theo ADR xác thực của TV7.

## 2. Các phương án cân nhắc (Alternatives)

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| **A. Ghi trực tiếp trạng thái do client gửi** | Ít code, thực hiện nhanh | Có thể nhảy bước, sai vai trò, khó kiểm thử và dễ gây sai dữ liệu |
| **B. State Machine bằng bảng chuyển trạng thái ở NestJS** (**chọn**) | Quy tắc rõ ràng, có thể unit test; đồng bộ UI/API; phù hợp MVP | Phải bảo trì bảng quy tắc, kiểm tra quyền và xử lý cạnh tranh trong DB |
| **C. Thư viện workflow/state machine chuyên dụng** | Hỗ trợ quy trình phức tạp và sự kiện dài hạn | Thêm dependency, cấu hình và độ phức tạp không cần thiết cho 7 trạng thái của MVP |

## 3. Quyết định (Decision)

### 3.1. Các trạng thái và chuyển đổi hợp lệ

Sử dụng `OrderStatus` gồm: `PENDING`, `PAYMENT_FAILED`, `PAID`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`.

| Trạng thái hiện tại | Cho phép chuyển đến | Thành phần khởi phát |
|---|---|---|
| `PENDING` | `PAID`, `PAYMENT_FAILED`, `CANCELLED` | TV5 (thanh toán); TV4 (hủy đơn) |
| `PAYMENT_FAILED` | `PENDING`, `CANCELLED` | TV5 (bắt đầu retry); TV4 (hủy đơn) |
| `PAID` | `PREPARING` | TV6 – nhân viên quầy |
| `PREPARING` | `READY` | TV6 – nhân viên quầy |
| `READY` | `COMPLETED` | TV6 – nhân viên quầy |
| `COMPLETED` | Không | Trạng thái kết thúc |
| `CANCELLED` | Không | Trạng thái kết thúc |

**Đã chốt theo Class Diagram v3:** Không cho phép `PAID → CANCELLED`, kể cả với nghiệp vụ hủy; không được bỏ qua `PREPARING` hoặc `READY`. Nếu luồng hoàn tiền/hủy đơn đã trả tiền được bổ sung sau này, cần một ADR/quyết định nghiệp vụ mới, không tự ý mở chuyển trạng thái này.

**Thanh toán lại:** TV5 có thể nhận `POST /payments` với đơn `PENDING` hoặc `PAYMENT_FAILED`. Khi retry từ `PAYMENT_FAILED`, trạng thái trung gian quay về `PENDING` trước khi nhận kết quả thanh toán mới (`PAID` hoặc `PAYMENT_FAILED`). Một `Order` có thể có **0..*** `Payment`; `Payment.orderId` không đặt `unique` theo quyết định v3.

### 3.2. Vị trí áp dụng quy tắc và kiểm soát quyền

- Tập trung bảng chuyển trạng thái và hàm `canTransition()` / `assertTransition()` tại `backend/src/orders/order-state.ts` (NestJS); frontend chỉ hiển thị lựa chọn hợp lệ, không phải nơi quyết định cuối cùng.
- `PATCH /orders/:id/status` chỉ dành cho `STAFF` (JWT hợp lệ); nhân viên chỉ thực hiện các chuyển đổi vận hành: `PAID → PREPARING → READY → COMPLETED`. Token thiếu/hết hạn trả `401`, role `CUSTOMER` trả `403`.
- TV5 chịu trách nhiệm cập nhật trạng thái thanh toán; TV4 chịu trách nhiệm hủy hợp lệ. Khách không thể tự gán trạng thái bất kỳ qua API nhân viên.
- Chuyển trạng thái không hợp lệ trả `409 Conflict`, giữ nguyên trạng thái đã lưu.

### 3.3. Nhất quán dữ liệu và xử lý đồng thời

Thay đổi trạng thái được xử lý trong **Prisma database transaction**; kiểm tra chuyển hợp lệ từ trạng thái hiện tại rồi cập nhật có điều kiện (`WHERE id = ... AND status = from`, ví dụ `updateMany`). Nếu trạng thái đã bị request khác thay đổi, từ chối `409` thay vì ghi đè. Các thay đổi đi kèm (ví dụ hoàn kho khi hủy) phải cùng transaction để lỗi sẽ rollback.

### 3.4. Ghi nhận điểm thưởng khi đơn hoàn thành

Theo FR-39, **chỉ khi đơn chuyển `READY → COMPLETED`**, ghi một `LoyaltyTransaction` gắn với `User` và `Order`, gồm:

| Thuộc tính | Kiểu dự kiến | Ý nghĩa |
|---|---|---|
| `id` | `Int` | Khóa chính |
| `userId` | `Int` | Khách nhận điểm |
| `orderId` | `Int` | Đơn phát sinh điểm; đặt `@unique` để chống cộng trùng |
| `points` | `Int` | Điểm được cộng |
| `createdAt` | `DateTime` | Thời điểm ghi nhận |

- Quy tắc: `points = floor(order.total / 10000)` với `order.total` là **số tiền thực trả sau giảm giá** (VNĐ); không tính điểm cho đơn chưa hoàn thành hoặc đã hủy.
- Cập nhật `Order.status`, tạo `LoyaltyTransaction` và tăng `User.loyaltyPoints` **trong cùng transaction**, đảm bảo một đơn chỉ được ghi nhận tối đa một lần. Nếu xung đột `orderId` duy nhất hoặc cập nhật trạng thái thất bại, rollback toàn bộ và báo lỗi phù hợp.
- Không cộng điểm trong `POST /payments`; TV5 cần bỏ phần cộng điểm tại thời điểm `PAID` khi tích hợp Task 5. Đây là điều kiện triển khai, **chưa được xác nhận đã hoàn thành trên nguồn `dev(2)`**.

## 4. Lý do lựa chọn (Rationale)

- Bảng chuyển trạng thái tường minh đủ đơn giản để kiểm tra thủ công và viết unit test, không cần đưa thêm workflow engine.
- Đặt kiểm soát tại backend ngăn việc client gọi API để vượt quy trình hay thay đổi trạng thái trái phép.
- Cập nhật có điều kiện và transaction bảo vệ tính nhất quán khi nhân viên thao tác đồng thời hoặc khi trình duyệt gửi lại request.
- Bản ghi điểm có quan hệ với đơn giúp đối soát, còn ràng buộc duy nhất trên `orderId` là lớp bảo vệ thứ hai chống cộng trùng.
- Tách trách nhiệm TV4 (đặt/hủy), TV5 (thanh toán), TV6 (vận hành và tích điểm) giúp ít xung đột code trong dự án nhóm.

## 5. Hệ quả và đánh đổi (Consequences / Trade-offs)

**Lợi ích:** Quy trình nhất quán, dễ kiểm thử 7 trạng thái, ngăn nhảy bước và cộng điểm trùng; khách thấy trạng thái chính xác qua `GET /orders/:id` (giao diện polling 5–10 giây).

**Chi phí/hạn chế:** Khi đổi nghiệp vụ phải cập nhật `validTransitions`, UI, SRS, Activity/Class Diagram và test; polling tạo thêm request; bảng `LoyaltyTransaction` cần migration và sự thống nhất của TV7. Retry thanh toán phải phối hợp chặt với idempotency của TV5 để tránh tạo kết quả sai.

**Không giải quyết trong ADR này:** Cổng thanh toán thật, hoàn tiền tự động, cơ chế sự kiện/queue phân tán, thưởng điểm theo nhiều cấp độ.

## 6. Tác động lên mã nguồn và kế hoạch kiểm thử

| Tạo phẩm / file | Yêu cầu thực hiện |
|---|---|
| `backend/src/orders/order-state.ts` | Duy trì bảng `validTransitions`, đặc biệt cấm `PAID → CANCELLED` |
| `backend/src/orders/order.service.ts` | Chỉ cập nhật qua transaction; khi `READY → COMPLETED` ghi điểm một lần |
| `backend/prisma/schema.prisma` + migration | Thêm `LoyaltyTransaction` và quan hệ `User (1) – (0..*) LoyaltyTransaction`, `Order (1) – (0..1) LoyaltyTransaction` |
| `backend/src/payments/payments.service.ts` (TV5) | Không cộng điểm ở `PAID`; retry `PAYMENT_FAILED` thống nhất thứ tự trạng thái |
| `backend/src/orders/order-state.spec.ts` | Test từng chuyển đổi hợp lệ/không hợp lệ; đặc biệt `PAID → CANCELLED` phải bị từ chối |
| Integration test | Khách `PATCH` nhận 403; chuyển sai nhận 409; hoàn thành ghi điểm đúng một lần, request trùng không cộng thêm |
| `docs/srs.md` (TV2) | Chỉnh mô tả cũ vẫn cho phép `PAID → CANCELLED` để khớp Class Diagram v3 |

**Tiêu chí xác nhận quyết định đã triển khai:** Unit test bảng trạng thái pass; migration chạy; tích điểm và đổi trạng thái trong cùng transaction; integration test đảm bảo một đơn không cộng điểm hai lần; sơ đồ và API Contract khớp với bản code cuối.

## 7. Các điểm cần phối hợp trước khi merge

1. **TV7:** Chốt số ADR chính thức (thay `00x`), duyệt nội dung và ghép đoạn kiến trúc TV6 vào `architecture.md`.
2. **TV2/TV4:** Sửa các chỗ SRS còn ghi `PAID → CANCELLED` theo quyết định Class Diagram v3.
3. **TV5:** Chuyển việc cộng điểm từ lúc thanh toán sang lúc hoàn thành, xác nhận retry thanh toán; đảm bảo một Order có thể có nhiều Payment.
4. **TV6:** Đối chiếu code và test với ADR sau khi rebase từ `dev` mới nhất.

## 8. Tài liệu đối chiếu

- BrewLite Assignment 2 – Task 3.1, Task 2.1–2.3, Task 5.1–5.2.
- Bảng phân công TV6 (luồng Theo dõi đơn, điểm thưởng, E2E).
- `docs/srs.md` (FR-34 đến FR-39).
- `docs/diagrams/activity-theo-doi-don.puml` (TV6, PR #10 đã merge).
- `docs/diagrams/class-diagram.puml` (Class Diagram v3 do TV7 chốt).
- `backend/src/orders/order-state.ts` (bảng chuyển trạng thái đang có trong ZIP `dev(2)`).
