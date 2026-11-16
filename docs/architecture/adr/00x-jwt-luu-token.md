# ADR-00x: Lưu JWT ở localStorage và gửi bằng header Bearer

- **Trạng thái:** Đề xuất, chờ nhóm phản hồi đến hết ngày 06/11/2026; sau đó chuyển thành Đã chốt.
- **Ngày:** 05/11/2026
- **Người viết:** TV7 (xác thực và nền tảng chung)
- **Liên quan:** `docs/api-contract.md`, `TV7-FR-02`, `TV7-FR-03`, `TV7-FR-06`, `TV7-NFR-02`, `TV7-NFR-08`

## Bối cảnh

BrewLite có frontend Next.js (PWA) và backend NestJS tách riêng. Người dùng đăng nhập bằng `POST /auth/login` và nhận JWT chứa mã người dùng (`sub`), vai trò (`role`: `CUSTOMER` hoặc `STAFF`) và thời điểm hết hạn (`exp`). Các API cần đăng nhập (ví dụ `POST /orders`, `PATCH /orders/:id/status`) phải nhận được JWT này ở mọi request.

Cần quyết định: **JWT được lưu ở đâu ở phía client và gửi lên server bằng cách nào?** Quyết định này ảnh hưởng đến cách frontend gọi API của cả nhóm, cấu hình CORS, cách kiểm thử và cách triển khai.

Ràng buộc của dự án: còn hơn hai tuần, có CI/CD, một E2E test và triển khai production qua HTTPS; dữ liệu là đồ uống và thanh toán mô phỏng.

## Các phương án đã cân nhắc

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| **A. localStorage + header `Authorization: Bearer`** | Đơn giản, frontend và backend tách riêng vẫn chạy ngay, không cần cấu hình cookie hay CORS có credentials. Tải lại trang vẫn còn đăng nhập. Dễ test API (chỉ cần gắn header). Khớp với `api-contract.md` và điều kiện JWT đã gửi TV4. | Nếu trang bị XSS, mã độc đọc được token và mang đi dùng ở nơi khác. Chặn route chỉ làm được ở phía client (auth context), không chặn ở server của Next.js. |
| **B. Cookie httpOnly** | JavaScript không đọc được token nên XSS không lấy cắp được token mang đi. Next.js chặn được route ở phía server. | Phải cấu hình CORS có credentials, cờ cookie (`SameSite`, `Secure`), chống CSRF; web và API phải cùng site; cần thêm `GET /auth/me` và `POST /auth/logout`; mọi luồng phải gọi API với `credentials: 'include'`. Không kịp với thời gian còn lại. |
| **C. Token trong bộ nhớ (React state) + refresh token** | Token không nằm trong storage. | Tải lại trang là mất đăng nhập nếu không làm thêm refresh token (thêm endpoint, bảng lưu, xoay vòng token). Quá nặng cho dự án. |
| **D. sessionStorage + header Bearer** | Token mất khi đóng tab. | Vẫn bị XSS như A, lại bất tiện: mở tab mới phải đăng nhập lại. |

## Quyết định

Chọn **phương án A: lưu JWT ở localStorage và gửi bằng header `Authorization: Bearer <token>`**.

Cấu hình cụ thể:

1. **Đăng nhập:** `POST /auth/login` trả `accessToken` và thông tin người dùng trong nội dung response. Frontend lưu `accessToken` ở localStorage và cập nhật auth context.
2. **Gọi API:** mọi request cần đăng nhập gắn header `Authorization: Bearer <accessToken>`.
3. **Guard:** `JwtAuthGuard` kiểm tra chữ ký và hạn; `RolesGuard` kiểm tra vai trò. Token thiếu, sai hoặc hết hạn trả 401; sai vai trò trả 403. Các luồng khác chỉ cần gắn guard, không tự đọc token.
4. **Thời hạn:** JWT sống 1 giờ, không dùng refresh token.
5. **Hết hạn:** khi API trả 401, frontend xóa token ở localStorage, báo phiên hết hạn và chuyển sang trang đăng nhập (`TV7-FR-06`).
6. **Đăng xuất:** frontend xóa token ở localStorage (`TV7-FR-08`); không cần endpoint ở server.
7. **Chặn route:** làm ở frontend bằng auth context; dữ liệu thật vẫn được bảo vệ ở API bằng guard.

## Lý do

- Đáp ứng yêu cầu "đăng nhập chạy được, test được, triển khai được" trong thời gian còn lại; B kéo theo cấu hình CORS, cookie và yêu cầu cùng site mà nhóm không đủ thời gian làm kịp.
- Mọi tài liệu đã soạn (FR/NFR, điều kiện JWT cho TV4, `api-contract.md`) đều dùng header Bearer nên không phải sửa.
- Việc chặn route ở frontend chỉ phục vụ trải nghiệm; bảo vệ dữ liệu thật nằm ở guard của API nên không phải lỗ hổng.
- Rủi ro XSS có cách giảm thiểu cụ thể (bên dưới) và dữ liệu của dự án (đồ uống, thanh toán mô phỏng) có tác hại thấp nếu lộ token.

## Hệ quả

**Ưu điểm:**
- Đơn giản, ít thành phần cấu hình, dễ viết integration test và E2E test.
- Cả nhóm không phải đổi cách gọi API.

**Nhược điểm chấp nhận:**
- Nếu trang bị XSS, mã độc đọc được token. Cookie httpOnly sẽ chặn việc lấy cắp token nhưng không loại bỏ XSS, và chi phí triển khai cao hơn nhiều so với lợi ích trong dự án này.
- Chặn route chỉ ở phía client.
- Đăng xuất chỉ xóa token ở trình duyệt; token cũ vẫn hợp lệ đến khi hết hạn (không thu hồi phía server).

**Cách giảm rủi ro (kiểm tra ở bước rà bảo mật N13–N14):**
- Token sống ngắn (1 giờ), không dùng refresh token.
- Không dùng `dangerouslySetInnerHTML`; nhóm kiểm tra bằng cách tìm trong repo (`TV7-NFR-08`).
- Thêm header `Content-Security-Policy` cho trang web.
- Xóa token khi API trả 401.
- `JWT_SECRET` nằm ở biến môi trường, không vào repo.

**Việc cần làm theo (cho cả nhóm):**
- **TV4, TV6:** gắn `JwtAuthGuard` (và `RolesGuard` cho `PATCH /orders/:id/status`); không đọc token thủ công.
- **TV2, TV3, TV4, TV5, TV6:** frontend gửi header `Authorization: Bearer <accessToken>` khi gọi API cần đăng nhập, lấy token từ auth context của TV7.
- **TV7:** làm auth context và hàm gọi API dùng chung gắn sẵn header, để các luồng khác không phải tự làm.

## Khi nào xem lại

Nếu sau này cần an toàn hơn (hoặc nhóm có thêm thời gian), chuyển sang phương án B (cookie httpOnly). Việc chuyển chủ yếu ảnh hưởng tầng đăng nhập và frontend; các luồng khác chỉ cần gọi API với `credentials: 'include'`.