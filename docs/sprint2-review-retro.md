# Biên bản Sprint Review và Sprint Retrospective – BrewLite Assignment 2

## 1. Thông tin cuộc họp

| Trường | Nội dung |
|---|---|
| Sprint | Sprint 2 / Assignment 2 handoff |
| Ngày | 2026-11-16 |
| Người ghi biên bản | TV2 – cần nhóm xác nhận |
| Thành phần | TV1, TV2, TV3, TV4, TV5, TV6, TV7 – cần điền tên thật |
| Nhánh/phiên bản đối chiếu | `feat/tv2-product-detail` tại commit `4bcaf13` |
| Link cuộc họp / PR | TBD |

> Đây là biên bản bàn giao dựa trên trạng thái repository hiện tại. Các mục
> cần xác nhận bởi thành viên hoặc bằng chứng GitHub/CI được giữ là `TBD`,
> không tự suy đoán.

## 2. Sprint Review

### 2.1. Mục tiêu trình bày

- Người chấm có thể clone, cấu hình biến môi trường, chạy Database/API/Web.
- Có thể chạy migration/seed, test và build.
- Có tài liệu deploy/rollback do TV1 cung cấp.
- Có ma trận truy vết từ yêu cầu đến code/test/bằng chứng.
- Có thể trình diễn luồng xem chi tiết sản phẩm, chọn Size/topping, ghi chú,
  tính giá và thêm vào giỏ.

### 2.2. Nội dung đã trình bày / có bằng chứng trong nhánh

| Hạng mục | Bằng chứng | Kết quả |
|---|---|---|
| Hướng dẫn chạy local/Docker | `README.md`, `docker-compose.yml` | Đã ghi trong tài liệu; cần thử lại trên máy sạch |
| Deploy/rollback | `docs/deploy-and-rollback.md`, `.github/workflows/cd.yml`, `docker-compose.prod.yml` | Có runbook/CD; cần xác nhận log deploy thực tế |
| Product detail API/UI | `apps/api/src/Product/`, `apps/web/src/app/products/[id]/` | Có code trên nhánh; cần link PR/commit owner |
| Schema/migration/seed topping | `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/`, `apps/api/prisma/seed.ts` | Có file; cần xác nhận migration/seed trên DB sạch |
| Unit test giá | `apps/web/src/lib/pricing.test.ts` | Frontend full test: `69/69` passed |
| Backend build | `apps/api/prisma/schema.prisma`, `apps/api/src/` | `prisma generate` + `npm run build` passed |
| Traceability | `docs/traceability-matrix.md` | Có ma trận; còn dòng TV1–TV7 cần điền bằng chứng |
| Release notes | `docs/release-notes.md` | Đã tạo bản candidate |

### 2.3. Việc chưa thể kết luận tại Review

- Production HTTPS, CD pipeline run, image SHA và rollback thực tế của TV1.
- Số Issue/URL PR/commit SHA của từng thành viên.
- Kết quả E2E và smoke test production nếu chưa có log đính kèm.
- Các yêu cầu nào được chấp nhận là Won't Have hoặc chuyển sang sprint sau.

## 3. Sprint Retrospective

### 3.1. Điều làm tốt

- Chia repository thành `apps/api` và `apps/web`, giúp chạy/build độc lập.
- Dùng API client chung và giữ cơ chế JWT của TV7, tránh xây lại Auth API ở
  luồng TV2.
- Có migration/seed, unit test pricing/cart và tài liệu API/deployment nền.
- Các vấn đề thực tế như execution policy PowerShell, dependency thiếu và sai
  tên hàm tính giá đã được ghi nhận trong quá trình kiểm thử.

### 3.2. Vấn đề / nguyên nhân

| Vấn đề | Nguyên nhân | Tác động |
|---|---|---|
| README và Compose từng dùng tên đường dẫn/service không đồng nhất | Tài liệu cập nhật lệch so với monorepo hiện tại | Người chấm dễ chạy sai lệnh |
| Ma trận có nhiều `TBD` | Chưa thu thập đồng bộ Issue/PR/CI từ cả 7 thành viên | Chưa truy vết được đến bằng chứng cuối |
| Local và Docker dùng `DATABASE_URL` khác hostname/port | Hai chế độ chạy có network khác nhau | Có thể gặp lỗi P1000/kết nối DB |
| Production deploy/rollback chưa có log trong repository | TV1 chưa bổ sung bằng chứng vận hành | Chưa được đánh dấu hoàn tất |

### 3.3. Action items sau Retrospective

| Việc cần làm | Owner | Hạn | Bằng chứng hoàn thành |
|---|---|---|---|
| Điền PR/commit/test/owner cho TV1–TV7 vào ma trận | TV2 tổng hợp, mỗi TV cung cấp dữ liệu | TBD | `docs/traceability-matrix.md` không còn TBD ở dòng đã xác nhận |
| Bổ sung URL production, image SHA, log migration/smoke/rollback | TV1 | TBD | `docs/deployment.md` + link CI/deploy |
| Chạy lại Backend/Frontend/E2E trên commit release | TV3–TV7 phối hợp | TBD | CI run hoặc test report |
| Thử clone và chạy README trên máy sạch | TV2 + một reviewer | TBD | Checklist hoặc log terminal |
| Gắn Git tag và tạo GitHub Release | TV1/TV2 | TBD | Tag/release URL |

## 4. Xác nhận biên bản

| Vai trò | Tên | Xác nhận | Ngày |
|---|---|---|---|
| TV1 – Deploy | TBD | TBD | TBD |
| TV2 – Frontend/Tài liệu | TBD | TBD | TBD |
| TV3 – Cart/Promotion | TBD | TBD | TBD |
| TV4 – Order/Inventory | TBD | TBD | TBD |
| TV5 – Payment | TBD | TBD | TBD |
| TV6 – Order state/Loyalty | TBD | TBD | TBD |
| TV7 – Auth/Architecture | TBD | TBD | TBD |
