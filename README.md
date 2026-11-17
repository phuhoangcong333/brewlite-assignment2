# BrewLite – Assignment 2

BrewLite là ứng dụng đặt đồ uống trực tuyến gồm:

- Frontend: Next.js, React, TypeScript, PWA.
- Backend: NestJS, Prisma và PostgreSQL.
- Xác thực: JWT do module Auth dùng chung cung cấp.
- Chạy local: Docker Compose hoặc chạy frontend/backend trực tiếp trên máy.

README này là hướng dẫn bàn giao: cài đặt, cấu hình, chạy, migration/seed,
kiểm thử, build và kiểm tra các tài liệu truy vết.

## Links & Documentation (Sprint 2)

- **Production URL (HTTPS):** [BrewLite Production](https://47.129.180.144.sslip.io)
- **Demo Video:** [Xem video nghiệm thu BrewLite](https://drive.google.com/file/d/1nEoMsIKDN8ifOlwJy8bl21vhLiF7Rftd/view?usp=sharing)
- **Sprint Retrospective:** [Biên bản Sprint 2](docs/sprint2-review-retro.md)
- **Deploy & Rollback Guide:** [Hướng dẫn triển khai và rollback](docs/deploy-and-rollback.md)

## 1. Cấu trúc repository

```text
apps/api/       NestJS API, Prisma schema/migration/seed
apps/web/       Next.js frontend, unit/component/E2E test
docs/           API contract, architecture, deployment, traceability
docker-compose.yml
```

## 2. Yêu cầu môi trường

- Git.
- Node.js 24 LTS (Node.js 20+ có thể dùng cho các script không chạy Docker).
- npm.
- Docker Desktop đang chạy Docker Engine.

Trên Windows PowerShell, nếu execution policy chặn `npm.ps1` hoặc `npx.ps1`,
dùng `npm.cmd` và `npx.cmd` như các ví dụ bên dưới.

## 3. Lấy mã nguồn

```powershell
git clone <URL_REPOSITORY>
Set-Location D:\CNPM\brewlite-assignment2
git switch feat/tv2-product-detail
```

Không commit `.env`, mật khẩu hoặc JWT secret. Chỉ commit các file
`.env.example` và tài liệu hướng dẫn.

## 4. Biến môi trường

### Backend: `apps/api/.env`

Tạo từ file mẫu:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Các biến chính:

| Biến             | Chạy trực tiếp trên máy                                                   | Chạy trong Compose                        |
| ---------------- | ------------------------------------------------------------------------- | ----------------------------------------- |
| `PORT`           | `3001`                                                                    | `3001`                                    |
| `DATABASE_URL`   | `postgresql://brewlite:brewlite123@localhost:5433/brewlite?schema=public` | Compose tự ghi đè bằng hostname `db:5432` |
| `JWT_SECRET`     | Chuỗi bí mật đủ dài cho môi trường local                                  | Dùng secret ngoài repository ở production |
| `STAFF_EMAIL`    | Tài khoản nhân viên seed                                                  | Đọc từ `apps/api/.env`                    |
| `STAFF_PASSWORD` | Mật khẩu nhân viên seed                                                   | Đọc từ `apps/api/.env`                    |

### Frontend

| Biến                   | Giá trị local thật                                |
| ---------------------- | ------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`  | `http://localhost:3001`                           |
| `NEXT_PUBLIC_USE_MOCK` | `false` để gọi Backend thật; `true` chỉ dùng mock |

Khi chạy `docker compose`, `NEXT_PUBLIC_*` được truyền lúc build image. Nếu
đổi API URL, phải build lại image frontend.

## 5. Cách 1 – chạy toàn bộ bằng Docker Compose

Từ thư mục gốc repository:

```powershell
Set-Location D:\CNPM\brewlite-assignment2
Copy-Item apps/api/.env.example apps/api/.env
docker compose config --quiet
docker compose up --build -d
docker compose ps
```

`api` tự chạy `prisma migrate deploy`, `prisma db seed` rồi khởi động NestJS.
Nếu cần xem log:

```powershell
docker compose logs --tail=100 api web db
docker compose logs -f api
```

Địa chỉ truy cập:

| Thành phần         | Địa chỉ                        |
| ------------------ | ------------------------------ |
| Frontend           | http://localhost:3000          |
| Backend            | http://localhost:3001          |
| Health check       | http://localhost:3001/health   |
| Swagger            | http://localhost:3001/api-docs |
| PostgreSQL từ host | `localhost:5433`               |

Kiểm tra migration và seed trong container:

```powershell
docker compose exec api npx prisma migrate status --schema prisma/schema.prisma
docker compose exec api npx prisma db seed --schema prisma/schema.prisma
```

Dừng ứng dụng nhưng giữ volume database:

```powershell
docker compose down
```

Chỉ dùng `docker compose down -v` khi muốn xóa toàn bộ dữ liệu local để tạo
lại database sạch.

## 6. Cách 2 – chạy database bằng Docker, app trực tiếp trên máy

### 6.1. Khởi động PostgreSQL

```powershell
Set-Location D:\CNPM\brewlite-assignment2
docker compose up -d db
```

### 6.2. Cài dependency và chuẩn bị database cho Backend

```powershell
Set-Location D:\CNPM\brewlite-assignment2\apps\api
npm.cmd ci
$env:DATABASE_URL = "postgresql://brewlite:brewlite123@localhost:5433/brewlite?schema=public"
$env:JWT_SECRET = "brewlite-local-secret-change-me"
npx.cmd prisma generate --schema prisma/schema.prisma
npx.cmd prisma migrate deploy --schema prisma/schema.prisma
npm.cmd run db:seed
npm.cmd run start:dev
```

Mở terminal khác để chạy Frontend:

```powershell
Set-Location D:\CNPM\brewlite-assignment2\apps\web
npm.cmd ci
$env:NEXT_PUBLIC_API_URL = "http://localhost:3001"
$env:NEXT_PUBLIC_USE_MOCK = "false"
npm.cmd run dev
```

Khi phát triển schema mới, dùng `prisma migrate dev --name <ten-migration>`
trên database local; không dùng lệnh này cho production.

## 7. Migration, seed và dữ liệu mẫu

- Migration nằm tại `apps/api/prisma/migrations/`.
- Schema nằm tại `apps/api/prisma/schema.prisma`.
- Seed nằm tại `apps/api/prisma/seed.ts`.
- Topping `Trân châu` và `Kem` được seed như bản ghi `Topping` liên kết với
  `Ingredient`; `amountRequired` chỉ được dùng khi đã có định lượng nghiệp vụ
  được nhóm xác nhận.

Lệnh thường dùng trong `apps/api`:

```powershell
npx.cmd prisma migrate status --schema prisma/schema.prisma
npx.cmd prisma migrate deploy --schema prisma/schema.prisma
npm.cmd run db:seed
npx.cmd prisma studio --schema prisma/schema.prisma --port 5555
```

## 8. Kiểm thử và build

### Backend

```powershell
Set-Location D:\CNPM\brewlite-assignment2\apps\api
npm.cmd test -- --runInBand
npm.cmd run lint
npm.cmd run build
```

E2E Backend cần PostgreSQL và biến môi trường kiểm thử:

```powershell
npm.cmd run test:e2e -- --runInBand
```

### Frontend

```powershell
Set-Location D:\CNPM\brewlite-assignment2\apps\web
npm.cmd test
npm.cmd test -- src/lib/pricing.test.ts src/lib/cart.test.ts
npm.cmd run lint
npm.cmd run build
```

E2E trình duyệt (sau khi đã cài browser của Playwright):

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Bài kiểm thử giá hiện có tại `apps/web/src/lib/pricing.test.ts`; bài kiểm thử
giỏ hàng tại `apps/web/src/lib/cart.test.ts`.

## 9. Luồng nghiệm thu Assignment 2

1. Mở `/products/<id>` và xác nhận dữ liệu được lấy từ `GET /products/:id`.
2. Chọn Size, topping khả dụng và nhập ghi chú.
3. Xác nhận giá thay đổi theo Size/topping; topping hết hàng bị khóa.
4. Thêm vào giỏ, kiểm tra dòng món giữ đúng Size/topping/ghi chú và giá.
5. Xác nhận request cần đăng nhập gửi `Authorization: Bearer <JWT>` do cơ chế
   Auth dùng chung cung cấp.
6. Chạy unit test tính giá và build frontend/backend.

## 10. Deploy và rollback

Runbook production do TV1 cung cấp nằm tại
[`docs/deploy-and-rollback.md`](docs/deploy-and-rollback.md); bản mô tả kiến
trúc/ràng buộc tổng quát nằm tại [`docs/deployment.md`](docs/deployment.md).
Tài liệu CD hiện dùng `.github/workflows/cd.yml` và
`docker-compose.prod.yml`, với các nguyên tắc:

- EC2 chạy Web/API bằng container, reverse proxy terminate HTTPS.
- RDS nằm trong private network; chỉ EC2 Security Group được truy cập DB.
- CD build image theo commit SHA, chạy migration, smoke test `/health`.
- Rollback về image SHA ổn định gần nhất, không xóa dữ liệu RDS; migration không
  tương thích phải dùng migration forward/rollback đã được review.

URL production và quy trình smoke/rollback đã được ghi trong runbook TV1.
Vẫn cần đính kèm log pipeline, image SHA và bằng chứng một lần deploy/rollback
thành công trước khi đánh dấu phần production là nghiệm thu hoàn tất. Không
đưa secret vào README.

## 11. Tài liệu bàn giao

- [`docs/api-contract.md`](docs/api-contract.md) – hợp đồng API.
- [`docs/traceability-matrix.md`](docs/traceability-matrix.md) – truy vết
  Requirement → Task/Issue → code → test → bằng chứng.
- [`docs/release-notes.md`](docs/release-notes.md) – Release Notes.
- [`docs/sprint2-review-retro.md`](docs/sprint2-review-retro.md) – biên bản
  Sprint Review và Retrospective.
- [`docs/deploy-and-rollback.md`](docs/deploy-and-rollback.md) – deploy/rollback
  production do TV1 cung cấp.
- [`docs/deployment.md`](docs/deployment.md) – nguyên tắc hạ tầng và checklist
  bằng chứng.

Trước khi nộp, thay mọi `TBD` bằng URL Issue/PR, commit SHA, test report và
người xác nhận thực tế; không suy đoán số GitHub Issue hoặc kết quả deploy.

## 12. Xử lý lỗi thường gặp

- `npx.ps1 cannot be loaded`: dùng `npx.cmd`; tương tự dùng `npm.cmd`.
- `P1000 Authentication failed`: kiểm tra Docker Desktop, container `db`,
  cổng `5433` và `DATABASE_URL`.
- Frontend gọi nhầm mock: đặt `NEXT_PUBLIC_USE_MOCK=false` và restart/build
  lại frontend.
- API trả `401`: đăng nhập lại và gửi `Authorization: Bearer <JWT>`.
- Compose không build lại frontend sau khi đổi API URL: chạy lại
  `docker compose up --build -d`.
