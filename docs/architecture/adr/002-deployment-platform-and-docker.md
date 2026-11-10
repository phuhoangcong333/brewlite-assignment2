# 2. Nền tảng triển khai AWS (EC2, RDS) và Container hóa với Docker

* **Trạng thái:** Accepted
* **Người quyết định:** TV1 (Nhóm BrewLite)
* **Ngày:** 2026-11-08

## Bối cảnh & Vấn đề
Hệ thống BrewLite cần được triển khai lên môi trường Cloud thực tế (AWS) phục vụ yêu cầu "Hello Deploy". Cần đảm bảo môi trường phát triển (Local) và môi trường sản xuất (Production) đồng nhất, đồng thời CSDL PostgreSQL có cơ chế lưu trữ bền vững (persistent storage).

## Các lựa chọn cân nhắc
1. **Triển khai trực tiếp (Bare-metal/VM thuần):** Cài Node.js và PostgreSQL trực tiếp lên OS của EC2.
2. **Sử dụng Docker Compose & AWS Services (Lựa chọn):** Đóng gói API/Web thành Docker container, chạy trên AWS EC2, và kết nối CSDL Amazon RDS PostgreSQL (hoặc Docker Volume persistent).

## Quyết định
- **Containerization:** Đóng gói ứng dụng bằng Docker và quản lý khởi chạy qua Docker Compose.
- **Compute:** Sử dụng AWS EC2 (Ubuntu 24.04 LTS).
- **Database:** Sử dụng Amazon RDS PostgreSQL (Free tier) phục vụ dữ liệu lưu trữ bền vững.

## Hệ quả & Kinh nghiệm thực tế (Ghi nhận lỗi từ Hello Deploy)
- **Cấu hình mạng:** Phải mở port 3001 trên AWS Security Group (`Custom TCP`, `0.0.0.0/0`) để truy cập API từ bên ngoài.
- **Biến môi trường:** Biến `DATABASE_URL` phải được truyền chính xác vào container backend qua file `.env` chứa Endpoint RDS chuẩn.
- **Phân quyền AWS IAM:** Cần đảm bảo tài khoản AWS có đủ quyền `AdministratorAccess` hoặc các policy EC2/RDS để không bị chặn khi tạo tài nguyên.