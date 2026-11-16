# Hướng dẫn triển khai và Rollback

## Trạng thái

Đây là runbook mục tiêu cho production. Repo hiện có Dockerfiles, Docker Compose và mô tả CI/CD, nhưng chưa có bằng chứng workflow CD hoàn chỉnh hoặc URL production đã xác minh.

## Kiến trúc production bắt buộc

- EC2 Ubuntu 24.04 chạy các container `apps/web` và `apps/api`.
- Reverse proxy trên EC2 terminate TLS; public traffic chỉ đi qua HTTPS 443 (HTTP 80 chỉ redirect sang HTTPS). Không expose trực tiếp port 3000/3001 ra Internet.
- RDS PostgreSQL đặt trong private subnet/private access. Security Group của RDS chỉ cho phép TCP 5432 từ Security Group của EC2, không mở `0.0.0.0/0`.
- `DATABASE_URL`, `JWT_SECRET` và registry credentials truyền qua secrets hoặc file môi trường ngoài repository. Không dùng các giá trị mẫu trong `docker-compose.yml` cho production.

## CD flow

1. GitHub Actions chạy CI: install, lint, typecheck, unit test và build image.
2. Với tag release, build image gắn commit SHA và push lên container registry.
3. EC2 pull đúng image SHA, cập nhật biến môi trường và chạy Prisma migration.
4. Khởi động/restart Compose rồi gọi `GET https://<production-host>/health`.
5. Chỉ đánh dấu deploy thành công khi health trả HTTP 200 và API kết nối được RDS. Nếu bước migration, startup hoặc smoke test lỗi thì giữ image cũ đang phục vụ và báo pipeline thất bại.

## Rollback

1. Ghi lại image SHA đang chạy và image SHA stable gần nhất.
2. Đổi deployment về image stable, không xóa dữ liệu RDS.
3. Restart các container cần thiết và chạy lại smoke test `/health` qua HTTPS.
4. Nếu migration có thay đổi không tương thích, phải dùng migration rollback/forward fix đã được review; không sửa trực tiếp database bằng thao tác thủ công trong runbook.

## Checklist bằng chứng cần bổ sung

- URL production HTTPS hợp lệ và redirect HTTP → HTTPS.
- Security Group RDS chỉ nhận từ EC2; không public database.
- Workflow CD có deploy, migration, smoke test `/health` và rollback/failure gate.
- Log pipeline và image SHA cho một lần deploy thành công.
