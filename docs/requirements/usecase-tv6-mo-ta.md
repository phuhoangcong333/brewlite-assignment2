# Use Case riêng của TV6 — BrewLite Assignment 2

> Đây là sơ đồ **phạm vi TV6** để gửi TV3 tích hợp vào use-case tổng quát. Use-case trọng tâm **“Đặt và thanh toán”** của cả nhóm vẫn do TV4 phụ trách; phần TV6 cung cấp hậu điều kiện trạng thái cho TV4.

## Actor
- **Khách hàng:** xem xác nhận, lịch sử, chi tiết, theo dõi và có thể hủy đơn chưa thanh toán.
- **Nhân viên quầy:** xem đơn cần xử lý và chuyển trạng thái của đơn.

## Danh sách use case

| Mã | Use case | Actor | Điều kiện / Kết quả | Yêu cầu |
|---|---|---|---|---|
| UC-TV6-01 | Xem xác nhận đơn | Khách hàng | Sau thanh toán thành công, xem mã, tổng tiền, trạng thái `PAID`. | FR-TV6-01 |
| UC-TV6-02 | Xem lịch sử đơn | Khách hàng | Có JWT; `GET /orders` chỉ liệt kê đơn của khách. | FR-TV6-02 |
| UC-TV6-03 | Xem chi tiết đơn | Khách hàng | `GET /orders/:id`; không sở hữu đơn thì 404. | FR-TV6-03 |
| UC-TV6-04 | Theo dõi trạng thái | Khách hàng | «include» xem chi tiết đơn; tự làm mới khoảng 8 giây. | FR-TV6-03 |
| UC-TV6-05 | Hủy đơn chưa thanh toán | Khách hàng | Chỉ ở `PENDING` hoặc `PAYMENT_FAILED`; đã thanh toán thì từ chối. | FR-TV6-05 (Should) |
| UC-TV6-06 | Xem đơn cần xử lý | Nhân viên | `GET /orders/staff`; thấy các đơn ở trạng thái cần xử lý. | FR-TV6-07 (Should) |
| UC-TV6-07 | Cập nhật trạng thái | Nhân viên | `PATCH /orders/:id/status`; yêu cầu quyền và thứ tự trạng thái. | FR-TV6-04 |
| UC-TV6-08 | Kiểm tra thứ tự trạng thái | Hệ thống, được UC-TV6-07 «include» | `PAID → PREPARING → READY → COMPLETED`; sai trả 409. | FR-TV6-04 |
| UC-TV6-09 | Kiểm tra quyền nhân viên | Hệ thống, được UC-TV6-07 «include» | Chỉ STAFF/MANAGER; thiếu quyền trả 403. | FR-TV6-04 |
| UC-TV6-10 | Ghi nhận điểm thưởng | Hệ thống, «extend» UC-TV6-07 | Khi `READY → COMPLETED`, tạo tối đa một `LoyaltyTransaction` cho đơn. | FR-TV6-06 (Should) |

## Ví dụ kịch bản UC-TV6-04 — Theo dõi đơn
- **Tiền điều kiện:** Khách đã đăng nhập; đơn tồn tại và thuộc khách.
- **Kích hoạt:** Khách mở chi tiết một đơn từ lịch sử hoặc trang xác nhận.
- **Luồng chính:** UI gọi `GET /orders/:id` → API xác thực và lấy dữ liệu → UI hiển thị trạng thái → tải lại sau 8 giây khi khách còn xem.
- **Luồng thay thế:** Đơn `CANCELLED` hiển thị đã hủy; đơn `COMPLETED` hiển thị hoàn thành; đơn `PAYMENT_FAILED` thông báo thanh toán thất bại.
- **Ngoại lệ:** Chưa đăng nhập `401`; không tìm thấy/không sở hữu đơn `404`.
- **Hậu điều kiện:** Không đổi dữ liệu đơn; khách biết trạng thái mới nhất trong lần tải gần nhất.

## Ví dụ kịch bản UC-TV6-07 — Cập nhật trạng thái
- **Tiền điều kiện:** Nhân viên đã đăng nhập với quyền `STAFF`/`MANAGER`; đơn có trạng thái hợp lệ.
- **Kích hoạt:** Nhân viên chọn trạng thái tiếp theo.
- **Luồng chính:** UI gửi `PATCH /orders/:id/status` → API kiểm tra quyền → kiểm tra trạng thái hiện tại → cập nhật có điều kiện trong transaction → trả thành công.
- **Luồng thay thế:** Chuyển `READY → COMPLETED` thì đồng thời ghi giao dịch điểm thưởng đúng một lần.
- **Ngoại lệ:** Không đăng nhập `401`; không phải nhân viên `403`; chuyển sai thứ tự hoặc xung đột cập nhật `409`.
- **Hậu điều kiện:** Trạng thái mới được lưu; với đơn hoàn thành, điểm thưởng được ghi nhận một lần.

## Lưu ý tích hợp
- Mã `FR-TV6-xx` là mã nội bộ, TV2 sẽ quy đổi thành `FR-xx` trong SRS chung.
- Hệ thống có thêm `PAYMENT_FAILED`, ngoài sáu trạng thái chính được nhắc trong bảng phân công.
- `Xác thực JWT` do TV7 đảm nhiệm; thời điểm cộng điểm cần chốt với TV5 trước khi tích hợp.
- File SVG là bản đồ họa vector tương ứng về nội dung; sơ đồ có thể khác bố cục khi render lại file `.puml` bằng PlantUML.
