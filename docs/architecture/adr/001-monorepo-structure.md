# 1. Sử dụng cấu trúc Monorepo cho dự án BrewLite

* **Trạng thái:** Accepted
* **Người quyết định:** TV1 (Nhóm BrewLite)
* **Ngày:** 2026-11-08

## Bối cảnh & Vấn đề
Dự án BrewLite bao gồm ứng dụng Web (Next.js PWA) và hệ thống API Backend (NestJS). Nếu tách thành 2 repository độc lập sẽ gây khó khăn trong việc đồng bộ hóa code, quản lý commit lịch sử bài tập, và cấu hình quy trình CI/CD/Docker Compose chung.

## Các lựa chọn cân nhắc
1. **Multi-repo:** Tách riêng repo frontend và backend.
2. **Monorepo (Lựa chọn):** Tổ chức chung một repository duy nhất với cấu trúc thư mục `apps/web` và `apps/api`.

## Quyết định
Chọn **Monorepo** với cấu trúc:
- `apps/web`: Ứng dụng Next.js Frontend.
- `apps/api`: Dịch vụ NestJS Backend.
- `docs/`: Tài liệu kiến trúc và sơ đồ UML.

## Hệ quả
- **Tích cực:** Dễ dàng quản lý toàn bộ dự án tại một nơi; chia sẻ file `docker-compose.yml` chung; thuận tiện cho việc đánh giá assignment của môn học.
- **Tiêu cực:** Cần cẩn thận khi cấu hình đường dẫn Docker build và CI/CD để không build nhầm các ứng dụng.