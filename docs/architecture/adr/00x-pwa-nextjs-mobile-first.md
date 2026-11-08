# ADR-00X: Sử dụng Next.js và PWA cho Frontend

## 1. Trạng thái

Proposed

## 2. Bối cảnh (Context)

BrewLite là hệ thống đặt đồ uống trực tuyến, cần cung cấp giao diện thuận tiện cho khách hàng trên điện thoại di động và máy tính.

Người dùng cần có khả năng xem menu, xem chi tiết sản phẩm, lựa chọn kích thước, topping, quản lý giỏ hàng, đặt hàng và theo dõi đơn hàng.

Do đó, Frontend cần đáp ứng các yêu cầu:
- Tương thích với nhiều kích thước màn hình.
- Có khả năng hiển thị nội dung nhanh và tối ưu trải nghiệm người dùng.
- Hỗ trợ tương tác trên giao diện.
- Có định hướng phát triển thành ứng dụng web có thể cài đặt trên thiết bị di động.

## 3. Quyết định (Decision)

Sử dụng **Next.js kết hợp React và TypeScript** để xây dựng Frontend cho BrewLite.

Áp dụng các định hướng sau:

- **Rendering:** Ưu tiên Server Components cho nội dung có thể xử lý phía server; sử dụng Client Components cho các chức năng cần tương tác.
- **Mobile-first:** Thiết kế giao diện ưu tiên màn hình điện thoại, sau đó mở rộng cho tablet và desktop.
- **PWA:** Định hướng triển khai Progressive Web App thông qua Web App Manifest và Service Worker.
- **API Integration:** Frontend giao tiếp với Backend thông qua RESTful API.

## 4. Các phương án được cân nhắc (Alternatives)

| Phương án | Đánh giá |
|---|---|
| React SPA | Linh hoạt nhưng cần tự cấu hình thêm nhiều thành phần cho routing và rendering. |
| Next.js | Hỗ trợ routing, Server Components và nhiều chiến lược rendering, phù hợp với ứng dụng web. |
| Vue.js | Có khả năng xây dựng giao diện tốt nhưng không đồng nhất với lựa chọn công nghệ hiện tại của nhóm. |

## 5. Hệ quả (Consequences)

### Ưu điểm
- Hỗ trợ nhiều phương thức rendering.
- Tối ưu trải nghiệm hiển thị nội dung.
- Dễ tổ chức và mở rộng cấu trúc giao diện.
- Hỗ trợ thiết kế responsive theo hướng Mobile-first.
- Có thể phát triển thành PWA để người dùng cài đặt từ trình duyệt.

### Nhược điểm
- Cần phân biệt và quản lý Server Components với Client Components.
- Cần cấu hình thêm Manifest và Service Worker để triển khai PWA.
- Cần kiểm thử giao diện trên nhiều kích thước màn hình và trình duyệt.
- Việc hỗ trợ offline cần thiết kế bộ nhớ đệm và chiến lược đồng bộ dữ liệu phù hợp.

## 6. Phạm vi áp dụng

Quyết định này áp dụng cho toàn bộ phần Frontend của hệ thống BrewLite, bao gồm trang Menu, chi tiết sản phẩm, giỏ hàng, đặt hàng, thanh toán và lịch sử đơn hàng.

## 7. Người phụ trách

TV2 – Frontend