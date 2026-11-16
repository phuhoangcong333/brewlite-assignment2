# ADR-00X: Giá tính ở server (báo giá) thay vì tin client

- **Trạng thái:** Đề xuất (chờ nhóm xác nhận)
- **Ngày:** 08/11/2026
- **Người viết:** TV3
- **Liên quan:** `POST /promotions/validate` (TV3), `POST /orders` (TV4), `POST /payments` (TV5), `GET /products/:id` (TV2)


## 1. Bối cảnh

Giỏ hàng của BrewLite được lưu ở trình duyệt (localStorage) để giữ giỏ khi tải lại trang và không cần đăng nhập. Dữ liệu trong localStorage do người dùng sửa được. Trong khi đó, tổng tiền ảnh hưởng trực tiếp đến đơn hàng và thanh toán:

- giá món, phụ thu size và giá topping có thể đổi sau khi khách đã thêm vào giỏ;
- món hoặc topping có thể hết hàng;
- mã khuyến mãi có hạn dùng, giá trị đơn tối thiểu và có thể giới hạn lượt dùng;
- đơn hàng phải lưu giá tại thời điểm đặt (TV4) và thanh toán phải kiểm tra số tiền khớp với đơn (TV5).

Nếu client tự tính và gửi giá lên, khách có thể sửa giá hoặc dùng giá cũ để đặt đơn sai giá.

## 2. Quyết định

**Server là nơi duy nhất tính giá. Client chỉ hiển thị và không bao giờ là nguồn của giá.**

1. Client chỉ gửi `productId`, `sizeId`, `toppingIds`, `quantity`, `note` và `promotionCode`. Mọi trường giá do client gửi đều không được dùng để tính. Riêng `clientUnitPrice` là tùy chọn và chỉ dùng để phát hiện giá đã đổi (cờ `priceChanged`).
2. Giỏ hàng gọi `POST /promotions/validate` để lấy **báo giá**: đơn giá từng dòng, `subtotal`, `discount`, `total`, trạng thái từng dòng (`AVAILABLE`, `OUT_OF_STOCK`, ...) và kết quả mã khuyến mãi. Endpoint này chỉ đọc, không trừ kho và không tăng `usedCount`.
3. `POST /orders` **tính lại giá từ dữ liệu hiện tại trong cơ sở dữ liệu** bên trong transaction tạo đơn, không dùng kết quả báo giá trước đó. Giá từng dòng và số tiền giảm được lưu vào đơn tại thời điểm đặt. `usedCount` của mã chỉ tăng khi đơn tạo thành công.
4. `POST /payments` so sánh số tiền thanh toán với `total` đã lưu của đơn, không dùng số tiền do client tự tính.
5. Quy tắc tính dùng chung một hàm ở backend (không viết hai lần ở `validate` và `orders`):
   - đơn giá dòng = giá cơ bản + phụ thu size + tổng giá topping; thành tiền = đơn giá × số lượng;
   - `subtotal` chỉ gồm các dòng `AVAILABLE`;
   - giảm giá `PERCENT` = làm tròn xuống, không vượt mức giảm tối đa của mã; `FIXED_AMOUNT` = số tiền cố định; giảm giá không vượt `subtotal`;
   - tiền tệ là VNĐ, số nguyên.

## 3. Các phương án đã xem xét

| Phương án | Ưu điểm | Nhược điểm | Kết luận |
|---|---|---|---|
| A. Client tự tính, gửi giá lên, server tin | Nhanh, ít gọi API | Dễ bị sửa giá; giá cũ vẫn đặt được | Loại |
| B. Client tính, server kiểm lại và từ chối nếu lệch | Giảm số lần gọi API | Phải giữ hai bản logic tính giá; lệch nhỏ cũng gây lỗi khó hiểu cho khách | Loại |
| **C. Server tính, client chỉ hiển thị** | Một nguồn sự thật; không tin dữ liệu client; đổi giá hoặc mã có hiệu lực ngay | Mỗi lần giỏ đổi phải gọi API; cần xử lý lỗi mạng | **Chọn** |

## 4. Hệ quả

**Lợi ích**
- Không thể gian lận giá qua localStorage hoặc công cụ dev của trình duyệt.
- Giá, tồn kho và mã khuyến mãi luôn khớp dữ liệu mới nhất.
- Chỉ có một nơi chứa quy tắc tính giá, dễ kiểm thử bằng unit test.

**Đánh đổi và rủi ro**
- Mỗi lần thêm, sửa, xóa món hoặc nhập mã đều gọi API. Cần giữ phản hồi nhanh (mục tiêu: dưới 500 ms với giỏ 5 dòng) và hiển thị trạng thái "đang tính".
- Khi mất mạng hoặc API lỗi, giao diện không hiển thị được tổng đáng tin cậy: hiện thông báo lỗi, có nút "Thử lại" và khóa nút "Đặt đơn" cho đến khi báo giá thành công.
- Giá có thể đổi giữa lúc báo giá và lúc đặt đơn. Khi đó đơn được tạo theo giá tại thời điểm đặt; response `POST /orders` trả `total` thực tế để giao diện thông báo cho khách.
- Giao diện phải xử lý trạng thái từng dòng và lý do mã không hợp lệ do server trả về.

## 5. Việc cần phối hợp

- **TV4:** `items[]` của `POST /orders` dùng cùng cấu trúc với `POST /promotions/validate`; tính lại giá trong transaction; lưu giá và số tiền giảm tại thời điểm đặt; tăng `usedCount` khi đơn thành công.
- **TV5:** kiểm tra số tiền thanh toán theo `total` của đơn.
- **TV2:** cung cấp dữ liệu giá cơ bản, phụ thu size, giá topping và trạng thái hết hàng cho hàm tính giá.
- **TV7:** ghi quyết định này vào mô tả kiến trúc (đoạn "Giá và khuyến mãi") và hợp đồng API.
