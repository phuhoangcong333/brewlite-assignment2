# Hướng dẫn Triển khai (Deploy) & Khôi phục (Rollback) Hệ thống BrewLite

## 1. Kiến trúc Hạ tầng & Môi trường Production
- **Cloud Server:** AWS EC2 Ubuntu (`47.129.180.144`)
- **Database:** AWS RDS PostgreSQL
- **Reverse Proxy & SSL/HTTPS:** Nginx + Chứng chỉ SSL miễn phí từ Let's Encrypt (`certbot`)
- **Container Registry:** GitHub Container Registry (`ghcr.io`)
- **Các đường dẫn truy cập Production:**
  - **Giao diện người dùng (Frontend):** `https://47.129.180.144.sslip.io`
  - **Hệ thống API (Backend):** `https://47.129.180.144.sslip.io/api`
  - **Kiểm tra sức khỏe hệ thống (Health Check):** `https://47.129.180.144.sslip.io/api/health`

---

## 2. Quy trình Triển khai Tự động (CD Pipeline)
Hệ thống sử dụng GitHub Actions (`.github/workflows/cd.yml`) để tự động hóa quy trình phát hành khi có thay đổi trên nhánh `main` (hoặc kích hoạt thủ công qua `workflow_dispatch`):

1. **Build & Push Image:** Đóng gói Docker Image cho `api` và `web`, gắn tag theo mã `commit SHA` (`${{ github.sha }}`) và đẩy lên `ghcr.io`.
2. **Sao lưu trạng thái:** Trên server EC2 (`~/brewlite-assignment2`), tự động lưu bản sao cấu hình hiện tại từ `.deploy.env` sang `.deploy.env.bak`.
3. **Pull & Chạy Migration:** Tải image mới về EC2, khởi chạy bằng `docker-compose.prod.yml`. Container Backend tự động chạy `npx prisma migrate deploy` để đồng bộ cơ sở dữ liệu an toàn trước khi nhận request.
4. **Smoke Test:** Pipeline tự động gọi `GET http://localhost:3001/health` (tối đa 12 lần, cách nhau 5 giây). Hệ thống chỉ được xác nhận triển khai thành công khi nhận về HTTP `200 OK` cùng nội dung `{"status":"ok","database":"up"}`.

---

## 3. Quy trình Khôi phục Phiên bản (Rollback)

### 3.1. Rollback Tự động qua CD Pipeline
Nếu quá trình deploy bản mới làm ứng dụng sập hoặc Smoke Test thất bại sau 60 giây, pipeline sẽ tự động kích hoạt quy trình cứu hộ:
1. Khôi phục lại tag image của phiên bản ổn định liền trước: `cp .deploy.env.bak .deploy.env`.
2. Khởi chạy lại container cũ:
   ```bash
   docker compose --env-file .env --env-file .deploy.env -f docker-compose.prod.yml up -d --remove-orphans