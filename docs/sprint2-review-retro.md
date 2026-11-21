# Biên bản Sprint Review và Sprint Retrospective – BrewLite Assignment 2

## 1. Thông tin cuộc họp

| Trường | Nội dung |
|---|---|
| Sprint | Sprint 2 / Assignment 2 handoff |
| Ngày | 2026-11-21 |
| Người ghi biên bản | TV2 & TV1 cập nhật bàn giao |
| Thành phần | TV1 (Hoàng Công Phú), TV2, TV3, TV4, TV5, TV6, TV7 |
| Nhánh/phiên bản đối chiếu | `main` tại commit `9c371ef` (`https://47.129.180.144.sslip.io`) |
| Link cuộc họp / PR | Pull Request `#76` (merged to `main`) |

> Đây là biên bản bàn giao dựa trên trạng thái repository và môi trường production hiện tại. Các mục cần xác nhận bởi từng thành viên còn lại được giữ là `TBD`.

## 2. Sprint Review

### 2.1. Mục tiêu trình bày

- Người chấm có thể clone, cấu hình biến môi trường, chạy Database/API/Web.
- Có thể chạy migration/seed, test và build.
- Có tài liệu và hạ tầng deploy/rollback production thực tế do TV1 cung cấp.
- Có ma trận truy vết từ yêu cầu đến code/test/bằng chứng.
- Có thể trình diễn luồng xem chi tiết sản phẩm, chọn Size/topping, ghi chú, tính giá, đặt đơn, hủy đơn, thanh toán và theo dõi trạng thái đơn.

### 2.2. Nội dung đã trình bày / có bằng chứng trong nhánh

| Hạng mục | Bằng chứng | Kết quả |
|---|---|---|
| Hướng dẫn chạy local/Docker | `README.md`, `docker-compose.yml` | Đã ghi trong tài liệu và kiểm thử chạy thành công |
| Deploy/rollback production | `https://47.129.180.144.sslip.io`, `docs/deploy-and-rollback.md`, `.github/workflows/cd.yml`, `docker-compose.prod.yml` | Đã deploy thành công lên AWS EC2 + RDS; CD Run `#10` (`9c371ef`) smoke test `/health` pass |
| Product detail API/UI | `apps/api/src/Product/`, `apps/web/src/app/products/[id]/` | Có code trên nhánh `main` |
| Schema/migration/seed topping & kho | `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/`, `apps/api/prisma/seed.ts` | Đã chạy `prisma migrate deploy` thành công trên RDS |
| Unit & E2E test | `apps/web/src/lib/pricing.test.ts`, `apps/api/test/`, `apps/web/e2e/`, `tests/README.md` | Frontend unit test `69/69` passed; CI/CD & Playwright E2E passed |
| Backend build | `apps/api/prisma/schema.prisma`, `apps/api/src/` | `prisma generate` + `npm run build` passed trên CI |
| Traceability | `docs/traceability-matrix.md` | Có ma trận; các thành viên điền bổ sung bằng chứng PR |
| Release notes | `docs/release-notes.md` | Đã cập nhật bản release production `9c371ef` |

### 2.3. Việc chưa thể kết luận tại Review

- Số Issue/URL PR/commit SHA chi tiết của từng thành viên TV2–TV7 trên ma trận truy vết.
- Các yêu cầu nào được chấp nhận là Won't Have hoặc chuyển sang sprint sau.

## 3. Sprint Retrospective

### 3.1. Điều làm tốt

- Chia repository thành `apps/api` và `apps/web`, giúp chạy/build độc lập và đóng gói Docker gọn nhẹ.
- Triển khai thành công HTTPS trên AWS EC2, bảo mật Amazon RDS trong private network và tự động hóa CD có smoke test `/health` + auto-rollback.
- Dùng API client chung và giữ cơ chế JWT của TV7, tránh xây lại Auth API ở các luồng khác.
- Có migration/seed, unit test pricing/cart, API E2E, Playwright E2E và tài liệu API/deployment đầy đủ.

### 3.2. Vấn đề / nguyên nhân

| Vấn đề | Nguyên nhân | Tác động |
|---|---|---|
| README và Compose từng dùng tên đường dẫn/service không đồng nhất | Tài liệu cập nhật lệch so với monorepo hiện tại | Đã rà soát và đồng bộ lại |
| Ma trận có nhiều `TBD` | Chưa thu thập đồng bộ Issue/PR/CI từ cả 7 thành viên | Cần các thành viên điền bổ sung để truy vết đầy đủ |
| Local và Docker dùng `DATABASE_URL` khác hostname/port | Hai chế độ chạy có network khác nhau | Đã tách rõ `.env.example` và `docker-compose.prod.yml` |
| Đầy dung lượng ổ đĩa EC2 khi deploy nhiều lần | `docker image prune -f` chỉ xóa image `<none>`, giữ lại image gắn tag SHA cũ | Đã dọn giải phóng 9.5 GB trên EC2 và nâng cấp lệnh prune |

### 3.3. Action items sau Retrospective

| Việc cần làm | Owner | Hạn | Bằng chứng hoàn thành |
|---|---|---|---|
| Điền PR/commit/test/owner cho TV1–TV7 vào ma trận | TV2 tổng hợp, mỗi TV cung cấp dữ liệu | Trước buổi bảo vệ | `docs/traceability-matrix.md` không còn TBD ở dòng đã xác nhận |
| Bổ sung URL production, image SHA, log migration/smoke/rollback | TV1 (Hoàng Công Phú) | Hoàn thành | `https://47.129.180.144.sslip.io` + CD Run `#10` (`9c371ef`) + `docs/deployment.md` |
| Gom Postman Collections và hướng dẫn kiểm thử về `tests/` | TV1 (Hoàng Công Phú) | Hoàn thành | `tests/README.md` và `tests/postman/` |
| Chạy lại Backend/Frontend/E2E trên commit release | TV3–TV7 phối hợp | Hoàn thành | GitHub Actions CI/E2E passed |

## 4. Xác nhận biên bản

| Vai trò | Tên | Xác nhận | Ngày |
|---|---|---|---|
| TV1 – Deploy | Hoàng Công Phú | Đã xác nhận | 2026-11-21 |
| TV2 – Frontend/Tài liệu | TBD | TBD | TBD |
| TV3 – Cart/Promotion | TBD | TBD | TBD |
| TV4 – Order/Inventory | TBD | TBD | TBD |
| TV5 – Payment | TBD | TBD | TBD |
| TV6 – Order state/Loyalty | TBD | TBD | TBD |
| TV7 – Auth/Architecture | TBD | TBD | TBD |