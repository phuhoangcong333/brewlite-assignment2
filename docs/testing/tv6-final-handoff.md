# Bàn giao TV6: Backend tồn kho, Issue #21 và Issue #28

Phạm vi chốt ngày 15/11/2026. Nền tích hợp: dev `84e833a`, đã gồm TV4 theo size và menu danh mục Issue #52. Không bao gồm Issue #55 hoặc hoàn tiền.

## Checklist công việc

- [x] Giải quyết conflict schema, seed, product, guard, inventory DTO/controller và OrdersService; giữ nguyên công thức S/M/L, danh mục và giao diện menu/kho của đồng đội.
- [x] GET /products và /products/:id tính tồn động theo nguyên liệu giới hạn, trả availableQuantityBySize và availableQuantity tương thích.
- [x] Đặt đơn kiểm tra/trừ Ingredient trong transaction Serializable; tổng hợp nhu cầu cùng nguyên liệu, snapshot lượng dùng, retry cạnh tranh và rollback; thiếu nguyên liệu trả 400.
- [x] API kho/restock/công thức chỉ STAFF, kiểm tra role hiện tại; validation, nhập đồng thời và giới hạn Int32.
- [x] Prisma generate và 7 migration trên PostgreSQL Docker riêng; regression nâng cấp công thức đã có giữ đúng định lượng và đủ ba size.
- [x] State machine 7 trạng thái; chặn sai thứ tự, trạng thái cuối và cập nhật đồng thời; chỉ STAFF cập nhật tiến độ.
- [x] STAFF hủy PENDING/PREPARING qua DELETE /orders/staff/:id hoặc PATCH status=CANCELLED; CUSTOMER vẫn chỉ hủy đơn mình ở PENDING/PAYMENT_FAILED.
- [x] Nút Hủy đơn màu đỏ ở /staff/orders cạnh thao tác tiến độ khi đang pha chế; xác nhận trước khi hủy, vô hiệu thao tác lúc đang xử lý, hiển thị lỗi và làm mới hàng đợi.
- [x] Hủy hoàn đúng snapshot nguyên liệu một lần, kể cả công thức đã đổi/xóa; giữ nguyên Payment, không hoàn tiền, không cộng điểm.
- [x] LoyaltyTransaction và unique orderId dùng migration sẵn có; chỉ READY → COMPLETED cộng floor(total sau giảm giá / 10000), đúng chủ đơn, không trùng/không ledger 0, rollback nguyên tử.
- [x] GET /orders, /orders/me, /orders/:id đúng quyền/lịch sử/chi tiết; STAFF queue gồm PENDING/PAID/PREPARING/READY.
- [x] Theo dõi đơn polling 7 giây, dừng khi kết thúc, hiển thị chi tiết và điểm thưởng thật.
- [x] Test HTTP về quyền, ID/body, 49 cặp trạng thái, lịch sử, điểm thưởng, hoàn kho và cạnh tranh; Playwright đi qua UI thật, API thật, PostgreSQL thật trên desktop/mobile.
- [x] Workflow CI, báo cáo test, danh sách lỗi đã sửa và từng file theo ba nhóm.

## Kết quả kiểm tra cuối trước push

| Kiểm tra | Kết quả |
| --- | --- |
| Backend unit/integration, PostgreSQL | 232/232, 23 suites |
| HTTP API/PostgreSQL | 165/165, 7 suites |
| Frontend Vitest | 57/57, 9 files |
| Playwright Chromium desktop + Pixel 5 giả lập | 14/14, 7 ca mỗi project |
| Tổng | **468 passed**, không cộng trùng các tập con |
| Prisma generate, migrate deploy | PASS, đủ 7 migrations |
| Nest build, Next production build --webpack | PASS |
| Backend + frontend lint | Exit 0; 3 warning backend có sẵn và 1 warning img frontend có sẵn |
| Conflict markers, git diff --check | PASS |

Database riêng: `brewlite_final_acceptance_tests`, Docker PostgreSQL cổng 5433. API/web Playwright dùng 3101/3100. Không reset database ứng dụng. Browser report: `apps/web/playwright-report/index.html`, JSON: `apps/web/test-results/results.json`; artifact được ignore và CI upload khi chạy workflow. Mobile là Chromium giả lập, chưa phải thiết bị Android thật/Safari.

Lệnh tái chạy và các lỗi đã sửa nằm trong [báo cáo Issue #28](issue-28-test-report.md), [state/loyalty](issue-21-state-loyalty.md), [tích hợp TV4](pr59-tv4-integration.md).

## Ba push và tiêu đề PR

| PR | Nhánh | Tiêu đề |
| --- | --- | --- |
| [#59](https://github.com/phuhoangcong333/brewlite-assignment2/pull/59) | feat/TV6 | [TV6][Backend tồn kho] Tích hợp TV4: tồn theo size, trừ/hoàn nguyên liệu và API STAFF |
| [#60](https://github.com/phuhoangcong333/brewlite-assignment2/pull/60) | fix/tv6-state-loyalty-21 | [TV6][Issue #21] Hoàn thiện trạng thái đơn, hủy STAFF và điểm thưởng nguyên tử |
| [#61](https://github.com/phuhoangcong333/brewlite-assignment2/pull/61) | test/tv6-orders-e2e-28 | [TV6][Issue #28] Kiểm thử API và E2E đặt/theo dõi/hủy đơn, bổ sung nút hủy STAFF |

Thứ tự tích hợp: #59 → #60 → #61 vào dev. Các nhánh có quan hệ phụ thuộc để giữ riêng diff từng nhiệm vụ; mỗi PR được retarget về dev sau khi PR trước đã merge. Không force push.

## Từng file theo nhóm

A = thêm, M = sửa. Các đường dẫn dưới đây là diff đóng góp so với dev hoặc nhánh nhiệm vụ liền trước; file dùng chung có thể xuất hiện ở nhiều nhóm khi phục vụ nhiều nghiệp vụ. Không liệt kê lại file của đồng đội chỉ được mang theo từ merge dev.

### 1. Backend tồn kho nguyên liệu — PR #59

Nhánh: `feat/TV6`; 25 file.

| Thay đổi | File |
| --- | --- |
| M | [.gitignore](../../.gitignore) |
| M | [apps/api/prisma/migrations/20261114103000_add_size_to_recipe_item/migration.sql](../../apps/api/prisma/migrations/20261114103000_add_size_to_recipe_item/migration.sql) |
| A | [apps/api/prisma/migrations/20261114180000_order_ingredient_snapshots/migration.sql](../../apps/api/prisma/migrations/20261114180000_order_ingredient_snapshots/migration.sql) |
| M | [apps/api/prisma/schema.prisma](../../apps/api/prisma/schema.prisma) |
| M | [apps/api/prisma/seed.ts](../../apps/api/prisma/seed.ts) |
| M | [apps/api/src/auth/staff.guard.spec.ts](../../apps/api/src/auth/staff.guard.spec.ts) |
| M | [apps/api/src/auth/staff.guard.ts](../../apps/api/src/auth/staff.guard.ts) |
| M | [apps/api/src/inventory/dto/ingredient.dto.ts](../../apps/api/src/inventory/dto/ingredient.dto.ts) |
| A | [apps/api/src/inventory/dto/update-recipe.dto.ts](../../apps/api/src/inventory/dto/update-recipe.dto.ts) |
| M | [apps/api/src/inventory/ingredients.controller.ts](../../apps/api/src/inventory/ingredients.controller.ts) |
| M | [apps/api/src/inventory/inventory.module.ts](../../apps/api/src/inventory/inventory.module.ts) |
| A | [apps/api/src/inventory/recipes.service.ts](../../apps/api/src/inventory/recipes.service.ts) |
| M | [apps/api/src/orders/order.create.spec.ts](../../apps/api/src/orders/order.create.spec.ts) |
| M | [apps/api/src/orders/order.service.spec.ts](../../apps/api/src/orders/order.service.spec.ts) |
| M | [apps/api/src/orders/order.service.ts](../../apps/api/src/orders/order.service.ts) |
| M | [apps/api/src/Product/product.controller.ts](../../apps/api/src/Product/product.controller.ts) |
| M | [apps/api/src/Product/product.module.ts](../../apps/api/src/Product/product.module.ts) |
| M | [apps/api/src/Product/product.service.ts](../../apps/api/src/Product/product.service.ts) |
| M | [apps/api/src/Product/product.spec.ts](../../apps/api/src/Product/product.spec.ts) |
| A | [apps/api/test/helpers/ingredient-fixtures.ts](../../apps/api/test/helpers/ingredient-fixtures.ts) |
| A | [apps/api/test/ingredient-inventory.e2e-spec.ts](../../apps/api/test/ingredient-inventory.e2e-spec.ts) |
| A | [apps/api/test/inventory-migration.e2e-spec.ts](../../apps/api/test/inventory-migration.e2e-spec.ts) |
| M | [apps/api/test/task10.e2e-spec.ts](../../apps/api/test/task10.e2e-spec.ts) |
| A | [docs/ingredient-inventory-api.md](../../docs/ingredient-inventory-api.md) |
| A | [docs/testing/pr59-tv4-integration.md](../../docs/testing/pr59-tv4-integration.md) |

### 2. Issue #21: Trạng thái, hủy đơn và điểm thưởng — PR #60

Nhánh: `fix/tv6-state-loyalty-21`; 10 file.

| Thay đổi | File |
| --- | --- |
| A | [apps/api/src/orders/loyalty-points.spec.ts](../../apps/api/src/orders/loyalty-points.spec.ts) |
| A | [apps/api/src/orders/loyalty-points.ts](../../apps/api/src/orders/loyalty-points.ts) |
| M | [apps/api/src/orders/order-cancel.plan.ts](../../apps/api/src/orders/order-cancel.plan.ts) |
| M | [apps/api/src/orders/order-state.spec.ts](../../apps/api/src/orders/order-state.spec.ts) |
| M | [apps/api/src/orders/order-state.ts](../../apps/api/src/orders/order-state.ts) |
| M | [apps/api/src/orders/order.service.spec.ts](../../apps/api/src/orders/order.service.spec.ts) |
| M | [apps/api/src/orders/order.service.ts](../../apps/api/src/orders/order.service.ts) |
| M | [apps/api/src/orders/orders.controller.ts](../../apps/api/src/orders/orders.controller.ts) |
| A | [apps/api/test/order-loyalty.e2e-spec.ts](../../apps/api/test/order-loyalty.e2e-spec.ts) |
| A | [docs/testing/issue-21-state-loyalty.md](../../docs/testing/issue-21-state-loyalty.md) |

### 3. Issue #28: Kiểm thử API, giao diện và Playwright — PR #61

Nhánh: `test/tv6-orders-e2e-28`; 25 file.

| Thay đổi | File |
| --- | --- |
| A | [.github/workflows/tv6-order-tests.yml](../../.github/workflows/tv6-order-tests.yml) |
| M | [.gitignore](../../.gitignore) |
| A | [apps/api/src/orders/dto/order-id.pipe.ts](../../apps/api/src/orders/dto/order-id.pipe.ts) |
| M | [apps/api/src/orders/dto/transition-order.dto.ts](../../apps/api/src/orders/dto/transition-order.dto.ts) |
| M | [apps/api/src/orders/order.service.ts](../../apps/api/src/orders/order.service.ts) |
| M | [apps/api/src/orders/orders.controller.ts](../../apps/api/src/orders/orders.controller.ts) |
| A | [apps/api/test/order-status-history.e2e-spec.ts](../../apps/api/test/order-status-history.e2e-spec.ts) |
| A | [apps/api/test/staff-cancellation.e2e-spec.ts](../../apps/api/test/staff-cancellation.e2e-spec.ts) |
| A | [apps/web/e2e/fixtures.ts](../../apps/web/e2e/fixtures.ts) |
| A | [apps/web/e2e/order-flow.spec.ts](../../apps/web/e2e/order-flow.spec.ts) |
| M | [apps/web/eslint.config.mjs](../../apps/web/eslint.config.mjs) |
| M | [apps/web/package-lock.json](../../apps/web/package-lock.json) |
| M | [apps/web/package.json](../../apps/web/package.json) |
| A | [apps/web/playwright.config.ts](../../apps/web/playwright.config.ts) |
| A | [apps/web/scripts/run-e2e.mjs](../../apps/web/scripts/run-e2e.mjs) |
| M | [apps/web/src/app/orders/[id]/page.tsx](../../apps/web/src/app/orders/[id]/page.tsx) |
| A | [apps/web/src/app/orders/page.test.tsx](../../apps/web/src/app/orders/page.test.tsx) |
| M | [apps/web/src/app/orders/page.tsx](../../apps/web/src/app/orders/page.tsx) |
| A | [apps/web/src/app/staff/orders/page.test.tsx](../../apps/web/src/app/staff/orders/page.test.tsx) |
| M | [apps/web/src/app/staff/orders/page.tsx](../../apps/web/src/app/staff/orders/page.tsx) |
| M | [apps/web/src/lib/orders-api.ts](../../apps/web/src/lib/orders-api.ts) |
| M | [apps/web/vitest.config.ts](../../apps/web/vitest.config.ts) |
| M | [docs/api-contract.md](../../docs/api-contract.md) |
| A | [docs/testing/issue-28-test-report.md](../../docs/testing/issue-28-test-report.md) |
| A | [docs/testing/tv6-final-handoff.md](../../docs/testing/tv6-final-handoff.md) |
