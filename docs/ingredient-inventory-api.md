# API tồn kho theo nguyên liệu

## Checklist bàn giao

- [x] `GET /products` và `GET /products/:id` tính `availableQuantity` từ nguyên liệu.
- [x] Tạo đơn kiểm tra và trừ `Ingredient.quantity` trong cùng Prisma transaction với đơn hàng và lượt dùng khuyến mãi.
- [x] Tổng hợp nhu cầu của các dòng trùng món và các món dùng chung nguyên liệu.
- [x] Thiếu nguyên liệu hoặc chưa có công thức trả HTTP 400; transaction rollback toàn bộ.
- [x] Transaction Serializable, retry tối đa 3 lần và cập nhật có điều kiện để ngăn bán vượt tồn.
- [x] Danh sách kho, nhập kho và xem/sửa công thức chỉ cho STAFF.
- [x] Hủy đơn hoàn đúng snapshot nguyên liệu, kể cả khi công thức đã thay đổi; chỉ hoàn một lần.
- [x] Prisma schema, migration và seed nguyên liệu/công thức mẫu.
- [x] Kiểm thử HTTP với PostgreSQL thật, bao gồm JWT, CUSTOMER/STAFF, đồng thời, rollback và số thập phân.

## Quy ước

`availableQuantity = min(floor(Ingredient.quantity / Recipe.quantity))` cho từng nguyên liệu của món. Ví dụ còn 100 ml sữa và 45 g cà phê, mỗi ly cần 30 ml và 10 g thì phục vụ tối đa `min(3, 4) = 3` ly.

- Không có công thức: tồn khả dụng bằng 0, tạo đơn trả 400.
- Mỗi món có một công thức chuẩn cho một ly, áp dụng chung các size. Size/topping vẫn tính phụ phí như trước; chưa có định lượng riêng cho size/topping trong yêu cầu này.
- Mỗi món được tính riêng trên cùng kho dùng chung; không cộng tồn khả dụng của nhiều món để suy ra tổng số ly có thể bán.
- `stock` trong phản hồi API sản phẩm là alias của `availableQuantity` để tương thích frontend. Cột `Product.stock`/`version` cũ được giữ để bảo toàn dữ liệu nhưng không dùng trong luồng đặt/hủy đơn mới.
- Định lượng và tồn nguyên liệu lưu `Decimal(14,3)`; phản hồi JSON của các trường Decimal là chuỗi, ví dụ `"100.125"`. Request nhận số JSON dương, tối đa 3 chữ số thập phân và không quá 1 tỷ mỗi lần nhập/định lượng.
- Sửa công thức thay thế toàn bộ danh sách nguyên liệu trong một transaction. Danh sách phải có ít nhất một nguyên liệu; không chấp nhận ID trùng, ID không tồn tại, định lượng 0 hoặc âm.
- Các đơn tạo trước migration không có snapshot nguyên liệu; khi hủy sẽ không cộng nguyên liệu vì các đơn này chưa từng trừ kho nguyên liệu.
- Seed chỉ thêm nguyên liệu/công thức còn thiếu, không reset tồn nguyên liệu hoặc ghi đè công thức STAFF đã chỉnh.

## Endpoints

API sản phẩm vẫn public; tạo đơn yêu cầu đăng nhập. Các endpoint quản lý bên dưới yêu cầu `Authorization: Bearer <access_token>` của tài khoản có role `STAFF` trong database. Role được đọc lại từ database trên mỗi request: thiếu/sai JWT trả 401, CUSTOMER trả 403.

| Method | URL | Quyền | Chức năng |
| --- | --- | --- | --- |
| GET | `/products` | Public | Danh sách món với tồn tính động |
| GET | `/products/:id` | Public | Chi tiết món với tồn tính động |
| POST | `/orders` | Đăng nhập | Tạo đơn và trừ nguyên liệu |
| GET | `/ingredients` | STAFF | Danh sách kho, gồm `id`, `name`, `unit`, `quantity` |
| PATCH | `/ingredients/:id/restock` | STAFF | Cộng thêm lượng nguyên liệu |
| GET | `/products/:id/recipe` | STAFF | Xem công thức và nguyên liệu liên quan |
| PATCH | `/products/:id/recipe` | STAFF | Thay thế công thức |

Nhập thêm 500.125 đơn vị theo `Ingredient.unit`:

```http
PATCH /ingredients/1/restock
Authorization: Bearer <staff_token>
Content-Type: application/json

{ "quantity": 500.125 }
```

Thay công thức món; lấy ID thật từ `GET /ingredients`:

```http
PATCH /products/1/recipe
Authorization: Bearer <staff_token>
Content-Type: application/json

{
  "ingredients": [
    { "ingredientId": 1, "quantity": 20 },
    { "ingredientId": 3, "quantity": 30 }
  ]
}
```

Các PATCH thành công trả HTTP 200 với bản ghi nguyên liệu/công thức mới. ID tài nguyên không tồn tại trả 404; ID nguyên liệu không tồn tại trong request sửa công thức trả 400. Tạo đơn thiếu nguyên liệu trả 400 với `message: "Insufficient ingredient <id>"`. Xung đột transaction sau khi retry hết trả 409 cho tạo đơn.

## Generate, migrate và test với Docker PostgreSQL

Kết quả kiểm tra trên PostgreSQL Docker tại `localhost:5433`:

- `prisma generate`, `migrate deploy`, `migrate status`: thành công; database đã áp dụng đủ 4 migration.
- `prisma migrate diff`: `No difference detected` giữa database thật và schema.
- Seed: 8 nguyên liệu, 20 dòng định lượng cho 8 món.
- `npm test -- --runInBand`: 19 suites, 188 tests pass, gồm các kiểm thử service với PostgreSQL thật.
- `npm run test:e2e -- --runInBand`: 3 suites, 42 tests pass; 28 test thuộc bộ tồn kho mới.
- `npm run build` và Prettier check: pass.
- `npm run lint`: exit 0; còn 3 warning có sẵn tại `orders.controller.spec.ts` và `promotions.service.ts`.
- Container API đã rebuild và khởi động thành công. Kiểm tra trực tiếp `http://localhost:3001/products` trả 8 món có `availableQuantity`; `/ingredients` không có JWT trả 401.
- Dữ liệu fixture của các bộ test đã được dọn khỏi database.

Chạy từ `apps/api` trên PowerShell. Docker Compose publish PostgreSQL ở `localhost:5433`, còn API trong Docker kết nối `db:5432`.

```powershell
$env:DATABASE_URL = 'postgresql://brewlite:brewlite123@localhost:5433/brewlite?schema=public'
npm.cmd ci
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npx.cmd prisma migrate status
npm.cmd run db:seed
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
npm.cmd run lint
npm.cmd run build
```

Migration mới: `20261114100000_add_ingredient_inventory`. Migration chỉ thêm bảng/index/constraint, không reset database. Các CHECK constraint chặn tồn âm và định lượng không dương ngay tại PostgreSQL.

Để tạo/cập nhật tài khoản STAFF bằng seed, cấu hình `STAFF_EMAIL` và `STAFF_PASSWORD` cùng lúc trong môi trường chạy seed. Đăng ký public vẫn chỉ tạo CUSTOMER.

Từ thư mục gốc, cập nhật riêng API Docker:

```powershell
docker compose up -d --build --no-deps api
```

## Gợi ý nhóm commit

| Nhóm file | Commit message |
| --- | --- |
| `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261114100000_add_ingredient_inventory/`, `apps/api/prisma/seed.ts` | `feat(db): add ingredients, recipes and order consumption snapshots` |
| `apps/api/src/ingredients/`, `apps/api/src/Product/`, `apps/api/src/orders/order.service.ts`, `apps/api/src/orders/orders.module.ts`, `apps/api/src/app.module.ts` | `feat(api): calculate availability and transact ingredient inventory with staff APIs` |
| `apps/api/src/orders/order.create.spec.ts`, `apps/api/src/orders/order.service.spec.ts`, `apps/api/test/helpers/ingredient-fixtures.ts`, `apps/api/test/task10.e2e-spec.ts`, `apps/api/test/ingredient-inventory.e2e-spec.ts` | `test(api): cover ingredient inventory, rollback, concurrency and staff access` |
| `docs/ingredient-inventory-api.md` | `docs(api): document ingredient inventory endpoints and database workflow` |

Thứ tự commit: database → API → tests → docs.
