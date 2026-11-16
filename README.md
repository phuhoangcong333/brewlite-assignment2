# brewlite-assignment2
Đồ án  BrewLite Assignment 2 - Nhóm 11
# BrewLite -- Ứng dụng đặt hàng trực tuyến

BrewLite là ứng dụng web hỗ trợ khách hàng xem thực đơn, lựa chọn sản
phẩm, quản lý giỏ hàng và đặt hàng trực tuyến. Dự án được xây dựng theo
mô hình frontend--backend, sử dụng Next.js cho giao diện, NestJS cho API
và PostgreSQL để lưu trữ dữ liệu.

Tài liệu này hướng dẫn cài đặt, khởi chạy, kiểm tra và trình diễn
BrewLite trên môi trường local bằng Docker Compose.

> **Lưu ý:** Các chức năng và địa chỉ trong tài liệu phản ánh cấu hình
> demo được mô tả cho dự án. Trước buổi trình diễn, hãy đối chiếu với
> `docker-compose.yml`, file `.env`, mã nguồn controller/service và kiểm
> thử thực tế trên nhánh sẽ dùng để demo.

------------------------------------------------------------------------

## 1. Tổng quan công nghệ

  Thành phần                     Công nghệ
  ------------------------------ -----------------------------
  Frontend                       Next.js, React, TypeScript
  Backend                        NestJS, Node.js, TypeScript
  Cơ sở dữ liệu                  PostgreSQL
  ORM                            Prisma
  Xác thực                       JSON Web Token (JWT)
  Mã hóa mật khẩu                bcrypt
  Đóng gói và triển khai local   Docker, Docker Compose

## 2. Chức năng chính

### 2.1. Tài khoản và xác thực

-   Đăng ký tài khoản.
-   Đăng nhập bằng email và mật khẩu.
-   Xác thực người dùng bằng JWT.
-   Bảo vệ các API yêu cầu đăng nhập.

### 2.2. Sản phẩm

-   Xem danh sách sản phẩm.
-   Xem thông tin chi tiết sản phẩm.
-   Lấy dữ liệu sản phẩm từ backend.

### 2.3. Giỏ hàng

-   Thêm sản phẩm vào giỏ hàng.
-   Xem danh sách sản phẩm đã chọn.
-   Thay đổi số lượng sản phẩm.
-   Cập nhật và kiểm tra tổng tiền.

### 2.4. Đặt hàng

-   Gửi yêu cầu tạo đơn hàng từ giỏ hàng.
-   Xem danh sách đơn hàng.
-   Xem chi tiết đơn hàng (nếu giao diện đã triển khai).
-   Theo dõi và cập nhật trạng thái đơn hàng theo quy tắc nghiệp vụ ở
    backend.

### 2.5. Thanh toán và tồn kho

-   Gửi yêu cầu thanh toán thông qua API.
-   Nhận và hiển thị kết quả xử lý thanh toán.
-   Kiểm tra logic cập nhật tồn kho trong quy trình đặt hàng.
-   Xử lý trạng thái đơn hàng theo luồng nghiệp vụ được triển khai.

> **Phạm vi demo:** Kết quả của từng chức năng phụ thuộc vào mã nguồn,
> cấu hình môi trường và dữ liệu hiện tại. Không nên giới thiệu một chức
> năng là hoàn thiện nếu chưa kiểm thử thành công trên môi trường demo.

## 3. Yêu cầu môi trường

Cần cài đặt các công cụ sau:

-   **Git** -- lấy mã nguồn dự án.
-   **Docker Desktop** -- chạy các container.
-   **Docker Compose** -- công cụ điều phối các service, thường được
    tích hợp trong Docker Desktop.

Trước khi thực hiện, hãy: 1. Khởi động Docker Desktop. 2. Chờ Docker
Engine chuyển sang trạng thái hoạt động. 3. Mở PowerShell hoặc Terminal
tại thư mục dự án.

## 4. Khởi chạy dự án bằng Docker Compose

### 4.1. Mở thư mục dự án

Nếu dự án đã được clone về máy, chuyển đến thư mục gốc:

``` powershell
cd brewlite
```

Thay đường dẫn trên bằng vị trí thực tế của thư mục BrewLite trên máy.

### 4.2. Kiểm tra cấu hình Compose

``` powershell
docker compose config --quiet
```

Nếu lệnh không báo lỗi, cấu hình Docker Compose có thể được phân tích
thành công.

### 4.3. Build và khởi chạy các service

``` powershell
docker compose up --build -d
```

Lệnh này build image khi cần và chạy các container ở chế độ nền.

### 4.4. Kiểm tra trạng thái

``` powershell
docker compose ps
```

Các service dự kiến:

  Service      Vai trò
  ------------ --------------------------
  `frontend`   Giao diện web Next.js
  `backend`    API NestJS
  `db`         Cơ sở dữ liệu PostgreSQL

Tên service thực tế phải khớp với tên khai báo trong
`docker-compose.yml`.

### 4.5. Xem log khi cần

Xem 100 dòng log gần nhất:

``` powershell
docker compose logs --tail=100 backend frontend db
```

Theo dõi log liên tục:

``` powershell
docker compose logs -f backend frontend db
```

Nhấn `Ctrl + C` để dừng theo dõi log. Thao tác này **không** dừng các
container đang chạy.

## 5. Địa chỉ truy cập

Theo cấu hình cổng được sử dụng cho bản demo:

  Thành phần               Địa chỉ
  ------------------------ -------------------------------------------
  Frontend                 http://localhost:3000
  Backend                  http://localhost:3001
  PostgreSQL từ máy host   `localhost:5433`
  Prisma Studio            http://localhost:5555 (sau khi khởi chạy)

Các cổng trên có thể thay đổi theo `docker-compose.yml` và biến môi
trường. Nếu không truy cập được, kiểm tra cột `PORTS` trong kết quả:

``` powershell
docker compose ps
```

## 6. Mở Prisma Studio

Prisma Studio cho phép xem và kiểm tra dữ liệu trong PostgreSQL bằng
giao diện trình duyệt.

### 6.1. Thiết lập kết nối từ PowerShell

Thực hiện tại thư mục gốc dự án. Ví dụ dưới đây lấy thông tin user và
password từ container database, sau đó tạo `DATABASE_URL` tạm thời cho
phiên PowerShell hiện tại:

``` powershell
$user = (docker compose exec -T db printenv POSTGRES_USER).Trim()
$password = (docker compose exec -T db printenv POSTGRES_PASSWORD).Trim()
$encodedPassword = [uri]::EscapeDataString($password)

$env:DATABASE_URL = "postgresql://${user}:${encodedPassword}@localhost:5433/brewlite?schema=public"
```

> Nếu tên database, user, password hoặc cổng host trong
> `docker-compose.yml` khác với ví dụ, hãy điều chỉnh cho đúng cấu hình
> thực tế. Không chia sẻ mật khẩu và không commit thông tin bí mật lên
> Git.

### 6.2. Chạy Prisma Studio

``` powershell
cd .\backend
npx.cmd prisma studio --schema prisma/schema.prisma --port 5555
```

Mở trình duyệt tại:

``` text
http://localhost:5555
```

Giữ cửa sổ terminal đang chạy Prisma Studio trong thời gian sử dụng. Khi
hoàn tất, nhấn `Ctrl + C`.

## 7. Kịch bản trình diễn

Nên thực hiện theo thứ tự dưới đây để thể hiện luồng nghiệp vụ từ lúc
khách hàng truy cập đến khi đơn hàng được ghi nhận.

  -------------------------------------------------------------------------
  Bước                    Nội dung                  Kết quả cần kiểm tra
  ----------------------- ------------------------- -----------------------
  1                       Mở trang chủ tại          Giao diện tải thành
                          `http://loc alhost:3000`   công, danh sách sản
                                                    phẩm hiển thị

  2                       Truy cập `/register` và   Hệ thống phản hồi kết
                          đăng ký tài khoản         quả đăng ký

  3                       Truy cập `/login` và đăng Đăng nhập thành công,
                          nhập                      trạng thái xác thực
                                                    được cập nhật

  4                       Chọn một sản phẩm và mở   Thông tin sản phẩm được
                          trang chi tiết            hiển thị đúng

  5                       Thêm sản phẩm vào giỏ     Giỏ hàng cập nhật đúng
                          hàng, thay đổi số lượng   sản phẩm, số lượng và
                                                    tổng tiền

  6                       Mở trang checkout và gửi  Backend tiếp nhận yêu
                          yêu cầu đặt hàng          cầu và trả kết quả phù
                                                    hợp

  7                       Thực hiện thanh toán theo Hiển thị kết quả thanh
                          giao diện hiện có         toán thành công hoặc
                                                    thất bại

  8                       Mở danh sách đơn hàng và  Thông tin và trạng thái
                          xem chi tiết (nếu có)     đơn hàng phù hợp

  9                       Kiểm tra dữ liệu bằng     Dữ liệu được lưu đúng
                          Prisma Studio             với thao tác đã thực
                                                    hiện
  -------------------------------------------------------------------------

Đường dẫn giao diện `/register`, `/login`, checkout và lịch sử đơn hàng
cần được xác nhận trong frontend trước khi trình diễn.

## 8. API tham khảo

Các endpoint dưới đây là danh sách tham khảo theo mô tả dự án. Cần đối
chiếu với controller, module và cấu hình route thực tế trước khi sử
dụng.

  -----------------------------------------------------------------------
  Phương thức             Endpoint                Mục đích
  ----------------------- ----------------------- -----------------------
  `POST`                  `/auth/register`        Đăng ký tài khoản

  `POST`                  `/auth/login`           Đăng nhập

  `GET`                   `/products`             Lấy danh sách sản phẩm

  `GET`                   `/products/:id`         Lấy chi tiết sản phẩm

  `GET`                   `/orders`               Lấy danh sách đơn hàng
                                                  của người dùng

  `POST`                  `/orders`               Tạo đơn hàng

  `PATCH`                 `/orders/:id/status`    Cập nhật trạng thái đơn
                                                  hàng theo quy tắc
                                                  backend

  `POST`                  `/payments`             Gửi yêu cầu thanh toán
  -----------------------------------------------------------------------

Địa chỉ backend theo cấu hình demo:

``` text
http://localhost:3001
```

Ví dụ lấy danh sách sản phẩm:

``` http
GET http://localhost:3001/products
```

Đối với API yêu cầu xác thực, gửi JWT trong HTTP header:

``` http
Authorization: Bearer <JWT_TOKEN>
```

Cấu trúc request, response, DTO và điều kiện xác thực cụ thể được quy
định trong mã nguồn backend.

## 9. Kiểm tra migration và cơ sở dữ liệu

### 9.1. Kiểm tra trạng thái migration

Từ thư mục gốc dự án, chạy:

``` powershell
docker compose exec backend npx prisma migrate status --schema prisma/schema.prisma
```

Nếu database đã được cập nhật theo các migration hiện có, không cần chạy
migration lại chỉ để kiểm tra.

### 9.2. Kiểm tra dữ liệu

Có thể sử dụng Prisma Studio theo hướng dẫn ở mục 6 để kiểm tra các bảng
và bản ghi liên quan, chẳng hạn tài khoản, sản phẩm, đơn hàng và chi
tiết đơn hàng (tùy schema thực tế).

Khi kiểm tra, nên đối chiếu dữ liệu trước và sau thao tác đặt hàng để
xác nhận kết quả được lưu đúng.

## 10. Build và kiểm thử trước buổi demo

### 10.1. Build image

``` powershell
docker compose build
```

### 10.2. Khởi chạy lại ứng dụng

``` powershell
docker compose up --build -d
```

Backend sẽ tự chạy `prisma migrate deploy` và `prisma db seed` khi khởi động,
trước khi mở API. Đảm bảo đã tạo `backend/.env` từ `.env.example`; Compose tự
nạp file này để seed tài khoản nhân viên.

### 10.3. Kiểm tra container

``` powershell
docker compose ps
```

### 10.4. Kiểm tra log backend và frontend

``` powershell
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
```

### 10.5. Checklist trước khi trình diễn

-   [ ] Docker Desktop đang hoạt động.
-   [ ] `docker compose config --quiet` chạy không lỗi.
-   [ ] Các container cần thiết ở trạng thái hoạt động.
-   [ ] Frontend truy cập được.
-   [ ] Backend khởi động thành công.
-   [ ] PostgreSQL kết nối được.
-   [ ] Đăng ký tài khoản hoạt động.
-   [ ] Đăng nhập và xác thực JWT hoạt động.
-   [ ] Danh sách và chi tiết sản phẩm hiển thị.
-   [ ] Thêm sản phẩm vào giỏ hàng hoạt động.
-   [ ] Thay đổi số lượng và tính tổng tiền chính xác.
-   [ ] Tạo đơn hàng hoạt động.
-   [ ] Thanh toán trả về kết quả phù hợp với phạm vi demo.
-   [ ] Danh sách/chi tiết đơn hàng hoạt động (nếu đã triển khai).
-   [ ] Dữ liệu trong database phù hợp với thao tác kiểm thử.

## 11. Xử lý lỗi thường gặp

### 11.1. Docker không khởi động

-   Kiểm tra Docker Desktop đã mở và Docker Engine đã sẵn sàng.
-   Kiểm tra cấu hình Compose:

``` powershell
docker compose config --quiet
docker compose ps
```

### 11.2. Frontend hoặc backend build thất bại

Đọc thông báo lỗi trong terminal hoặc log. Kiểm tra dependency, lỗi
TypeScript, cấu hình môi trường và Dockerfile. Sau khi sửa, chạy lại:

``` powershell
docker compose up --build -d
```

### 11.3. Backend không kết nối được database

Kiểm tra: - Service `db` có đang chạy không. - `DATABASE_URL` có đúng
thông tin kết nối không. - Backend trong Docker Compose phải dùng
hostname service database và cổng nội bộ, thường là `db:5432`. - Ứng
dụng chạy trực tiếp trên máy host có thể dùng `localhost:5433` nếu
Compose ánh xạ cổng như cấu hình demo.

Không dùng `localhost:5433` làm hostname database từ bên trong container
backend, trừ khi cấu hình mạng đặc biệt yêu cầu điều đó.

### 11.4. API trả về `Cannot GET` hoặc `Cannot POST`

Kiểm tra: - Địa chỉ và cổng backend. - Đường dẫn, phương thức HTTP có
đúng không. - Controller đã khai báo endpoint chưa. - Module chứa
controller đã được đăng ký trong `AppModule` chưa. - Frontend có gọi
đúng API base URL không. - Backend đã được build và khởi động lại sau
khi thay đổi mã nguồn chưa.

### 11.5. API trả về `401 Unauthorized`

Kiểm tra: - Người dùng đã đăng nhập chưa. - JWT có hợp lệ và còn hạn
không. - Request có gửi header `Authorization: Bearer <JWT_TOKEN>`
không. - Guard và cấu hình JWT ở backend có hoạt động đúng không.

### 11.6. Không truy cập được Prisma Studio

Kiểm tra: - Prisma Studio đã khởi chạy thành công chưa. - `DATABASE_URL`
có trỏ đến đúng database không. - Cổng `5555` có đang được ứng dụng khác
sử dụng không. - Terminal chạy Prisma Studio có bị đóng không.

## 12. Dừng ứng dụng

Để dừng và xóa các container do Compose quản lý:

``` powershell
docker compose down
```

Thông thường, lệnh này không xóa volume dữ liệu PostgreSQL. **Không thêm
tùy chọn `-v`** nếu muốn giữ lại dữ liệu trong volume.

## 13. Kết luận

BrewLite minh họa quy trình đặt hàng trực tuyến từ đăng ký, đăng nhập,
xem sản phẩm, quản lý giỏ hàng đến tạo đơn và xử lý thanh toán. Docker
Compose giúp thống nhất môi trường chạy frontend, backend và database,
hỗ trợ nhóm triển khai và kiểm thử tích hợp trên máy local.

Dự án được xây dựng phục vụ mục đích học tập và trình diễn. Trước khi
triển khai thực tế, cần tiếp tục đánh giá bảo mật, xử lý lỗi, tính nhất
quán dữ liệu, khả năng mở rộng và tích hợp thanh toán với nhà cung cấp
phù hợp.
