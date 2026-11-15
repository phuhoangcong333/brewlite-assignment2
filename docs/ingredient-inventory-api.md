# API tồn kho — tích hợp với TV4 trong PR #59

Schema chuẩn là phần TV4 đã merge vào dev: `Ingredient.stockQuantity` (Int), `Ingredient.version` và `RecipeItem.amountRequired` (Int). Không tạo thêm model Recipe hoặc cột Ingredient.quantity song song.

## Tính tồn và đặt/hủy đơn

- `availableQuantityBySize[size] = min(floor(stockQuantity / amountRequired))` theo công thức đúng size S/M/L. Thiếu công thức một size thì size đó là 0. `availableQuantity` là min của ba size để tương thích; giao diện mới dùng số lượng riêng từng size. `stock` trong response sản phẩm là alias để tương thích frontend.
- Các món legacy không có RecipeItem tiếp tục dùng Product.stock theo hợp đồng TV4. Món có công thức luôn trừ nguyên liệu; đơn trộn món có/không có công thức bị từ chối theo hợp đồng hiện tại.
- Cộng tổng nhu cầu khi nhiều dòng/món dùng chung nguyên liệu, kiểm tra đủ kho, trừ Ingredient và tạo đơn/snapshot trong cùng transaction Serializable. Thiếu nguyên liệu trả 400; lỗi bất kỳ rollback toàn bộ. Xung đột ghi được retry tối đa 3 lần.
- Đơn mới ghi `usesIngredientInventory = true/false`. Món dùng nguyên liệu lưu chính xác lượng đã trừ trong OrderIngredient; hủy đơn dùng snapshot, kể cả khi công thức đổi hoặc bị xóa.
- Hoàn nguyên liệu bằng atomic increment; hai đơn khác nhau có thể hoàn cùng nguyên liệu mà không mất cập nhật. Hủy cùng đơn chỉ thành công một lần nhờ kiểm tra trạng thái trong transaction.
- Đơn TV4 trước migration có marker NULL và tiếp tục theo hợp đồng hoàn kho cũ. Không có dữ liệu lịch sử để dựng lại định lượng quá khứ cho các đơn này; snapshot chỉ bảo đảm hoàn đúng định lượng ban đầu cho đơn mới.
- Kho/định lượng là số nguyên theo đơn vị g/ml của TV4. Dùng đơn vị nhỏ hơn nếu cần độ chia nhỏ; API không nhận số thập phân.
- Size/topping vẫn tính phụ phí như hợp đồng hiện tại; công thức riêng theo size S/M/L; chưa có định lượng riêng cho topping.

## API và phân quyền

Các endpoint kho dùng JwtAuthGuard và StaffGuard, kiểm tra role hiện tại trong DB. Guard chấp nhận `user.id` do JwtAuthGuard cung cấp và giữ tương thích `sub`. Không JWT → 401; CUSTOMER → 403.

| Method | Endpoint | Quyền | Body |
| --- | --- | --- | --- |
| GET | /products | Public | Không có |
| GET | /products/:id | Public | Không có |
| GET | /ingredients | STAFF | Không có |
| POST | /ingredients | STAFF | `{ "name": "Sữa", "unit": "ml", "stockQuantity": 100 }` |
| PATCH | /ingredients/:id/restock | STAFF | `{ "amount": 20 }` |
| PUT/PATCH | /ingredients/recipes/:productId | STAFF | `{ "items": [{ "ingredientId": 1, "size": "S", "amountRequired": 20 }, { "ingredientId": 1, "size": "M", "amountRequired": 25 }, { "ingredientId": 1, "size": "L", "amountRequired": 30 }] }` |
| GET | /products/:id/recipe | STAFF | Alias đọc công thức |
| PATCH | /products/:id/recipe | STAFF | Alias `{ "ingredients": [{ "ingredientId": 1, "quantity": 30 }] }` |

Frontend kho TV4 tiếp tục dùng amount/items/amountRequired và nhận stockQuantity/recipeItems. Alias nhập kho `quantity` hoặc `stockQuantity` vẫn được hỗ trợ nhưng chỉ gửi một trong ba trường mỗi request.

Sửa công thức dùng chung RecipesService cho cả hai bộ endpoint, thay thế nguyên tử toàn bộ danh sách. Nguyên liệu phải tồn tại, không trùng (size, ingredientId), có đủ ba size S/M/L và định lượng nguyên dương. Alias cũ không truyền size sẽ mở rộng toàn bộ nguyên liệu cho cả ba size; nếu truyền size phải truyền đầy đủ cho mọi dòng. Body sai trả 400, tài nguyên không tồn tại trả 404. Trùng tên nguyên liệu trả 409. Nhập kho kiểm tra giới hạn Int32 bằng predicate ngay trong atomic update để không tràn số khi nhập đồng thời.

## Migration và seed

- Giữ nguyên migration TV4 `20261114072858_add_ingredient_and_recipe_item`.
- Loại migration tạo Ingredient/Recipe trùng của bản PR #59 chưa merge.
- Thêm `20261114180000_order_ingredient_snapshots`, chỉ thêm marker NULL cho đơn cũ và bảng snapshot. Không drop/reset dữ liệu TV4.
- Seed giữ nguyên catalog, tên nguyên liệu và công thức TV4. Chỉ khởi tạo công thức khi món chưa có công thức; không ghi đè sửa đổi STAFF khi Docker chạy seed lại. Không reset stockQuantity.

Đã kiểm tra cả tạo DB từ đầu và nâng cấp DB có schema TV4, bao gồm giữ một đơn cũ qua migration. Nếu máy từng chạy migration của PR #59 bản cũ (có Ingredient.quantity/Recipe), đó là schema khác chưa được merge: dùng DB kiểm thử riêng cho nhánh hiện tại, không reset hoặc tự chuyển đổi DB ứng dụng đó.

Từ apps/api trên PowerShell:

```powershell
$env:DATABASE_URL = 'postgresql://brewlite:brewlite123@localhost:5433/brewlite_final_acceptance_tests?schema=public'
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd run db:seed
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
npm.cmd run lint
npm.cmd run build
```

DB test phải được tạo trước. Kết quả, quyết định resolve conflict và kiểm thử tích hợp với PR #60/#61: xem `docs/testing/pr59-tv4-integration.md`.
