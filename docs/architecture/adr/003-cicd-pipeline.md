# ADR-005 (File 003): Tự động hóa tích hợp, kiểm thử và triển khai với GitHub Actions (CI/CD)

* **Trạng thái:** Accepted (Đã triển khai và kiểm chứng trên Production)
* **Người quyết định:** TV1 – Hoàng Công Phú (Nhóm BrewLite)
* **Ngày cập nhật:** 2026-11-21

## Bối cảnh & Vấn đề
Với nhóm 7 thành viên cùng phát triển trên một Monorepo, việc hợp nhất code vào nhánh `dev` và `main` rất dễ phát sinh lỗi xung đột, sai kiểu dữ liệu, hỏng migration database hoặc làm sập dịch vụ trên server thật nếu triển khai thủ công[cite: 39]. Dự án cần quy trình tự động kiểm tra chất lượng mã nguồn (CI) và tự động đóng gói, triển khai, kiểm tra sống còn kèm cơ chế khôi phục lỗi (CD)[cite: 39].

## Các lựa chọn cân nhắc
1. **Kiểm thử và SSH deploy thủ công:** Thành viên tự chạy build ở local và SSH lên EC2 kéo code về build lại mỗi khi có thay đổi[cite: 39]. Dễ quá tải RAM trên EC2 và không có cơ chế rollback tự động khi lỗi.
2. **GitHub Actions CI/CD + GitHub Container Registry (Lựa chọn):** Chạy kiểm thử tự động trên GitHub runner, build sẵn Docker image đẩy lên `ghcr.io`, sau đó SSH vào EC2 để kéo image về chạy kèm smoke test và auto-rollback[cite: 1, 39].

## Quyết định
Thiết lập hệ thống workflow tự động trên **GitHub Actions**:

1. **Quy trình CI (Continuous Integration):**
   - Kích hoạt tự động khi tạo Pull Request hoặc push code lên `dev`/`main`[cite: 39].
   - Chạy kiểm tra quy tắc code (ESLint/Oxlint), kiểm tra kiểu TypeScript (`typecheck`), kiểm tra build và chạy bộ kiểm thử tự động (Backend Unit/API E2E trên PostgreSQL, Frontend Vitest và Browser E2E Playwright)[cite: 1, 39].

2. **Quy trình CD (Continuous Deployment – `.github/workflows/cd.yml`):**
   - Kích hoạt khi merge code vào nhánh `main` (hoặc chạy thủ công `workflow_dispatch`).
   - **Build & Push Registry:** Build Docker image cho `apps/api` và `apps/web`, gắn tag theo mã commit (`github.sha`) và đẩy lên `ghcr.io`[cite: 1].
   - **Deploy & Migration:** SSH vào AWS EC2, sao lưu cấu hình phiên bản đang chạy (`.deploy.env` $\rightarrow$ `.deploy.env.bak`), kéo image mới về, chạy `npx prisma migrate deploy` lên Amazon RDS và khởi động lại container bằng `docker-compose.prod.yml`.
   - **Smoke Test & Auto-Rollback:** Tự động gọi kiểm tra `GET http://localhost:3001/health` (tối đa 60 giây). Nếu health check thất bại, pipeline lập tức khôi phục lại file `.deploy.env.bak` và khởi động lại container của phiên bản ổn định trước đó; nếu thành công, chạy `docker image prune -af` để giải phóng dung lượng đĩa.

## Hệ quả
- **Tích cực:** Ngăn chặn code lỗi merge vào nhánh chính; giảm tải CPU/RAM cho máy chủ EC2 nhờ build image trên GitHub runner; đảm bảo zero-downtime tương đối và tự động phục hồi hệ thống khi bản cập nhật gặp sự cố[cite: 39].
- **Tiêu cực:** Mỗi lần merge vào `main` cần chờ khoảng 3–5 phút để hoàn tất quá trình build Docker image và chạy smoke test[cite: 39].