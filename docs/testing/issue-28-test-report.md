# Issue #21 và #28 — Checklist và kết quả kiểm thử

Phạm vi chỉ gồm Issue #21 (state machine/loyalty) và Issue #28 (API lịch sử/chi tiết/trạng thái, E2E giao diện). Issue #55 và video demo không thuộc thay đổi này.

## Checklist Issue #21

- [x] Giữ bảng 7 trạng thái và 8 chuyển đổi hợp lệ theo SRS §11.3.
- [x] Kiểm tra toàn bộ 49 cặp trạng thái bằng unit test và toàn bộ 49 cặp qua PATCH STAFF.
- [x] Kiểm tra trạng thái trước khi cập nhật; cập nhật có điều kiện trong transaction để một request thắng khi có cạnh tranh.
- [x] Chỉ STAFF gọi PATCH; trạng thái thanh toán do Payment service quản lý; STAFF hủy PENDING/PREPARING qua cùng nghiệp vụ hoàn kho.
- [x] COMPLETED và CANCELLED không được chuyển tiếp; không cho PAID → CANCELLED.
- [x] Hủy PENDING/PAYMENT_FAILED theo hợp đồng TV4, hoàn nguyên liệu đúng một lần; khách khác không hủy được.
- [x] Xác minh model LoyaltyTransaction và unique orderId trong migration có sẵn, không tạo migration trùng.
- [x] Chỉ READY → COMPLETED cộng floor(total thực trả / 10000), vào tài khoản chủ đơn.
- [x] Không tạo ledger 0 điểm; không cộng trước COMPLETED hoặc khi hủy.
- [x] Không cộng trùng khi gửi lại/đồng thời; hai đơn cùng khách cộng dồn đúng.
- [x] Lỗi unique ledger rollback cả trạng thái; trạng thái, ledger và tổng điểm cùng transaction.

## Checklist Issue #28

- [x] GET /orders lọc chủ sở hữu từ JWT, sắp xếp mới nhất trước; không tin userId do client tự gửi.
- [x] GET /orders/:id trả chi tiết món, số lượng, giá, trạng thái và điểm thưởng; đơn không tồn tại/không thuộc tài khoản trả 404.
- [x] GET /orders/staff chỉ STAFF, chỉ danh sách PENDING/PAID/PREPARING/READY. GET /orders/me giữ tương thích.
- [x] JWT thiếu/sai/hết hạn 401; CUSTOMER gọi STAFF API 403; token STAFF cũ bị từ chối khi role trong DB đã đổi.
- [x] Kiểm tra PATCH hợp lệ/sai thứ tự, trạng thái cuối, body/ID sai và request đồng thời.
- [x] ID âm/0/vượt Int32 được chặn 400 trước Prisma.
- [x] Trang theo dõi dùng endpoint chi tiết; polling sau mỗi 7 giây, không cần reload trang; dừng ở COMPLETED/CANCELLED và hủy request khi rời trang.
- [x] Hiển thị chi tiết món và điểm thưởng thật sau COMPLETED.
- [x] Playwright có fixture tài khoản CUSTOMER/STAFF/khách khác, sản phẩm/nguyên liệu riêng và cleanup.
- [x] Playwright chạy với mock tắt, NestJS thật, Next.js production build và PostgreSQL Docker thật.
- [x] Bổ sung workflow CI chạy backend, frontend và Playwright, lưu HTML/JSON/trace khi lỗi.
- [x] Cập nhật Swagger và API contract cho endpoint, DTO, response thực tế và phân quyền.

Lượt cuối được chạy lại sau khi dev merge PR #66 (khuyến mãi), nền `2ce131f`. Bộ backend có thêm **1 it.todo có sẵn của Issue #25** về báo giá nhiều dòng vượt tổng tồn; đây là test chưa triển khai của đồng đội, ngoài phạm vi #21/#28. 249 test backend thực thi đều pass. Không coi TODO là test đã chạy.

## Môi trường và bằng chứng

- Windows, Node.js 24, Prisma 6.19, PostgreSQL 16 trong Docker, Next.js 16.3.8, Playwright Chromium.
- Database riêng: `brewlite_final_acceptance_tests` tại localhost:5433. Database ứng dụng và các container tại cổng 3000/3001 không bị reset/thay thế.
- Playwright tự khởi động API `http://127.0.0.1:3101` và web `http://127.0.0.1:3100`, đóng server khi kết thúc.
- Browser projects: Chromium desktop và Pixel 5 mobile emulation. Đây là Chromium giả lập thiết bị, không phải thiết bị Android thật hoặc WebKit/Safari.
- Chỉ fixture setup dùng API/Prisma trực tiếp; các bước menu, tùy chọn, giỏ, thanh toán và chuyển tiến độ nhân viên được thao tác qua giao diện. Không route/mock response để làm test pass.

| Nhóm kiểm tra | Kết quả chạy |
| --- | --- |
| Backend unit/integration, gồm PostgreSQL | 25 suites, 249 tests PASS |
| HTTP E2E toàn bộ backend | 7 suites, 165 tests PASS |
| Riêng state/points unit | 77 tests PASS (đã nằm trong 249) |
| Riêng loyalty HTTP + DB | 15 tests PASS (đã nằm trong 165) |
| Riêng status/history HTTP + DB | 73 tests PASS (đã nằm trong 165) |
| Riêng tồn kho nguyên liệu tích hợp TV4 | 44 HTTP tests PASS (đã nằm trong 165) |
| Frontend Vitest | 9 files, 57 tests PASS |
| Playwright desktop | 7/7 PASS |
| Playwright desktop + mobile | 14/14 PASS, 0 failed/skipped/flaky |
| NestJS build | PASS |
| Next.js production build | PASS |
| Lint backend | Exit 0; 3 warning có sẵn ở promotions.service.ts/orders.controller.spec.ts |
| Lint các file frontend thay đổi | PASS |
| Lint toàn frontend | Exit 0; còn 1 warning img có sẵn ở trang lịch sử |

Kết quả bản tích hợp cuối ngày 15/11/2026: **485 test pass (249 + 165 + 57 + 14)**. Các số riêng state/loyalty/status/inventory là tập con, không cộng lần nữa vào tổng test.

Bổ sung 18 HTTP tests trong `staff-cancellation.e2e-spec.ts`: hủy PENDING/PREPARING, JWT/role bị hạ quyền, trạng thái cuối, ID sai, hủy trùng/đồng thời với khách hoặc READY, rollback khi hoàn kho tràn Int32, giữ nguyên Payment và không cộng điểm.

### Luồng Playwright

1. Đăng nhập → menu → chọn Size L, trân châu, 2 ly → giỏ → báo giá thật → thẻ demo thành công → chi tiết PAID → STAFF bấm PREPARING/READY/COMPLETED → khách nhận thay đổi qua polling → nhận 10 điểm → xem lịch sử.
2. Thẻ demo kết thúc 0000 thất bại → nhập thẻ khác thành công trên cùng đơn → kiểm tra không tạo đơn/trừ kho trùng, có một payment FAILED và một SUCCESS, chưa cộng điểm khi PAID.
3. Tạo QR cho đơn chưa trả tiền → mở theo dõi → xác nhận hủy → CANCELLED và hoàn nguyên liệu, không có điểm.
4. Khách không xem được chi tiết/lịch sử của khách khác và không mở được giao diện STAFF.
5. Khách chưa đăng nhập/phiên token sai được chuyển về login trước khi xem đơn.

Lặp lại 5 luồng trên cho cả desktop và mobile. Playwright hiện kiểm thử thanh toán mô phỏng theo chức năng có sẵn của dự án, không giao dịch tiền thật.

## Lỗi đã phát hiện và xử lý

| Lỗi | Sửa | Bằng chứng kiểm lại |
| --- | --- | --- |
| Có ledger 0 điểm cho đơn dưới 10.000đ | Chỉ ghi khi points > 0 | Unit boundary và loyalty HTTP |
| Chưa có GET /orders/:id | Thêm route và truy vấn đồng thời theo id/userId | Owner 200, người khác/missing 404 |
| Theo dõi dùng toàn bộ lịch sử và không polling | Dùng detail, polling 7 giây | Browser nhìn thấy cả 3 thay đổi STAFF mà không reload |
| ID vượt Int32 có thể đi tới Prisma | OrderIdPipe | GET/PATCH/DELETE đều 400 với 5 dạng ID sai |
| Regression test cũ dùng CUSTOMER để thao tác STAFF | Fixture STAFF thật | task10.e2e-spec.ts pass cùng toàn bộ HTTP E2E |
| Vitest có thể thu nhầm Playwright spec | Chỉ thu src/**/*.test.{ts,tsx} | 57 test frontend pass |
| Lỗi tải lịch sử bị ẩn; effect của menu/lịch sử gây lỗi lint | Hiện alert và nút thử lại, trạng thái rỗng; tải async có cleanup khi rời trang | 3 component test mới và full frontend lint exit 0 |
| Harness ban đầu trỏ nhầm dist/src/main.js | Đổi sang dist/main.js theo tsconfig.build | Server production khởi động được |
| Selector đăng nhập phân biệt chữ hoa/thường, alert Next.js bị trùng | Selector theo tên hiển thị và vùng lỗi thực | Desktop 5/5 và mobile 5/5 pass |

## Chạy lại

Database test phải được tạo sẵn. Không trỏ biến E2E_DATABASE_URL vào database ứng dụng; runner từ chối tên database không có thành phần `test`, `tests` hoặc `e2e`.

PowerShell từ thư mục gốc:

```powershell
$env:DATABASE_URL = 'postgresql://brewlite:brewlite123@localhost:5433/brewlite_tv6_tests?schema=public'
$env:E2E_DATABASE_URL = $env:DATABASE_URL
# Tùy chọn cho máy ít RAM:
$env:NODE_OPTIONS = '--max-old-space-size=768 --max-semi-space-size=4'

cd apps/api
npm.cmd ci
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
npm.cmd run lint
npm.cmd run build

cd ../web
npm.cmd ci
npm.cmd test -- --maxWorkers=1 --minWorkers=1
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run test:e2e:report
```

`test:e2e` generate client, deploy migration, build API và web rồi chạy browser. Khi chỉ sửa test và giữ nguyên build, có thể dùng `npm.cmd run test:e2e:run`. Cần cài dependency của cả hai ứng dụng trước.

Báo cáo HTML nằm tại `apps/web/playwright-report/index.html`; JSON tại `apps/web/test-results/results.json`. Khi fail có screenshot/trace để điều tra. Các artifact không commit vì chứa phiên đăng nhập test tạm thời; CI lưu bằng upload-artifact. Không phải video demo Issue #55.

Hai case mới chạy cả desktop/mobile: STAFF hủy PENDING và PREPARING bằng nút đỏ, từ chối/xác nhận dialog, đối chiếu kho và Payment thật.

## Danh sách từng file thay đổi

Danh sách dưới đây là bản trước lần đồng bộ mới nhất. **Danh sách đầy đủ theo đúng ba nhóm bàn giao nằm tại [tv6-final-handoff.md](tv6-final-handoff.md)**.

Danh sách 27 file đóng góp riêng cho Issue #21/#28 trước khi đồng bộ kho, dựa trên dev `360f9fe`. Các file bổ sung từ PR #59 được liệt kê riêng tại `docs/testing/pr59-tv4-integration.md`:

| File | Nội dung |
| --- | --- |
| apps/api/src/orders/loyalty-points.ts | Hàm tính điểm theo tiền thực trả |
| apps/api/src/orders/loyalty-points.spec.ts | Boundary/làm tròn/đầu vào sai |
| apps/api/src/orders/order.service.ts | Bỏ ledger 0 điểm, kiểm quyền trong transaction, lấy chi tiết theo chủ sở hữu |
| apps/api/src/orders/orders.controller.ts | GET chi tiết, kiểm tra ID, Swagger bearer/204 |
| apps/api/src/orders/dto/order-id.pipe.ts | Chặn ID không phải số nguyên dương Int32 |
| apps/api/src/orders/dto/transition-order.dto.ts | Enum và ví dụ request trong Swagger |
| apps/api/test/order-loyalty.e2e-spec.ts | 15 test HTTP/PostgreSQL về điểm và transaction |
| apps/api/test/order-status-history.e2e-spec.ts | 73 test HTTP về trạng thái, lịch sử, quyền, hủy/hoàn kho |
| apps/api/test/task10.e2e-spec.ts | Sửa fixture STAFF của regression cũ |
| apps/web/src/lib/orders-api.ts | Hàm GET chi tiết có AbortSignal và kiểu ledger |
| apps/web/src/app/orders/[id]/page.tsx | Chi tiết, polling, lỗi, hủy request, điểm thưởng |
| apps/web/src/app/orders/page.tsx | Hiện lỗi, thử lại và danh sách rỗng; async effect có cleanup |
| apps/web/src/app/orders/page.test.tsx | 3 component test cho lỗi/thử lại, rỗng, chuyển login |
| apps/web/src/app/page.tsx | Tải menu bất đồng bộ, thử lại và bỏ kết quả khi rời trang |
| apps/web/e2e/fixtures.ts | Seed/cleanup fixture thật và thao tác login/menu |
| apps/web/e2e/order-flow.spec.ts | 5 luồng nghiệp vụ browser × 2 thiết bị |
| apps/web/playwright.config.ts | Server test riêng, thiết bị, timeout, HTML/JSON/trace |
| apps/web/scripts/run-e2e.mjs | Tự generate/migrate/build và chạy browser, chặn DB không phải test |
| apps/web/package.json | Dependency/scripts Playwright |
| apps/web/package-lock.json | Khóa dependency Playwright |
| apps/web/vitest.config.ts | Tách phạm vi test Vitest khỏi Playwright |
| apps/web/eslint.config.mjs | Bỏ qua artifact browser khi lint |
| .github/workflows/tv6-order-tests.yml | PostgreSQL service và pipeline test toàn luồng |
| .gitignore | Bỏ qua report/trace/phiên test |
| docs/api-contract.md | Đồng bộ payload, route và quyền theo SRS |
| docs/testing/issue-21-state-loyalty.md | State table, điểm thưởng, ma trận kiểm thử Issue #21 |
| docs/testing/issue-28-test-report.md | Báo cáo, checklist, lỗi, lệnh chạy lại và file bàn giao |

Phần loyalty không tạo lại schema/migration: LoyaltyTransaction và unique orderId đã có, được kiểm chứng trên PostgreSQL thật. Migration snapshot nguyên liệu được kế thừa từ PR #59 sau khi đồng bộ; xem báo cáo tích hợp để biết chuỗi migration và hợp đồng TV4.

## Bàn giao review

- Nhánh Issue #21: `fix/tv6-state-loyalty-21`, dựa trên `feat/TV6` đã resolve PR #59 để diff chỉ còn phần state/loyalty.
- Nhánh Issue #28: `test/tv6-orders-e2e-28`, dựa trên nhánh #21 để dùng đúng sửa lỗi điểm thưởng.
- Thanh Nguyễn (`thanhnguyen27032k6-bit`): chạy lệnh Playwright ở trên và đối chiếu các bước menu/checkout/theo dõi, đặc biệt mobile và việc tự cập nhật trạng thái. Kết quả tự động trong báo cáo không được xem là xác nhận review của thành viên.
- TV4: hợp đồng hủy/hoàn kho được gọi trong transaction; các test nguyên liệu và concurrent cancellation đã xác minh tích hợp với code trên dev.
- PR #59 đã được resolve với dev TV4, ba nhánh đồng bộ bằng merge thông thường, không force-push. Thứ tự review/merge: #59 → #60 → #61; đổi base về dev sau khi PR cha được merge nếu cần. PR #45 không bị ghi đè, merge hay đóng tự động.
