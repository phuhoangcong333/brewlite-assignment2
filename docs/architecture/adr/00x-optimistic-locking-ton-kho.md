# ADR 004: Optimistic Locking và Transaction cho Tồn kho

- **Trạng thái:** Đã chấp thuận (Accepted)
- **Phụ trách:** TV4 (Đơn hàng và tồn kho)
- **Liên quan:** 
  - ADR `00x-jwt-luu-token.md` (TV7 - Xác thực JWT trước khi tạo đơn)
  - ADR `003-gia-tinh-o-server.md` (TV3 - Giá tính ở server khi chốt `OrderItem`)

## 1. Bối cảnh (Context)
Trong hệ thống đặt đồ uống **BrewLite**, nhiều khách hàng đã đăng nhập (xác thực qua Bearer JWT token theo ADR của TV7) có thể đặt cùng một món đồ uống vào giờ cao điểm. Nếu hệ thống chỉ đọc số lượng tồn kho (`stock`) ở tầng ứng dụng rồi mới cập nhật trừ kho riêng lẻ mà không có khóa kiểm soát đồng thời, hiện tượng **Race Condition** sẽ xảy ra: hai request cùng đọc thấy `stock = 1`, cùng tạo đơn thành công và làm tồn kho bị âm (`stock = -1`), dẫn đến bán vượt số lượng thực tế (overselling).

## 2. Các phương án đã xem xét (Options Considered)

| Phương án | Cơ chế thực thi | Ưu điểm chính | Nhược điểm chính | Kết luận |
|---|---|---|---|---|
| **1. Check-Then-Act đơn giản** | Đọc `stock` rồi mới `UPDATE` rời | Dễ cài đặt, tốc độ đọc nhanh | Bị Race Condition, gây âm kho | Loại bỏ |
| **2. Pessimistic Locking** | Khóa dòng bằng `SELECT FOR UPDATE` | Chống âm kho tuyệt đối | Giảm hiệu năng, dễ gây Deadlock | Không chọn |
| **3. Optimistic Locking** | Kiểm tra điều kiện trong `$transaction` | Chống âm kho, hiệu năng đọc cao | Phải xử lý trả lỗi `409 Conflict` | **Lựa chọn** |

### Phân tích chi tiết từng phương án:
- **Phương án 1 (Check-Then-Act đơn giản):**
  - *Ưu điểm:* Dễ hiện thực trong code, không tốn chi phí quản lý khóa dữ liệu.
  - *Nhược điểm:* Xảy ra lỗi Race Condition khi nhiều người cùng đặt mua một món sắp hết hàng, dẫn đến bán vượt số lượng tồn kho thực tế (overselling).
- **Phương án 2 (Pessimistic Locking):**
  - *Ưu điểm:* Đảm bảo tính nhất quán dữ liệu cao nhờ khóa cứng dòng sản phẩm ngay khi đọc.
  - *Nhược điểm:* Các giao dịch khác phải xếp hàng chờ giải phóng khóa, làm tăng độ trễ phản hồi API và có nguy cơ xảy ra Deadlock khi giỏ hàng có nhiều món.
- **Phương án 3 (Optimistic Locking kết hợp `$transaction`):**
  - *Ưu điểm:* Cho phép đọc tồn kho tự do không khóa, chỉ kiểm tra điều kiện (`stock >= quantity`) ngay lúc cập nhật trừ kho trong khối `$transaction`, vừa đảm bảo hiệu năng cao vừa chống âm kho tuyệt đối.
  - *Nhược điểm:* Request đến sau khi kho vừa hết sẽ bị rollback transaction và nhận mã lỗi `409 Conflict`, yêu cầu phía Client hiển thị thông báo để người dùng điều chỉnh giỏ hàng.

## 3. Quyết định (Decision)
Chọn **Phương án 3: Áp dụng Optimistic Locking kết hợp Prisma `$transaction`** tại phân hệ `Orders` và `Inventory` (`order.service.ts`, `inventory.service.ts`, `prisma-inventory.repository.ts`):
- **Bước 1 (Phối hợp TV7):** Yêu cầu request `POST /orders` phải đi qua `JwtAuthGuard` để xác thực JWT hợp lệ và trích xuất `userId` tin cậy từ token trước khi mở giao dịch.
- **Bước 2 (Phối hợp TV3):** Tính toán và chốt đơn giá sản phẩm tại thời điểm đặt ở phía server (theo `003-gia-tinh-o-server.md`), không nhận giá từ client gửi lên.
- **Bước 3 (Kiểm tra và trừ kho nguyên tử - TV4):** Thực thi trong một khối giao dịch cơ sở dữ liệu (`$transaction`):
  - Kiểm tra điều kiện tồn kho hiện tại đáp ứng đủ số lượng đặt ($\text{stock} \ge \text{quantity}$).
  - Cập nhật trừ kho có điều kiện. Nếu tại thời điểm cập nhật, bản ghi sản phẩm đã bị giao dịch khác trừ hết làm điều kiện $\text{stock} \ge \text{quantity}$ không còn thỏa mãn, giao dịch lập tức bị **Rollback** toàn bộ và trả về mã lỗi **`409 Conflict`** kèm thông điệp sản phẩm không đủ tồn kho.
  - Chỉ khi trừ kho thành công tất cả các món trong giỏ, hệ thống mới lưu bản ghi `Order` (trạng thái `PENDING`) và các `OrderItem`.
- **Hoàn kho khi hủy đơn (`order-cancel.plan.ts` & `inventory.release.plan`):** Khi đơn hàng chuyển sang trạng thái hủy hợp lệ, hệ thống hoàn trả lại số lượng `stock` tương ứng trong transaction.

## 4. Hệ quả (Consequences)
- **Tích cực:**
  - Ngăn chặn triệt đối tình trạng âm kho (overselling) khi có nhiều request đặt hàng đồng thời.
  - Không giữ khóa đọc lâu trên bảng `Product`, giúp API xem menu của TV1/TV2 và giỏ hàng của TV3 luôn phản hồi nhanh.
  - Đảm bảo tính nguyên tử: không bao giờ có đơn hàng `PENDING` được tạo ra mà chưa trừ kho, hoặc trừ kho rồi nhưng lỗi tạo đơn.
- **Đánh đổi (Trade-offs):**
  - Khi xảy ra tranh chấp vào món hàng cuối cùng trong kho, request đến sau sẽ nhận lỗi `409 Conflict` và phía Frontend (`checkout/page.tsx`) cần hiển thị thông báo rõ ràng để khách hàng điều chỉnh lại giỏ hàng.