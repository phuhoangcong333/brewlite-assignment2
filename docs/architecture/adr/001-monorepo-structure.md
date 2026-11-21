# ADR-001: Sử dụng cấu trúc Monorepo cho dự án BrewLite

* **Trạng thái:** Accepted
* **Người quyết định:** TV1 – Hoàng Công Phú (Nhóm BrewLite)
* **Ngày cập nhật:** 2026-11-21

## Bối cảnh & Vấn đề
Dự án BrewLite bao gồm ứng dụng Web (Next.js PWA) và hệ thống API Backend (NestJS)[cite: 37]. Nếu tách thành 2 repository độc lập sẽ gây khó khăn trong việc đồng bộ hóa code, quản lý lịch sử commit/Pull Request của 7 thành viên, và cấu hình quy trình CI/CD cũng như Docker Compose chung[cite: 37].

## Các lựa chọn cân nhắc
1. **Multi-repo:** Tách riêng repo frontend và backend[cite: 37].
2. **Monorepo (Lựa chọn):** Tổ chức chung một repository duy nhất với cấu trúc thư mục tách biệt từng ứng dụng[cite: 37].

## Quyết định
Chọn **Monorepo** với cấu trúc thư mục chuẩn hóa:
- `apps/web`: Ứng dụng Next.js Frontend (PWA).
- `apps/api`: Dịch vụ NestJS Backend (Modular Monolith + Prisma ORM).
- `docs/`: Tài liệu yêu cầu (`requirements/`), kiến trúc (`architecture/`), sơ đồ UML (`diagrams/`), hợp đồng API (`api-contract.md`), báo cáo kiểm thử (`testing/`) và ma trận truy vết (`traceability-matrix.md`).
- `tests/`: Thư mục tổng hợp hướng dẫn kiểm thử (`README.md`) và các bộ Postman Collection (`postman/`) của nhóm.
- `.github/workflows/`: Các pipeline tự động hóa CI và CD[cite: 1].
- `docker-compose.yml` & `docker-compose.prod.yml`: Cấu hình khởi chạy container tách biệt cho môi trường Local và Production[cite: 3].

## Hệ quả
- **Tích cực:** Dễ dàng quản lý toàn bộ mã nguồn, tài liệu và kiểm thử tại một nơi; dùng chung cấu hình Docker Compose và CI/CD; thuận tiện cho việc nghiệm thu và chấm điểm đồ án[cite: 37].
- **Tiêu cực:** Cần cấu hình chính xác `context` và đường dẫn build trong Dockerfile và GitHub Actions để tránh build nhầm ứng dụng hoặc kích hoạt deploy không cần thiết[cite: 1, 37].