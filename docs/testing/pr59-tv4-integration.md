# PR #59 — Tích hợp tồn kho nguyên liệu với TV4

PR #58 của TV4 đã đưa Ingredient.stockQuantity/RecipeItem vào dev. Bản PR #59 cũ lại có Ingredient.quantity/Recipe và module kho riêng, gây conflict schema, seed, ProductService, AppModule và OrderService. Bản sửa dùng duy nhất cấu trúc TV4, giữ các API/frontend TV4 và bổ sung transaction, snapshot hoàn kho cùng kiểm thử trên cùng cấu trúc đó.

## Quyết định resolve

| Phần | Cách tích hợp |
| --- | --- |
| schema.prisma | Giữ Ingredient.stockQuantity/version và RecipeItem.amountRequired của TV4; chỉ thêm OrderIngredient + marker usesIngredientInventory |
| seed.ts | Giữ catalog, nguyên liệu, định lượng TV4; không ghi đè công thức STAFF đã sửa khi seed chạy lại |
| ProductService | Giữ computeAvailableQuantity mà adapter khuyến mãi TV4 đang sử dụng; bổ sung alias đọc/sửa recipe qua RecipesService chung |
| AppModule/module kho | Dùng InventoryModule, giữ PromotionsModule; loại module/controller nguyên liệu trùng |
| OrderService | Kiểm tra và trừ Ingredient trong transaction Serializable, cộng nhu cầu dùng chung, retry cạnh tranh; lưu snapshot để hoàn đúng nguyên liệu |
| STAFF guard | Nhận user.id từ JwtAuthGuard và giữ tương thích sub; đọc role hiện tại từ DB |
| API kho | Giữ amount/items/amountRequired/stockQuantity của frontend TV4; hỗ trợ quantity và /products/:id/recipe làm alias có validate |
| Hoàn kho | Atomic increment theo snapshot; hủy cùng đơn chỉ thắng một lần, hủy hai đơn khác nhau không mất cập nhật |
| Migration | Bỏ migration tạo bảng trùng chưa merge của bản PR cũ; giữ migration TV4 và thêm migration snapshot riêng |

Kho và định lượng tiếp tục là Int theo đơn vị g/ml của TV4. Số thập phân bị từ chối. Món legacy chưa có RecipeItem giữ fallback Product.stock theo TV4; marker false bảo đảm hủy vẫn hoàn Product.stock dù sau đó nhân viên thêm công thức. Marker true hoàn từ snapshot. Marker NULL của đơn có trước migration giữ hợp đồng hoàn kho TV4 cũ; không thể khôi phục lịch sử công thức vốn chưa được lưu cho các đơn đó.

## Kiểm thử

Thực thi trên PostgreSQL Docker thật, không reset DB ứng dụng, không sửa schema TV4 để né conflict.

| Phạm vi | Kết quả |
| --- | --- |
| PR #59 riêng trên dev TV4: backend unit/integration | 193 tests PASS |
| PR #59 riêng: HTTP E2E | 56 tests PASS, gồm 42 test tồn kho |
| Frontend TV4 hiện có | 46 tests PASS |
| Build API và frontend TV4 | PASS |
| Tạo DB mới từ chuỗi 5 migrations | PASS |
| Nâng cấp DB TV4 có đơn cũ | PASS; giữ total/status và marker NULL; probe đã cleanup |
| Seed lại sau khi chỉnh recipe/stock | PASS; không ghi đè sửa đổi hoặc bơm lại kho |
| Tích hợp #59 + #60 + #61: backend | 206 tests PASS |
| Tích hợp cả ba: HTTP E2E | 144 tests PASS |
| Tích hợp cả ba: frontend | 49 tests PASS |
| Tích hợp cả ba: Playwright desktop/mobile | 10/10 PASS, 0 fail/skipped/flaky |
| Build API/web trên bản tích hợp | PASS |

Các bộ standalone và tích hợp dùng nhiều test giống nhau, không cộng chúng thành tổng test độc lập. Bộ standalone #59 có 295 test pass. Bộ tích hợp có 409 test pass (206 + 144 + 49 + 10), được chạy lại trên checkout riêng chứa cả ba nhánh.

Đã xác minh:

- availableQuantity theo nguyên liệu giới hạn, không dùng Product.stock cho món có công thức.
- Nhu cầu cộng dồn của dòng trùng món/món dùng chung nguyên liệu, không bán vượt kho khi đặt đồng thời.
- Thiếu nguyên liệu và lỗi tạo đơn/khuyến mãi rollback cả kho, đơn và snapshot.
- GET kho, POST nguyên liệu, PUT/PATCH recipe và alias đều kiểm tra 401/403/STAFF.
- Đổi role trong DB làm token STAFF cũ bị từ chối.
- DTO chặn rỗng, ID trùng/không tồn tại, định lượng sai; lỗi không xóa công thức cũ.
- Nhập kho đồng thời và kiểm tra tràn Int32 không mất cập nhật/trả 500.
- Hoàn đúng lượng ban đầu sau khi recipe đổi hoặc bị xóa; không hoàn hai lần.
- Hợp đồng cũ của TV4 tiếp tục xử lý đơn trước migration.
- Khi tích hợp #60/#61, state machine, điểm thưởng, quyền xem đơn và luồng browser cũng được chạy lại.

Backend lint exit 0, còn 3 warning có sẵn. Trong bộ tích hợp, frontend lint exit 0, còn 1 warning img có sẵn. Build/Prisma generate thực thi thành công. CI GitHub là một lượt chạy riêng, không suy ra PASS từ kết quả local.

## Migration và chạy lại

Migration mới: `20261114180000_order_ingredient_snapshots`; migration TV4 `20261114072858_add_ingredient_and_recipe_item` giữ nguyên. Migration snapshot chỉ thêm bảng/cột, không drop/reset dữ liệu hiện tại.

Đã dùng `brewlite_inventory_merge_tests` để kiểm tra fresh install và `brewlite_tv6_tests` để kiểm tra nâng cấp từ TV4. DB ứng dụng chạy từ bản PR #59 cũ có Ingredient.quantity/Recipe là lịch sử khác: không áp reset hoặc chuyển đổi dữ liệu tự động; cần kiểm tra lịch sử migration trước khi triển khai vào DB đó.

```powershell
# Tại apps/api, với DB test được tạo sẵn:
$env:DATABASE_URL = 'postgresql://brewlite:brewlite123@localhost:5433/brewlite_inventory_merge_tests?schema=public'
$env:NODE_OPTIONS = '--max-old-space-size=768 --max-semi-space-size=4'
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd run db:seed
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
npm.cmd run lint
npm.cmd run build
```

Trên nhánh #61 đã tích hợp, tại apps/web: đặt E2E_DATABASE_URL tới DB test, cài dependency của cả api/web và Chromium, chạy `npm.cmd run test:e2e`. Runner build cả hai ứng dụng rồi kiểm tra bằng server riêng cổng 3100/3101, không mock API.

## Trình tự merge để giữ các PR dễ review

1. PR #59 → dev: tích hợp tồn kho theo TV4 và resolve conflict.
2. PR #60 → nhánh feat/TV6: chỉ phần state/loyalty. Sau khi #59 merge, đổi base #60 về dev nếu GitHub chưa tự đổi.
3. PR #61 → nhánh fix/tv6-state-loyalty-21: API history/detail và E2E giao diện. Sau khi #60 merge, đổi base #61 về dev.

Các nhánh được merge đồng bộ bằng commit thông thường, không force-push và không tự merge/đóng PR của thành viên khác. Issue #55 không thuộc phạm vi.

API/payload và các quy ước chi tiết: `docs/ingredient-inventory-api.md`. Checklist Issue #21/#28: `docs/testing/issue-21-state-loyalty.md`, `docs/testing/issue-28-test-report.md`.

## File thay đổi của PR #59 so với dev TV4

| Nhóm | File |
| --- | --- |
| Schema/migration | apps/api/prisma/schema.prisma; apps/api/prisma/migrations/20261114180000_order_ingredient_snapshots/migration.sql |
| Seed | apps/api/prisma/seed.ts |
| Product và alias recipe | apps/api/src/Product/product.controller.ts; product.module.ts; product.service.ts |
| Xác thực STAFF | apps/api/src/auth/staff.guard.ts; staff.guard.spec.ts |
| Kho/công thức | apps/api/src/inventory/inventory.module.ts; ingredients.controller.ts; recipes.service.ts; dto/ingredient.dto.ts; dto/update-recipe.dto.ts |
| Đơn hàng | apps/api/src/orders/order.service.ts; order.create.spec.ts; order.service.spec.ts |
| Test HTTP/fixture | apps/api/test/ingredient-inventory.e2e-spec.ts; helpers/ingredient-fixtures.ts; task10.e2e-spec.ts |
| Artifact | .gitignore |
| Bàn giao | docs/ingredient-inventory-api.md; docs/testing/pr59-tv4-integration.md |

AppModule nằm trong 5 file conflict ban đầu nhưng sau resolve giữ nguyên bản dev TV4, nên không còn xuất hiện trong diff cuối. Frontend TV4 không bị sửa bởi PR #59; thay đổi giao diện theo dõi và Playwright thuộc PR #61.
