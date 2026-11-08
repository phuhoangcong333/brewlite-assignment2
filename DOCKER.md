# Chạy BrewLite bằng Docker

## Cài đặt vào repo
Giải nén, copy các file vào thư mục gốc `brewlite/`, giữ đúng vị trí:

```
brewlite/
  docker-compose.yml
  backend/Dockerfile        backend/.dockerignore
  frontend/Dockerfile       frontend/.dockerignore
```

## Chạy
1. Mở Docker Desktop, đợi biểu tượng xanh.
2. Tạo `backend/.env` từ `backend/.env.example`, đặt `JWT_SECRET`,
   `STAFF_EMAIL` và `STAFF_PASSWORD`.
3. Ở thư mục gốc `brewlite`:
   ```
   docker compose up --build -d
   ```
   Lệnh này build image, khởi động database; backend tự chạy migration và seed
   trước khi mở API. Lần đầu mất vài phút (tải image, cài thư viện, build).
4. Mở:
   - Web: http://localhost:3000
   - API: http://localhost:3001/products (phải ra 8 món)

## Lệnh hay dùng
| Lệnh | Việc |
|---|---|
| `docker compose up --build` | Dựng và chạy (thấy log) |
| `docker compose up --build -d` | Dựng và chạy nền; backend tự migrate/seed |
| `docker compose ps` | Xem 3 dịch vụ có chạy không |
| `docker compose logs backend` | Xem log backend khi lỗi |
| `docker compose down` | Tắt (giữ dữ liệu) |
| `docker compose down -v` | Tắt và xóa luôn dữ liệu database |

## Lỗi hay gặp
| Hiện tượng | Cách xử lý |
|---|---|
| `port is already allocated` ở 3000 hoặc 3001 | Tắt `npm run dev` / `start:dev` đang chạy trên máy |
| `port is already allocated` ở 5433 | Đổi `"5433:5432"` thành cổng khác, ví dụ `"5434:5432"` |
| Backend báo lỗi migrate | Repo thiếu thư mục `backend/prisma/migrations` (TV5 phải commit) |
| Backend báo `Cannot find module './product/...'` | Đổi tên thư mục `product` thành chữ thường (Linux phân biệt hoa thường) |
| Sửa code mà web không đổi | Chạy lại với `--build` |
| Database lệch lạc | `docker compose down -v` rồi `docker compose up --build` |

## Đoạn dán vào README
```markdown
## Chạy bằng Docker (khuyến nghị)
Yêu cầu: Docker Desktop.

    docker compose up --build

Web: http://localhost:3000 - API: http://localhost:3001
Tắt: `docker compose down`
```
