# ADR-00x: Xử lý chống trùng lặp thanh toán bằng Idempotency-Key

- **Trạng thái:** Đề xuất, chờ nhóm duyệt (Task 3.1)
- **Ngày:** 06/11/2026
- **Người viết:** TV5 (Thanh toán)
- **Người duyệt:** TV7 (Kiến trúc & Nền tảng)
- **Liên quan:** `docs/api-contract.md`, `TV5-FR-02`, `TV5-NFR-01`, `TV5-BR-02`, bảng `Payment`

---

## Bối cảnh

Trong hệ thống đặt đồ uống BrewLite, thao tác thanh toán (`POST /payments`) là giao dịch tài chính quan trọng. Người dùng có thể vô tình nhấn nút "Xác nhận thanh toán" nhiều lần, hoặc kết nối mạng chập chờn khiến client tự động gửi lại request (retry) trong khi server đã trừ tiền hoặc ghi nhận giao dịch trước đó.

Nếu backend không có cơ chế kiểm soát, việc này sẽ dẫn đến:
1. Giao dịch bị thực thi nhiều lần (duplicate payment), gây trừ tiền lặp.
2. Xung đột trạng thái đơn hàng và sai lệch dữ liệu tài chính.

**Vấn đề cần quyết định:** Cơ chế đảm bảo tính Idempotent (gửi nhiều lần cùng một yêu cầu thì kết quả xử lý và trạng thái hệ thống vẫn không đổi) cho API thanh toán được thiết kế như thế nào?

---

## Các phương án đã cân nhắc

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| **A. Client sinh `Idempotency-Key` (UUIDv4) + Lưu trực tiếp vào bảng `Payment` (PostgreSQL)** | - Tận dụng cơ sở dữ liệu PostgreSQL sẵn có, không cần cài thêm hạ tầng.<br>- Ràng buộc `UNIQUE` trên cột `idempotencyKey` đảm bảo tính toàn vẹn cấp cơ sở dữ liệu (chống race condition tuyệt đối).<br>- Lưu vết lịch sử giao dịch bền vững (audit log). | Kích thước bảng `Payment` tăng dần theo thời gian (nhưng trong phạm vi đồ án số lượng giao dịch vừa phải nên không ảnh hưởng). |
| **B. Dùng bộ nhớ tạm Redis lưu Idempotency-Key (TTL 15-30 phút)** | - Phản hồi cực nhanh khi kiểm tra key.<br>- Key tự động hết hạn, không tốn dung lượng database chính. | - Phải thêm service Redis vào `docker-compose.yml`, tăng độ phức tạp khi deploy và tốn RAM trên VPS miễn phí.<br>- Mất dữ liệu khi Redis restart nếu không cấu hình lưu trữ bền vững. |
| **C. Khóa theo `orderId` kết hợp trạng thái đơn (Pessimistic / Row Lock)** | - Không cần client sinh khóa riêng. | - Khó phân biệt giữa "client retry do mất mạng" và "khách hàng chủ động thanh toán lại sau khi đổi thẻ".<br>- Dễ gây nghẽn kết nối DB nếu thời gian gọi gateway kéo dài. |

---

## Quyết định

Chọn **phương án A: Client sinh `Idempotency-Key` dạng UUIDv4 và Backend lưu trữ ràng buộc `UNIQUE` trong bảng `Payment` trên PostgreSQL.**

### Quy trình thực hiện cụ thể:

1. **Client (Next.js):**
   - Khi người dùng nhấn "Xác nhận thanh toán", client tạo một chuỗi UUIDv4 ngẫu nhiên làm `Idempotency-Key`.
   - Gắn khóa này vào header của request: `Idempotency-Key: <UUID>`.
   - Nếu bị timeout hoặc mạng gián đoạn, client retry gửi lại đúng header `Idempotency-Key` đó.

2. **Backend (NestJS API):**
   - Bắt buộc kiểm tra header `Idempotency-Key`. Nếu thiếu, trả về `400 Bad Request`.
   - **Tra cứu giao dịch cũ:** Truy vấn bảng `Payment` theo `idempotencyKey`.
     - *Nếu key đã tồn tại:*
      + Kiểm tra quyền sở hữu (`Payment.order.userId == currentUserId`). Nếu khác người dùng, không tiết lộ bản ghi và trả `404 Not Found`; nếu key dùng cho đơn khác của cùng người dùng, trả `409 Conflict`.
      + Nếu đúng request, replay kết quả đã lưu; thành công là `200`, còn payment thất bại phải giữ mã `422`; **tuyệt đối không gọi cổng mock và không tạo payment mới**.
     - *Nếu key chưa tồn tại:*
       + Tiến hành gọi cổng thanh toán mô phỏng (`MockPaymentGatewayService`).
       + Mở database transaction: Lưu bản ghi `Payment` mới (chứa `idempotencyKey`), cập nhật trạng thái `Order` (`PAID` hoặc `PAYMENT_FAILED`).
      + Ràng buộc `UNIQUE(idempotencyKey)` kết hợp transaction Serializable và xử lý P2002/P2034 bảo đảm không tạo hai Payment; request thua race phải replay kết quả đã commit hoặc nhận 409 khi xung đột với key khác.

    3. **Định dạng key:** Hợp đồng yêu cầu UUIDv4. Code hiện tại mới kiểm tra key không rỗng và dài tối đa 200 ký tự; cần bổ sung validation UUIDv4. Frontend đang dùng `crypto.randomUUID()`, nên production phải chạy HTTPS (hoặc dùng thư viện UUID).

---

## Lý do chọn

1. **Phù hợp với kiến trúc tối giản của đồ án:** Dự án đã có sẵn PostgreSQL; không cần đưa thêm Redis vào làm nặng docker-compose và phức tạp quy trình CI/CD/Deploy của TV1.
2. **Đảm bảo tính ACID và toàn vẹn dữ liệu:** Cơ chế unique constraint của PostgreSQL xử lý tranh chấp đồng thời (concurrency) rất tốt và an toàn.
3. **Dễ kiểm thử:** Có thể viết integration test tự động (bắn 5 request đồng thời cùng 1 key để chứng minh chỉ có 1 giao dịch được tạo).

---

## Hệ quả & Rủi ro

- **Ưu điểm:**
  - Ngăn ngừa 100% duplicate charge.
  - Khách hàng bấm đúp nút thanh toán vẫn nhận kết quả mượt mà không bị lỗi hệ thống.
  - Dễ truy vết lỗi trong quá trình bảo vệ đồ án.

- **Nhược điểm & Cách xử lý:**
  - Khách hàng bấm "Thử lại" sau khi thanh toán thất bại: Client **phải sinh một `Idempotency-Key` mới** cho lần thanh toán tiếp theo để tránh bị trả về kết quả thất bại cũ. (Đã quy định rõ trong `docs/api-contract.md`).

---

## Phân công thực hiện

- **TV5:** Hiện thực logic kiểm tra key trong `PaymentService` và thêm constraint `@unique` vào `Payment.idempotencyKey` trong `schema.prisma`.
- **TV5 (Frontend):** Viết logic sinh UUID ở trang checkout Next.js trước khi gọi API.
