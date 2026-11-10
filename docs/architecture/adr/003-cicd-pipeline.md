# 3. Tự động hóa tích hợp và kiểm thử với GitHub Actions (CI/CD)

* **Trạng thái:** Accepted
* **Người quyết định:** TV1 (Nhóm BrewLite)
* **Ngày:** 2026-11-08

## Bối cảnh & Vấn đề
Để đảm bảo chất lượng nguồn mã khi nhóm hợp nhất code vào nhánh `dev` và `main`, dự án cần một quy trình tự động kiểm tra lỗi syntax, build thử nghiệm và chạy test trước khi triển khai.

## Các lựa chọn cân nhắc
1. **Kiểm thử thủ công:** Thành viên tự chạy `npm run build` ở local trước khi tạo Pull Request.
2. **GitHub Actions (Lựa chọn):** Tích hợp CI/CD trực tiếp trên GitHub repository.

## Quyết định
Sử dụng **GitHub Actions** thiết lập workflow tự động khi có Pull Request hoặc Push vào nhánh `dev`/`main`:
- Kiểm tra Lint & TypeScript type checking.
- Build thử nghiệm hai container `apps/web` và `apps/api`.
- Chạy unit test cơ bản.

## Hệ quả
- **Tích cực:** Phát hiện sớm lỗi xung đột hoặc lỗi build trước khi merge code; tự động hóa quy trình kiểm thử.
- **Tiêu cực:** Tốn thời gian chờ CI run trên mỗi Pull Request.