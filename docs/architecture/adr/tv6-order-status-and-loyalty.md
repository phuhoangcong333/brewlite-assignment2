# TV6 – Trạng thái đơn và điểm thưởng (đoạn đóng góp cho `architecture.md`)

> **Người phụ trách:** TV6 | **Task:** 3.1. Đây là **đoạn nội dung để TV7 tổng hợp**, không phải bản `architecture.md` chung. Phần mô tả là thiết kế mong muốn theo Class Diagram v3, có ghi rõ chỗ cần tích hợp Task 5.

## Trạng thái đơn và điểm thưởng

Luồng Theo dõi đơn của BrewLite được triển khai theo kiến trúc phân lớp. Khách hàng hoặc nhân viên thao tác trên giao diện **Next.js/PWA**; frontend gọi API **NestJS** và không truy cập trực tiếp **PostgreSQL**. Dữ liệu đơn hàng do `OrderService` và Prisma quản lý. Các API của TV6 gồm `GET /orders` (lịch sử của khách), `GET /orders/:id` (chi tiết/trạng thái) và `PATCH /orders/:id/status` (nhân viên chuyển trạng thái). Người dùng phải gửi JWT theo header `Authorization: Bearer <accessToken>`; backend kiểm tra token và role trước khi truy vấn hoặc chỉnh sửa. `CUSTOMER` chỉ được truy cập đơn thuộc tài khoản mình; chỉ `STAFF` được cập nhật tiến độ phục vụ.

Hệ thống sử dụng **State Machine** tại tầng nghiệp vụ NestJS để kiểm soát vòng đời `Order`: `PENDING`, `PAYMENT_FAILED`, `PAID`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`. Luồng chính là `PENDING → PAID → PREPARING → READY → COMPLETED`. Khi thanh toán lỗi, TV5 chuyển đơn sang `PAYMENT_FAILED`; khi khách thử thanh toán lại, luồng thanh toán đưa đơn về `PENDING` trước khi xử lý kết quả mới. Việc hủy do TV4 thực hiện từ `PENDING` hoặc `PAYMENT_FAILED`, **không cho `PAID → CANCELLED`** theo quyết định Class Diagram v3. Nhân viên chỉ thao tác `PAID → PREPARING → READY → COMPLETED`. `COMPLETED` và `CANCELLED` là trạng thái kết thúc. Backend từ chối chuyển trạng thái sai bằng `409 Conflict`.

Để đảm bảo nhất quán khi nhiều request đến đồng thời, NestJS kiểm tra chuyển trạng thái hợp lệ rồi cập nhật có điều kiện trong **Prisma transaction** (chỉ đổi nếu trạng thái hiện tại vẫn khớp với trạng thái đã đọc). Khi đơn đạt `READY → COMPLETED`, hệ thống dự kiến đồng thời cập nhật trạng thái, tạo một bản ghi `LoyaltyTransaction` và tăng `User.loyaltyPoints`. Điểm thưởng tính theo `floor(order.total / 10000)`, với `order.total` là tổng tiền khách thực trả sau giảm giá. Mỗi `orderId` chỉ được có tối đa một giao dịch điểm, nhờ ràng buộc duy nhất và transaction; các request lặp lại không được làm tăng điểm lần nữa. Phần hiện thực `LoyaltyTransaction`/migration và việc bỏ cộng điểm trong thanh toán của TV5 cần được kiểm tra khi tích hợp Task 5; bản ZIP `dev(2)` chưa hoàn tất cơ chế này.

Sau khi tạo đơn, khách xem lịch sử hoặc chi tiết tại trang Next.js; trang theo dõi gọi lại `GET /orders/:id` mỗi **5–10 giây** để cập nhật trạng thái mà không cần WebSocket. Cách polling này đơn giản, phù hợp MVP nhưng tăng số request so với cập nhật theo sự kiện. Quy tắc nghiệp vụ tập trung ở backend để frontend không thể tự ý thay đổi vòng đời đơn hàng.

### Thành phần và trách nhiệm

| Thành phần | Trách nhiệm chính |
|---|---|
| Next.js/PWA – trang lịch sử/chi tiết đơn | Gửi JWT, hiển thị danh sách và trạng thái, polling 5–10 giây |
| Next.js/PWA – trang nhân viên | Hiển thị đơn cần xử lý, gửi trạng thái đích hợp lệ |
| NestJS `OrdersController` | Định tuyến API, yêu cầu JWT, phân quyền STAFF cho PATCH |
| NestJS `OrderService` + `order-state.ts` | Kiểm tra quyền sở hữu, `validTransitions`, xử lý transaction và chống cập nhật đồng thời |
| Prisma + PostgreSQL | Lưu `Order`, `OrderItem`, `User` và `LoyaltyTransaction` (model/migration cần hoàn thiện ở Task 5) |
| Payment Service – TV5 | Thanh toán, retry `PAYMENT_FAILED`, không cộng điểm trước hoàn thành |

### Liên kết thiết kế và kiểm thử

- **FR-34–FR-39:** Xác nhận, lịch sử, xem chi tiết, theo dõi, đổi trạng thái và tích điểm.
- **Sơ đồ:** `docs/diagrams/activity-theo-doi-don.puml` và `docs/diagrams/class-diagram.puml`.
- **ADR:** `docs/architecture/adr/00x-order-state-machine-tv6.md` (đổi tên số ADR theo quyết định TV7).
- **Kiểm thử:** trạng thái hợp lệ/không hợp lệ; lỗi JWT 401/403; đơn không thuộc chủ sở hữu 404; retry payment; cập nhật đồng thời; hoàn thành đơn không cộng điểm trùng; Playwright E2E từ menu đến xác nhận và theo dõi đơn.

### Lưu ý khi TV7 tổng hợp

- Không sửa trực tiếp `architecture.md` nếu TV7 đang giữ file; TV7 có thể ghép phần trên vào mục **“Trạng thái đơn và điểm thưởng”**.
- Trong SRS `dev(2)` còn mô tả `PAID → CANCELLED`; cần sửa bởi TV2/TV4 để tránh mâu thuẫn với Class Diagram v3.
- Không coi phần tính điểm/transaction là đã chạy thành công cho đến khi có migration và kết quả integration test trên `dev` mới nhất.
