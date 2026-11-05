# brewlite-assignment2
Đồ án  BrewLite Assignment 2 - Nhóm 11
BrewLite – Demo ứng dụng đặt hàng
1. Giới thiệu
BrewLite là ứng dụng web hỗ trợ người dùng xem sản phẩm, quản lý giỏ hàng và đặt hàng trực tuyến. Dự án được xây dựng với frontend Next.js, backend NestJS và cơ sở dữ liệu PostgreSQL.

README này hướng dẫn khởi chạy dự án bằng Docker Compose và trình diễn các chức năng chính trên môi trường local.
2. Công nghệ sử dụng
Thành phần	Công nghệ
Frontend	Next.js, React, TypeScript
Backend	NestJS, Node.js, TypeScript
Database	PostgreSQL
ORM	Prisma
Xác thực	JWT
Bảo vệ mật khẩu	bcrypt
Đóng gói và chạy ứng dụng	Docker, Docker Compose


3. Chức năng demo
3.1. Tài khoản và xác thực
- Đăng ký tài khoản.
- Đăng nhập bằng email và mật khẩu.
- Xác thực người dùng bằng JWT.
- Bảo vệ các API yêu cầu đăng nhập.
3.2. Sản phẩm
- Xem danh sách sản phẩm.
- Xem chi tiết sản phẩm.
- Lấy dữ liệu sản phẩm từ backend.
3.3. Giỏ hàng
- Thêm sản phẩm vào giỏ hàng.
- Xem các sản phẩm đã chọn.
- Thay đổi số lượng và kiểm tra tổng tiền.
3.4. Đặt hàng
- Xem thông tin đơn hàng.
- Gửi yêu cầu tạo đơn hàng.
- Theo dõi danh sách đơn hàng và chi tiết đơn hàng.
- Quản lý trạng thái đơn hàng theo các quy tắc được triển khai trong backend.
3.5. Thanh toán và tồn kho
- Gửi yêu cầu đến API thanh toán.
- Kiểm tra kết quả xử lý thanh toán.
- Kiểm tra logic cập nhật và xác nhận tồn kho theo luồng xử lý đơn hàng.
Lưu ý: Kết quả thực tế của từng chức năng phụ thuộc vào cấu hình môi trường và mã nguồn hiện tại. Cần kiểm thử trước khi trình diễn chính thức.

4. Yêu cầu trước khi chạy
Cần cài đặt:
- Git.
- Docker Desktop.
- Docker Compose được tích hợp trong Docker Desktop.
Khởi động Docker Desktop trước khi chạy các lệnh bên dưới.
5. Khởi chạy bằng Docker Compose
Mở Terminal tại thư mục gốc của dự án:
cd brewlite
Kiểm tra cấu hình Docker Compose:
docker compose config --quiet
Nếu không có lỗi, build và khởi chạy ứng dụng:
docker compose up --build -d
Kiểm tra trạng thái các service:
docker compose ps
Các service dự kiến gồm:
- frontend: giao diện web.
- backend: API.
- db: PostgreSQL.
Xem log nếu cần:
docker compose logs --tail=100 backend frontend db
Để theo dõi log liên tục:
docker compose logs -f backend frontend db
Nhấn Ctrl + C để ngừng theo dõi log. Thao tác này không đồng nghĩa với việc dừng các container.
cd brewlite

$user = (docker compose exec -T db printenv POSTGRES_USER).Trim()
$password = (docker compose exec -T db printenv POSTGRES_PASSWORD).Trim()
$encodedPassword = [uri]::EscapeDataString($password)
$env:DATABASE_URL = "postgresql://${user}:${encodedPassword}@localhost:5433/brewlite?schema=public"

cd .\backend
npx.cmd prisma studio --schema prisma/schema.prisma --port 5555
6. Địa chỉ truy cập
Theo cấu hình Docker đã sử dụng trong quá trình demo:
Thành phần	Địa chỉ
Frontend	http://localhost:3000
Backend	http://localhost:3001
PostgreSQL trên máy host	localhost:5433
Prisma Studio	http://localhost:5555, nếu đã khởi chạy


Lưu ý: Cổng có thể thay đổi nếu file docker-compose.yml được chỉnh sửa. Khi địa chỉ không truy cập được, kiểm tra cột PORTS bằng lệnh docker compose ps.
7. Kịch bản demo trực tiếp
Bước 1 – Mở trang chủ
Truy cập http://localhost:3000.

Kiểm tra trang chủ có hiển thị giao diện và danh sách sản phẩm hay không.
Bước 2 – Đăng ký tài khoản
Mở trang đăng ký: http://localhost:3000/register.

Nhập thông tin tài khoản hợp lệ và gửi biểu mẫu. Kiểm tra thông báo kết quả.
Bước 3 – Đăng nhập
Mở trang đăng nhập: http://localhost:3000/login.

Đăng nhập bằng tài khoản đã tạo. Kiểm tra xem hệ thống có xử lý thông tin xác thực và lưu trạng thái đăng nhập theo cách triển khai của dự án hay không.
Bước 4 – Xem sản phẩm
Quay lại trang chủ, chọn một sản phẩm và mở trang chi tiết. Kiểm tra thông tin hiển thị và khả năng lấy dữ liệu từ backend.
Bước 5 – Thêm vào giỏ hàng
Thêm sản phẩm vào giỏ hàng. Thử thay đổi số lượng và kiểm tra tổng tiền được cập nhật.
Bước 6 – Đặt hàng
Đi đến trang checkout, kiểm tra thông tin sản phẩm và gửi yêu cầu đặt hàng. Nếu hệ thống yêu cầu đăng nhập, hãy đăng nhập trước khi tiếp tục.
Bước 7 – Kiểm tra thanh toán
Thử gửi yêu cầu thanh toán theo giao diện hiện có. Kiểm tra kết quả trả về và thông báo thành công hoặc thất bại.
Bước 8 – Xem lịch sử đơn hàng
Mở trang danh sách đơn hàng và chọn một đơn hàng để xem chi tiết nếu các trang này đã được triển khai. Kiểm tra trạng thái đơn hàng sau khi thực hiện thao tác.
Bước 9 – Kiểm tra dữ liệu
Kiểm tra dữ liệu trong PostgreSQL hoặc Prisma Studio để xác nhận các thay đổi đã được lưu đúng.
8. API chính
Các endpoint dưới đây dựa trên controller trong backend; những API có yêu cầu xác thực cần gửi JWT hợp lệ.
Phương thức	Endpoint	Mục đích
POST	/auth/register	Đăng ký tài khoản
POST	/auth/login	Đăng nhập
GET	/products	Lấy danh sách sản phẩm
GET	/products/:id	Lấy chi tiết sản phẩm
GET	/orders	Lấy danh sách đơn hàng của người dùng
POST	/orders	Tạo đơn hàng
PATCH	/orders/:id/status	Thay đổi trạng thái đơn hàng theo quy tắc backend
POST	/payments	Gửi yêu cầu thanh toán


Địa chỉ đầy đủ của backend trong cấu hình Docker hiện tại có dạng:
http://localhost:3001
Ví dụ, endpoint xem sản phẩm:
GET http://localhost:3001/products
Đối với API yêu cầu JWT, sử dụng HTTP header:
Authorization: Bearer <JWT_TOKEN>
Cấu trúc request, response và điều kiện xác thực cụ thể được quy định trong DTO, controller và service của backend.
9. Kiểm tra database và Prisma
Kiểm tra trạng thái migration từ backend container:
docker compose exec backend npx prisma migrate status --schema prisma/schema.prisma
Nếu kết quả cho biết database đã cập nhật theo các migration hiện có, không cần chạy migration lại chỉ để kiểm tra.
Mở Prisma Studio
Nếu muốn dùng giao diện Prisma Studio, có thể chạy từ thư mục backend trên máy host sau khi đã cài dependency và cấu hình DATABASE_URL trỏ đến database Docker qua cổng host 5433:
cd backend
npx.cmd prisma studio --schema prisma/schema.prisma --port 5555
Mở trình duyệt tại http://localhost:5555.

Nếu DATABASE_URL chưa được cấu hình hoặc không trỏ đến database phù hợp, cần thiết lập lại biến môi trường trước khi chạy. Không chia sẻ mật khẩu database hoặc commit file .env lên Git.
10. Build và kiểm thử trước khi demo
Build các image:
docker compose build
Khởi chạy lại các service:
docker compose up --build -d
Kiểm tra trạng thái:
docker compose ps
Kiểm tra log khi có lỗi:
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
Checklist kiểm thử:
- [ ] Frontend mở được.
- [ ] Backend khởi động không có lỗi.
- [ ] PostgreSQL đang hoạt động.
- [ ] Đăng ký tài khoản hoạt động.
- [ ] Đăng nhập và xác thực JWT hoạt động.
- [ ] Danh sách và chi tiết sản phẩm hiển thị.
- [ ] Thêm sản phẩm vào giỏ hàng hoạt động.
- [ ] Tổng tiền được tính đúng.
- [ ] Tạo đơn hàng hoạt động.
- [ ] API thanh toán trả về kết quả phù hợp.
- [ ] Danh sách và chi tiết đơn hàng hiển thị.
- [ ] Dữ liệu trong database phù hợp với thao tác đã thực hiện.
11. Xử lý lỗi thường gặp
Docker không khởi động được
Kiểm tra Docker Desktop đã chạy và kiểm tra cấu hình:
docker compose config --quiet
docker compose ps
Backend hoặc frontend build thất bại
Xem log build và thông báo lỗi TypeScript. Sửa lỗi được báo trước khi chạy lại:
docker compose up --build -d
Không kết nối được database
Kiểm tra service db, cấu hình DATABASE_URL và cổng kết nối. Trong Docker Compose, backend thường kết nối đến hostname service db và cổng nội bộ 5432, trong khi máy host có thể truy cập qua cổng 5433.
Nhận lỗi Cannot GET hoặc Cannot POST
Kiểm tra:
- Đúng địa chỉ và cổng backend.
- Endpoint có được khai báo trong controller không.
- Module chứa controller đã được đăng ký trong AppModule chưa.
- Frontend gọi đúng đường dẫn API chưa.
- Backend đã build và khởi động lại sau khi sửa code chưa.
API trả về 401 Unauthorized
Kiểm tra người dùng đã đăng nhập chưa, token có hợp lệ không và request có gửi header Authorization: Bearer <JWT_TOKEN> không.
12. Dừng ứng dụng
Dừng các container:
docker compose down
Lệnh trên dừng và xóa container do Compose quản lý nhưng thông thường không xóa volume dữ liệu. Không sử dụng tùy chọn -v nếu muốn giữ lại dữ liệu PostgreSQL.
13. Kết luận
BrewLite cung cấp luồng demo từ tài khoản, sản phẩm, giỏ hàng đến đặt hàng, thanh toán và quản lý đơn hàng. Trước khi báo cáo hoặc trình diễn, cần chạy checklist kiểm thử để xác nhận những chức năng đã hoạt động đúng trên môi trường thực tế.

Dự án phục vụ mục đích học tập và kiểm thử tích hợp. Cấu hình bảo mật, dữ liệu và quy trình thanh toán cần được đánh giá thêm trước khi sử dụng trong môi trường sản xuất.
