# ADR-002: Nền tảng triển khai AWS (EC2, RDS), HTTPS và Container hóa với Docker

* **Trạng thái:** Accepted (Đã triển khai thực tế trên Production)
* **Người quyết định:** TV1 – Hoàng Công Phú (Nhóm BrewLite)
* **Ngày cập nhật:** 2026-11-21

## Bối cảnh & Vấn đề
Hệ thống BrewLite cần được triển khai lên môi trường Cloud thực tế (AWS) với yêu cầu bảo mật kết nối HTTPS, cô lập cơ sở dữ liệu khỏi Internet công cộng, đồng nhất môi trường phát triển (Local) với sản xuất (Production) và đảm bảo dữ liệu PostgreSQL bền vững (persistent storage)[cite: 38].

## Các lựa chọn cân nhắc
1. **Triển khai trực tiếp (Bare-metal/VM thuần):** Cài Node.js, Nginx và PostgreSQL trực tiếp lên hệ điều hành của EC2[cite: 38]. Dễ xung đột phiên bản thư viện và khó rollback khi lỗi.
2. **Sử dụng Docker Compose & AWS Managed Services (Lựa chọn):** Đóng gói API/Web thành Docker container, chạy trên AWS EC2 sau reverse proxy HTTPS, và kết nối tới Amazon RDS PostgreSQL đặt trong mạng riêng[cite: 38].

## Quyết định
- **Containerization:** Đóng gói `apps/web` và `apps/api` bằng multi-stage Dockerfile; tách riêng `docker-compose.yml` (Local có container Postgres) và `docker-compose.prod.yml` (Production dùng image từ `ghcr.io` và kết nối RDS).
- **Compute & Reverse Proxy HTTPS:** Sử dụng **AWS EC2** (Ubuntu 24.04 LTS) chạy Docker Compose kết hợp reverse proxy tự động cấp chứng chỉ TLS/HTTPS tại địa chỉ `https://47.129.180.144.sslip.io`[cite: 3].
- **Database & Network Isolation:** Sử dụng **Amazon RDS PostgreSQL** cấu hình chế độ private (`Publicly accessible: No`) để lưu trữ dữ liệu bền vững.
- **Quản lý cấu hình & Secret:** Tuyệt đối không commit file `.env` lên repository; biến môi trường production (`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `API_IMAGE`, `WEB_IMAGE`) được quản lý qua `.env` và `.deploy.env` trực tiếp trên EC2.

## Hệ quả & Kinh nghiệm vận hành thực tế
- **Bảo mật Security Group (Đã siết chặt từ bản Hello Deploy):**
  - **EC2 Security Group:** Chỉ mở công khai cổng `80` (HTTP redirect) và `443` (HTTPS) cho người dùng truy cập (`0.0.0.0/0`), cùng cổng `22` (SSH) phục vụ triển khai. Các cổng nội bộ của container (`3000`, `3001`) chỉ giao tiếp qua mạng nội bộ Docker (`127.0.0.1`), không mở trực tiếp ra ngoài.
  - **RDS Security Group:** Chặn toàn bộ kết nối từ Internet (`Publicly accessible: No`), chỉ mở inbound TCP cổng `5432` cho duy nhất **Security Group ID của EC2**.
- **Quản lý dung lượng ổ đĩa EC2:** Do mỗi lần CD triển khai image mới gắn tag theo `github.sha`[cite: 1], các image cũ không còn sử dụng cần được dọn định kỳ bằng `docker image prune -af` trong pipeline để tránh đầy ổ đĩa gốc của EC2.