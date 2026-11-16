# Traceability Matrix – BrewLite

> **Nguồn:** SRS BrewLite v0.6 và bảng 14 GitHub Issues Sprint 1–2 đã thống nhất trong nhóm.  
> **Mục đích:** Truy vết xuyên suốt Task 1–5: yêu cầu (FR/NFR) → User Story/Use Case → sơ đồ/ADR → GitHub Issue/PR/commit → thành phần code → Test Case/bằng chứng → nghiệm thu.  
> **Lưu ý:** Do bảng Issues đã thống nhất mới có tiêu đề và phân công, chưa có số `#` GitHub trong nội dung trao đổi, ma trận dùng mã tham chiếu S1-I1…S2-I7 và nguyên tiêu đề Issue. Thay bằng số `#`/URL thật khi cập nhật repository. Đường dẫn code và mã Test Case dưới đây là vị trí/mã dự kiến, chưa khẳng định đã được triển khai hoặc kiểm thử.

## 1. Quy ước trạng thái

| Trạng thái | Ý nghĩa |
|---|---|
| Chưa xác nhận | Chưa có bằng chứng code/test hoặc chưa đối chiếu repository. |
| Đang thực hiện | Đang triển khai theo Issue tương ứng. |
| Đã triển khai | Code đã có và được xác nhận trong PR/nhánh tích hợp. |
| Đã kiểm thử | Test đã chạy và có kết quả minh chứng. |
| Chưa có Issue riêng | Yêu cầu chưa được bao phủ rõ bởi 14 Issue hiện tại; cần bổ sung vào Issue phù hợp hoặc tạo Issue riêng. |

## 2. Danh mục GitHub Issues được dùng trong ma trận

### Sprint 1 – Tái cấu trúc & Xây dựng API cốt lõi

| Mã tham chiếu | Tiêu đề Issue | Assignee | Milestone | Labels |
|---|---|---|---|---|
| S1-I1 | `[S1][TV1] Duy trì AWS EC2, RDS và thiết lập CI` | TV1 | Sprint 1 | `deployment`, `database` |
| S1-I2 | `[S1][TV2] Tích hợp giao diện vào Next.js và dựng API Client` | TV2 | Sprint 1 | `frontend`, `enhancement` |
| S1-I3 | `[S1][TV3] Tích hợp xử lý khuyến mãi phía Backend` | TV3 | Sprint 1 | `backend`, `enhancement` |
| S1-I4 | `[S1][TV4] Tích hợp xử lý đơn hàng và Optimistic Locking` | TV4 | Sprint 1 | `backend`, `database`, `enhancement` |
| S1-I5 | `[S1][TV5] Tích hợp thanh toán và Idempotency` | TV5 | Sprint 1 | `backend`, `enhancement` |
| S1-I6 | `[S1][TV6] Xây dựng State Machine cho trạng thái đơn hàng` | TV6 | Sprint 1 | `backend`, `enhancement` |
| S1-I7 | `[S1][TV7] Xây dựng API xác thực JWT và các Guard` | TV7 | Sprint 1 | `backend`, `authentication` |

### Sprint 2 – Tích hợp, Deploy thật & Đóng gói báo cáo

| Mã tham chiếu | Tiêu đề Issue | Assignee | Milestone | Labels |
|---|---|---|---|---|
| S2-I1 | `[S2][TV1] Deploy hệ thống lên AWS EC2 và kiểm thử E2E` | TV1 | Sprint 2 | `deployment`, `testing`, `documentation` |
| S2-I2 | `[S2][TV2] Tích hợp Frontend với API thật và JWT` | TV2 | Sprint 2 | `frontend`, `authentication`, `enhancement` |
| S2-I3 | `[S2][TV3] Kiểm thử và hoàn thiện API khuyến mãi` | TV3 | Sprint 2 | `backend`, `testing`, `documentation` |
| S2-I4 | `[S2][TV4] Kiểm thử và hoàn thiện API đơn hàng` | TV4 | Sprint 2 | `backend`, `testing`, `documentation` |
| S2-I5 | `[S2][TV5] Kiểm thử và hoàn thiện API thanh toán` | TV5 | Sprint 2 | `backend`, `testing`, `documentation` |
| S2-I6 | `[S2][TV6] Kiểm thử và hoàn thiện API trạng thái đơn hàng` | TV6 | Sprint 2 | `backend`, `testing`, `documentation` |
| S2-I7 | `[S2][TV7] Tổng hợp ADR và hoàn thiện architecture.md` | TV7 | Sprint 2 | `documentation` |

## 3. Ma trận truy vết yêu cầu chức năng (FR)

| Requirement ID | Nội dung yêu cầu | User Story | Issue Sprint 1 | Issue Sprint 2 | Chủ trì theo SRS | Thành phần code dự kiến | Test Case đề xuất | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| FR-01 | Hiển thị danh sách sản phẩm | US-01 | S1-I2 (UI); **thiếu Issue Backend Menu riêng** | S2-I2 (tích hợp API) | TV1 | `apps/api/.../products`; `apps/web/.../menu` | TC-FR-01 | Chưa xác nhận |
| FR-02 | Lọc sản phẩm theo danh mục | US-01 | S1-I2 (UI); **thiếu Issue Backend Menu riêng** | S2-I2 | TV1 | Products API / Menu UI | TC-FR-02 | Chưa xác nhận |
| FR-03 | Hiển thị trạng thái hết hàng | US-01 | S1-I2 | S2-I2 | TV1 | Product stock / Menu UI | TC-FR-03 | Chưa xác nhận |
| FR-04 | Loading, Empty, Error/Retry khi tải Menu | US-01 | S1-I2 | S2-I2 | TV1 | Menu page/components | TC-FR-04 | Chưa xác nhận |
| FR-05 | Tìm kiếm sản phẩm (ngoài MVP) | US-01 | Không triển khai theo SRS | Không triển khai theo SRS | TV1 | Không áp dụng MVP | TC-FR-05 (N/A) | Won't Have |
| FR-06 | Xem chi tiết sản phẩm | US-02 | S1-I2 | S2-I2 | TV2 | Product detail page | TC-FR-06 | Chưa xác nhận |
| FR-07 | Lấy chi tiết sản phẩm qua `GET /products/:id` | US-02 | S1-I2 (API Client/mock); backend endpoint cần xác nhận | S2-I2 | TV2 | Products detail API / API client | TC-FR-07 | Chưa xác nhận |
| FR-08 | Chọn Size S/M/L | US-02 | S1-I2 | S2-I2 | TV2 | Product detail / Size selector | TC-FR-08 | Chưa xác nhận |
| FR-09 | Chọn Topping khả dụng | US-02 | S1-I2 | S2-I2 | TV2 | Product detail / Topping selector | TC-FR-09 | Chưa xác nhận |
| FR-10 | Cập nhật giá theo Size và Topping | US-02 | S1-I2 (UI/mock); giá có thẩm quyền phải do server xử lý theo SRS | S2-I2; phối hợp S2-I3 khi báo giá | TV2 | Product detail / pricing API | TC-FR-10 | Chưa xác nhận |
| FR-11 | Chọn số lượng sản phẩm | US-02 | S1-I2 | S2-I2 | TV2 | Quantity selector | TC-FR-11 | Chưa xác nhận |
| FR-12 | Nhập ghi chú cho món | US-02 | S1-I2 | S2-I2 | TV2 | Product detail form | TC-FR-12 | Chưa xác nhận |
| FR-13 | Không cho chọn topping hết hàng | US-02 | S1-I2 | S2-I2 | TV2 | Product detail / stock validation | TC-FR-13 | Chưa xác nhận |
| FR-14 | Thêm sản phẩm kèm tùy chọn vào giỏ | US-02 | S1-I2 | S2-I2 | TV2 | Product detail → Cart state | TC-FR-14 | Chưa xác nhận |
| FR-15 | Thêm món vào giỏ, gộp dòng trùng cấu hình | US-03 | S1-I3 | S2-I3 | TV3 | Cart store/service | TC-FR-15 | Chưa xác nhận |
| FR-16 | Tăng/giảm số lượng trong giỏ | US-03 | S1-I3 | S2-I3 | TV3 | Cart store/components | TC-FR-16 | Chưa xác nhận |
| FR-17 | Xóa dòng hoặc làm trống giỏ | US-03 | S1-I3 | S2-I3 | TV3 | Cart store/components | TC-FR-17 | Chưa xác nhận |
| FR-18 | Sửa Size/Topping/ghi chú trong giỏ | US-03 | S1-I3 | S2-I3 | TV3 | Cart components/store | TC-FR-18 | Chưa xác nhận |
| FR-19 | Giới hạn số lượng và số dòng giỏ | US-03 | S1-I3 | S2-I3 | TV3 | Cart validation / DTO | TC-FR-19 | Chờ TV2 chốt giới hạn theo SRS |
| FR-20 | Server báo giá và tính tổng tiền | US-03 | S1-I3 | S2-I3 | TV3 | Promotions/pricing service | TC-FR-20 | Chưa xác nhận |
| FR-21 | Lưu và khôi phục giỏ bằng localStorage | US-03 | S1-I3 | S2-I3 | TV3 | Cart persistence | TC-FR-21 | Chưa xác nhận |
| FR-22 | Hiển thị giỏ rỗng | US-03 | S1-I3 | S2-I3 | TV3 | Cart page | TC-FR-22 | Chưa xác nhận |
| FR-23 | Kiểm tra hết hàng/thay đổi giá trong giỏ | US-03 | S1-I3 | S2-I3 | TV3 | Cart validation / pricing API | TC-FR-23 | Chưa xác nhận |
| FR-24 | Áp dụng mã khuyến mãi | US-03 | S1-I3 | S2-I3 | TV3 | `POST /promotions/validate` | TC-FR-24 | Chưa xác nhận |
| FR-25 | Gỡ mã khuyến mãi | US-03 | S1-I3 | S2-I3 | TV3 | Cart / promotion state | TC-FR-25 | Chưa xác nhận |
| FR-26 | Chuyển giỏ hợp lệ sang checkout | US-03 | S1-I3; phối hợp S1-I4 | S2-I3; phối hợp S2-I4 | TV3 | Cart → Checkout payload | TC-FR-26 | Chưa xác nhận |
| FR-27 | Tạo Order và OrderItem từ giỏ | US-04 | S1-I4 | S2-I4 | TV4 | Orders module / `POST /orders` | TC-FR-27 | Chưa xác nhận |
| FR-28 | Kiểm tra và trừ kho trong transaction, tránh kho âm | US-04 | S1-I4 | S2-I4 | TV4 | Orders service / Prisma transaction | TC-FR-28 | Chưa xác nhận |
| FR-29 | Cung cấp hàm nội bộ hoàn kho khi hủy đơn chưa thanh toán | US-04, US-06.1 | S1-I4 | S2-I4; phối hợp S2-I6 | TV4 (hàm hoàn kho), TV6 (điều phối hủy) | Inventory/order service | TC-FR-29 | Chưa xác nhận |
| FR-30 | Thanh toán bằng Ví/Thẻ mô phỏng | US-05 | S1-I5 | S2-I5 | TV5 | Payments module / `POST /payments` | TC-FR-30 | Chưa xác nhận |
| FR-31 | Chống thanh toán trùng bằng Idempotency-Key | US-05 | S1-I5 | S2-I5 | TV5 | Payment service / idempotency storage | TC-FR-31 | Chưa xác nhận |
| FR-32 | Xử lý thanh toán thất bại và cho thử lại | US-05 | S1-I5 | S2-I5 | TV5 | Payment service / payment UI | TC-FR-32 | Chưa xác nhận |
| FR-33 | Cập nhật đơn sang PAID khi thanh toán thành công | US-05 | S1-I5 | S2-I5 | TV5 | Payment service / Order update | TC-FR-33 | Chưa xác nhận |
| FR-34 | Hiển thị xác nhận đơn sau khi tạo thành công | US-06 | S1-I6 | S2-I6 | TV6 | Order confirmation page | TC-FR-34 | Chưa xác nhận |
| FR-35 | Xem lịch sử đơn của người dùng hiện tại | US-06 | S1-I6 | S2-I6 | TV6 | `GET /orders` / Order history | TC-FR-35 | Chưa xác nhận |
| FR-36 | Xem chi tiết đơn của chính người dùng | US-06 | S1-I6 | S2-I6 | TV6 | `GET /orders/:id` | TC-FR-36 | Chưa xác nhận |
| FR-37 | Theo dõi trạng thái đơn, tự làm mới 5–10 giây | US-06 | S1-I6 | S2-I6 | TV6 | Order tracking UI / polling | TC-FR-37 | Chưa xác nhận |
| FR-38 | Nhân viên cập nhật trạng thái/hủy đơn theo State Machine | US-06.1 | S1-I6 | S2-I6 | TV6 | `PATCH /orders/:id/status` / state machine | TC-FR-38 | Chưa xác nhận |
| FR-39 | Ghi điểm khi đơn COMPLETED, không cộng trùng | US-06.2 | S1-I6 | S2-I6 | TV6 | LoyaltyTransaction service/model | TC-FR-39 | Chưa xác nhận |
| FR-40 | Đăng ký tài khoản | US-07.1 | S1-I7 | S2-I7 | TV7 | Auth module / `POST /auth/register` | TC-FR-40 | Chưa xác nhận |
| FR-41 | Đăng nhập và cấp JWT | US-07.1, US-07.2 | S1-I7 | S2-I7 | TV7 | Auth module / `POST /auth/login` | TC-FR-41 | Chưa xác nhận |
| FR-42 | Bảo vệ API bằng JWT | US-07.1, US-07.2 | S1-I7 | S2-I7 | TV7 | JwtAuthGuard | TC-FR-42 | Chưa xác nhận |
| FR-43 | Phân quyền CUSTOMER/STAFF | US-07.2 | S1-I7 | S2-I7 | TV7 | RolesGuard / Role enum | TC-FR-43 | Chưa xác nhận |
| FR-44 | Trang đăng nhập/đăng ký và chặn route checkout | US-07.1 | S1-I7; phối hợp S1-I2 | S2-I2; phối hợp S2-I7 | TV7 (xác thực), TV2 (UI) | Auth pages / route guard | TC-FR-44 | Chưa xác nhận |
| FR-45 | Xử lý JWT hết hạn ở Frontend | US-07.1 | S1-I7; phối hợp S1-I2 | S2-I2 | TV7 (quy tắc), TV2 (Frontend) | API client / auth context | TC-FR-45 | Chưa xác nhận |
| FR-46 | Health check API và Database | US-07.3 | S1-I7; phối hợp S1-I1 | S2-I1; phối hợp S2-I7 | TV7 | `GET /health` | TC-FR-46 | Chưa xác nhận |
| FR-47 | Đăng xuất và xóa phiên tại thiết bị hiện tại | US-07.1 | S1-I7; phối hợp S1-I2 | S2-I2 | TV7 (quy tắc), TV2 (Frontend) | Auth context / logout | TC-FR-47 | Chưa xác nhận |

## 4. Ma trận truy vết yêu cầu phi chức năng (NFR)

| Requirement ID | Nội dung yêu cầu | Issue Sprint 1 | Issue Sprint 2 | Chủ trì | Thành phần code/hạ tầng dự kiến | Test Case đề xuất | Trạng thái |
|---|---|---|---|---|---|---|---|
| NFR-01 | `GET /products` phản hồi dưới 500 ms theo tiêu chí SRS | S1-I2 (API/menu cần xác nhận) | S2-I2 (tích hợp/đo API) | TV1 | Products API | TC-NFR-01 | Chưa xác nhận |
| NFR-02 | Menu hiển thị dưới 3 giây trên mạng mobile/4G giả lập | S1-I2 | S2-I2 | TV1 | Menu page/assets | TC-NFR-02 | Chưa xác nhận |
| NFR-03 | Khởi chạy Web, API, DB bằng Docker Compose | S1-I1; phối hợp S1-I2 | S2-I1 | TV1 | `docker-compose.yml` / workflows | TC-NFR-03 | Chưa xác nhận |
| NFR-04 | Production HTTPS và health check hoạt động | S1-I1; phối hợp S1-I7 | S2-I1 | TV1 | AWS/EC2, reverse proxy, `/health` | TC-NFR-04 | Chưa xác nhận |
| NFR-05 | Pipeline deploy và hướng dẫn rollback | S1-I1 | S2-I1 | TV1 | GitHub Actions / deployment docs | TC-NFR-05 | Chưa xác nhận |
| NFR-06 | Trang chi tiết và điều khiển ưu tiên mobile-first | S1-I2 | S2-I2 | TV2 | Product detail UI | TC-NFR-06 | Chưa xác nhận |
| NFR-07 | Giao diện responsive, không chồng lấn/tràn ngang | S1-I2 | S2-I2 | TV2 | Frontend styles/components | TC-NFR-07 | Chưa xác nhận |
| NFR-08 | PWA cơ bản: Manifest và icon hợp lệ | S1-I2 | S2-I2 | TV2 | `manifest`, icons, PWA config | TC-NFR-08 | Chưa xác nhận |
| NFR-09 | API báo giá phản hồi dưới 500 ms theo tiêu chí SRS | S1-I3 | S2-I3 | TV3 | Promotions/pricing service | TC-NFR-09 | Chưa xác nhận |
| NFR-10 | Server là nguồn tính giá có thẩm quyền, không tin giá Client | S1-I3 | S2-I3 | TV3 | Pricing service / DTO validation | TC-NFR-10 | Chưa xác nhận |
| NFR-11 | localStorage lỗi/bị chặn không làm Frontend crash | S1-I3 | S2-I3 | TV3 | Cart persistence | TC-NFR-11 | Chưa xác nhận |
| NFR-12 | Giỏ hàng usable trên mobile, không cuộn ngang tại 360×640 | S1-I3 | S2-I3 | TV3 | Cart UI/styles | TC-NFR-12 | Chưa xác nhận |
| NFR-13 | Unit test logic giỏ và khuyến mãi chạy trong CI | S1-I3; phối hợp S1-I1 | S2-I3; phối hợp S2-I1 | TV3 | Cart/promotion tests, CI | TC-NFR-13 | Chưa xác nhận |
| NFR-14 | Xử lý đồng thời không làm tồn kho âm | S1-I4 | S2-I4 | TV4 | Order/inventory transaction | TC-NFR-14 | Chưa xác nhận |
| NFR-15 | Nhiều request cùng Idempotency-Key chỉ tạo một Payment | S1-I5 | S2-I5 | TV5 | Payment/idempotency service | TC-NFR-15 | Chưa xác nhận |
| NFR-16 | P95 `POST /payments` dưới 1.000 ms với 20 request local | S1-I5 | S2-I5 | TV5 | Payments API | TC-NFR-16 | Chưa xác nhận |
| NFR-17 | Password băm bcrypt có salt; không lộ password/passwordHash | S1-I7 | S2-I7 | TV7 | Auth service / User model | TC-NFR-17 | Chưa xác nhận |
| NFR-18 | JWT có hạn dùng và ký bằng secret môi trường | S1-I7 | S2-I7 | TV7 | JWT strategy/config | TC-NFR-18 | Chưa xác nhận |
| NFR-19 | Secret không commit vào repo hoặc log CI | S1-I1, S1-I7 | S2-I1, S2-I7 | TV1, TV7 | GitHub Secrets / `.gitignore` / CI | TC-NFR-19 | Chưa xác nhận |
| NFR-20 | Validate input, lỗi thống nhất, không lộ stack trace/SQL | S1-I7 và các Issue Backend | S2-I3 đến S2-I6; S2-I7 | TV7 và Backend | ValidationPipe / exception filter | TC-NFR-20 | Chưa xác nhận |
| NFR-21 | Kiểm tra biến môi trường và DB khi khởi động | S1-I1, S1-I7 | S2-I1, S2-I7 | TV1, TV7 | ConfigModule / health / deployment config | TC-NFR-21 | Chưa xác nhận |
| NFR-22 | Mỗi request có request ID trong log | S1-I7 | S2-I7 | TV7 | Logging middleware/interceptor | TC-NFR-22 | Chưa xác nhận |
| NFR-23 | Database tái tạo được từ migration và seed trên máy sạch | S1-I1; phối hợp Backend | S2-I1 | TV1 và Backend | Prisma migrations / seed | TC-NFR-23 | Chưa xác nhận |

## 5. Các điểm chưa được bao phủ rõ bởi 14 Issue hiện tại

1. **FR-01 đến FR-05 – Menu:** SRS giao luồng Menu cho TV1, nhưng Issue TV1 trong bảng Sprint 1–2 hiện tập trung vào AWS/Deployment. Issue TV2 tập trung tích hợp Frontend. Cần xác nhận phần Backend `GET /products`, lọc danh mục và API Menu do ai nhận; nếu chưa có người phụ trách thì bổ sung vào Issue phù hợp hoặc tạo Issue riêng.
2. **FR-07 – `GET /products/:id`:** Issue TV2 hiện có API Client và tích hợp Frontend nhưng chưa ghi rõ ai phụ trách triển khai Backend endpoint chi tiết sản phẩm. Cần xác nhận quyền sở hữu API.
3. **FR-29 – Hàm hoàn kho:** TV4 cung cấp service/hàm nội bộ; TV6 sở hữu `PATCH /orders/:id/status` và điều phối transaction hủy. Không tạo API/controller hủy riêng cho TV4.
4. **PWA:** Issue TV2 nên nêu rõ Manifest, icon và khả năng cài đặt cơ bản nếu NFR-08 thuộc phạm vi Sprint.
5. **Traceability với code và test:** Sau khi merge PR, thay đường dẫn code dự kiến bằng đường dẫn thực tế trong `apps/web`, `apps/api`, `prisma` hoặc `tests`; thay mã `TC-*` bằng tên file/test thực tế và cập nhật kết quả chạy.
6. **GitHub Issue number:** Thay các mã tham chiếu S1-I1…S2-I7 bằng liên kết Issue thật hoặc thêm số `#NN` khi có danh sách số Issue. Không tự suy đoán số Issue từ thứ tự tạo.

## 6. Quy trình cập nhật ma trận

- Khi Issue được nhận: cập nhật trạng thái `Đang thực hiện`.
- Khi PR được mở: thêm URL PR và đường dẫn file code thay đổi vào cột ghi chú hoặc bổ sung cột PR.
- Khi code đã merge vào `dev`: cập nhật `Đã triển khai`.
- Khi test chạy thành công: ghi mã test, kết quả Pass/Fail, ngày chạy và link log/test report; chuyển trạng thái sang `Đã kiểm thử` khi đủ bằng chứng.
- Khi yêu cầu bị hoãn/không triển khai: ghi rõ lý do và liên kết quyết định/Issue tương ứng.

## 7. Thông tin cần bổ sung khi nhóm chốt bản cuối

| Thông tin | Nơi cập nhật |
|---|---|
| Số `#Issue` và URL Issue | Mục 2 và cột Issue ở Mục 3–4 |
| Đường dẫn code sau khi merge | Cột Thành phần code ở Mục 3–4 |
| Tên file test và kết quả thực thi | Cột Test Case / Trạng thái |
| URL Pull Request | Bổ sung cột PR hoặc ghi chú ở từng yêu cầu |
| Người kiểm thử và ngày kiểm thử | Bổ sung khi nghiệm thu |

## 7.1. Danh mục tổng các Task 1–5

| Task | Phạm vi | Đầu ra chính | Chủ trì tổng hợp | Mốc theo kế hoạch | Trạng thái |
|---|---|---|---|---|---|
| Task 1 | Phân tích yêu cầu và Use Case | `context-and-scope.md`, SRS, Use Case overview, Use Case checkout | TV2/TV3/TV4 | N3 | Chưa cập nhật |
| Task 2 | Mô hình hóa nghiệp vụ và dữ liệu | 7 Activity, Sequence checkout, Class Diagram, API Contract | TV1–TV7 theo từng sơ đồ; TV7 giữ API contract | N5 | Chưa cập nhật |
| Task 3 | Kiến trúc và quyết định kỹ thuật | `architecture.md`, ADR, Deployment Diagram | TV7/TV1 và từng thành viên | N7 | Chưa cập nhật |
| Task 4 | Tái cấu trúc, chuyển tài liệu, MVP Sprint 1 và CI | Monorepo, `docs/`, Traceability Matrix skeleton, MVP Menu, CI đỏ/xanh, Sprint 1 Review/Retro | TV1/TV2; cả nhóm | N9 | Chưa cập nhật |
| Task 5 | Hoàn thiện code, tích hợp, kiểm thử và deploy | PR từng luồng kèm test, `/health`, CD, Production HTTPS, README, ma trận hoàn chỉnh, release/video, Sprint 2 Review/Retro | TV1–TV7 | N13–N14 | Chưa cập nhật |

## 8. Truy vết Task 1 – Phân tích yêu cầu và Use Case

> **Mục tiêu Task 1:** Chốt bối cảnh/phạm vi, SRS, User Story/FR/NFR/MoSCoW và các Use Case làm baseline cho thiết kế, lập trình và kiểm thử. Đây là khung theo phân công; điền PR, commit, đường dẫn file và kết quả duyệt khi có bằng chứng.

### 8.1. Ma trận đầu ra Task 1

| Mã Task | Đầu việc / sản phẩm | Chủ trì | Người đóng góp | Người duyệt | File / vị trí dự kiến | Requirement liên quan | GitHub Issue / PR | Bằng chứng cần lưu | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|
| T1.1 | Bối cảnh, stakeholder, mục tiêu, phạm vi in-scope/out-of-scope, giả định, ràng buộc và rủi ro | TV2 | TV1 (ràng buộc triển khai/rủi ro), TV1–TV7 (stakeholder/mục tiêu) | TV1 | `docs/context-and-scope.md` | Toàn bộ phạm vi sản phẩm; NFR liên quan | TBD | PR Task 1; nội dung được TV1 duyệt | Chưa cập nhật |
| T1.2-SRS | Thu thập, đánh mã FR/NFR, MoSCoW, Acceptance Criteria và tổng hợp SRS | TV2 | TV1–TV6 viết yêu cầu luồng; TV7 viết NFR bảo mật; mỗi TV xác nhận phần mình | TV4 | `docs/SRS.md` hoặc `docs/srs.md` (chốt một tên) | FR-01–FR-47; NFR-01–NFR-23; BR; AC | TBD | PR Task 1; checklist xác nhận của chủ luồng; lịch sử review | Chưa cập nhật |
| T1.2-UC | Use-case diagram tổng quát, actor và include/extend | TV3 | TV1–TV7 gửi Use Case/actor của luồng mình | TV2 | `docs/diagrams/usecase-overview.puml`, `.svg` | US-01–US-07; actor Khách hàng/Nhân viên/Quản lý/Dịch vụ thanh toán mô phỏng (theo phạm vi đã duyệt) | TBD | File nguồn `.puml`, ảnh `.svg`, PR và review | Chưa cập nhật |
| T1.3-UC | Use-case diagram trọng tâm và đặc tả “Đặt và thanh toán” | TV4 | TV5 (nhánh thanh toán), TV6 (hậu điều kiện trạng thái), TV7 (JWT), TV2 (mã FR/SRS) | TV2 | `docs/usecases/checkout.md`, `docs/diagrams/usecase-checkout.puml`, `.svg` | FR-27–FR-33; FR-38; FR-40–FR-43; các BR về đặt đơn/thanh toán/trạng thái | TBD | Đặc tả luồng chính, thay thế, ngoại lệ; sơ đồ `.puml` + `.svg`; PR được duyệt | Chưa cập nhật |

### 8.2. Truy vết yêu cầu theo chủ luồng ở Task 1

| Mã dòng | Thành viên | Nội dung cần cung cấp vào SRS | Requirement ID | File/section nhận | Người xác nhận | Bằng chứng / PR | Trạng thái |
|---|---|---|---|---|---|---|---|
| T1-TV1 | TV1 | FR Menu; NFR hiệu năng và triển khai; User Story và AC; ràng buộc/rủi ro cho context | FR-01–FR-05; NFR-01–NFR-05 | `docs/SRS.md`; `docs/context-and-scope.md` | TV2/TV4 | TBD | Chưa cập nhật |
| T1-TV2 | TV2 | FR chi tiết sản phẩm; NFR mobile-first, responsive, PWA; tổng hợp mã và MoSCoW | FR-06–FR-14; NFR-06–NFR-08 | `docs/SRS.md` | TV4 | TBD | Chưa cập nhật |
| T1-TV3 | TV3 | FR giỏ hàng/khuyến mãi; actor và Use Case của luồng giỏ | FR-15–FR-26; NFR-09–NFR-13 (các NFR đề xuất cần PO xác nhận) | `docs/SRS.md`; `usecase-overview.puml` | TV2 | TBD | Chưa cập nhật |
| T1-TV4 | TV4 | FR đặt đơn/tồn kho; đặc tả Use Case đặt và thanh toán | FR-27–FR-29; NFR-14 | `docs/SRS.md`; `checkout.md` | TV2 | TBD | Chưa cập nhật |
| T1-TV5 | TV5 | FR thanh toán; nhánh thanh toán trong Use Case checkout | FR-30–FR-33; NFR-15–NFR-16 | `docs/SRS.md`; `checkout.md` | TV2/TV4 | TBD | Chưa cập nhật |
| T1-TV6 | TV6 | FR xác nhận đơn, lịch sử, theo dõi, chuyển trạng thái, điểm thưởng; hậu điều kiện checkout | FR-34–FR-39 | `docs/SRS.md`; `checkout.md` | TV2/TV4 | TBD | Chưa cập nhật |
| T1-TV7 | TV7 | FR đăng ký/đăng nhập/JWT/role/health; NFR bảo mật; điều kiện xác thực trong checkout | FR-40–FR-47; NFR-17–NFR-23 | `docs/SRS.md`; `checkout.md` | TV2/TV4 | TBD | Chưa cập nhật |

### 8.3. Checklist nghiệm thu Task 1

| Tiêu chí | Bằng chứng / link | Người xác nhận | Hoàn thành? |
|---|---|---|---|
| Context & Scope có stakeholder, mục tiêu, phạm vi, giả định, ràng buộc và rủi ro | TBD | TV1 | [ ] |
| SRS có mã FR/NFR, MoSCoW và Acceptance Criteria | TBD | TV4 | [ ] |
| Các chủ luồng đã xác nhận yêu cầu của mình | TBD | TV2 | [ ] |
| Use-case overview có actor và quan hệ đúng | TBD | TV2 | [ ] |
| Use-case checkout có luồng chính, thay thế, ngoại lệ và mã FR | TBD | TV2 | [ ] |
| Tất cả file nguồn sơ đồ được lưu trong repo và có bản xuất `.svg` | TBD | TV2 | [ ] |
| PR Task 1 được review và merge vào nhánh tích hợp theo quy trình nhóm | TBD | TV1/TV4 | [ ] |

## 9. Truy vết Task 2 – Activity, Sequence và Class Diagram

> **Mục tiêu Task 2:** Hoàn thiện 7 Activity Diagram, Sequence Diagram checkout, Class Diagram tổng và khung API Contract. Với mỗi sơ đồ, phải lưu cả file nguồn `.puml` và bản xuất `.svg`; đường dẫn dưới đây là cấu trúc gợi ý cần thống nhất với repo thật.

### 9.1. Ma trận 7 Activity Diagram (Task 2.1)

| Mã Task | Luồng / sơ đồ | Chủ trì | Nhánh bắt buộc cần thể hiện | File nguồn | Requirement liên quan | Người đọc soát / duyệt | PR / commit | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| T2.1-TV1 | Xem Menu | TV1 | Loading/lỗi tải; danh sách rỗng; sản phẩm hết hàng | `docs/diagrams/activity-xem-menu.puml` + `.svg` | FR-01–FR-04 | TV2 đọc soát; TV2 duyệt tổng | TBD | Chưa cập nhật |
| T2.1-TV2 | Chọn tùy chọn | TV2 | Topping hết hàng; lựa chọn Size/Topping; vượt giới hạn hợp lệ | `docs/diagrams/activity-chon-tuy-chon.puml` + `.svg` | FR-06–FR-14 | TV3 đọc soát; TV2 duyệt tổng | TBD | Chưa cập nhật |
| T2.1-TV3 | Giỏ hàng | TV3 | Món hết hàng; mã khuyến mãi sai/hết hạn; giỏ rỗng | `docs/diagrams/activity-gio-hang.puml` + `.svg` | FR-15–FR-26 | TV2 đọc soát; TV2 duyệt tổng | TBD | Chưa cập nhật |
| T2.1-TV4 | Đặt đơn | TV4 | Swimlane Khách/Next.js/NestJS/Database; chưa đăng nhập; hết hàng; transaction rollback | `docs/diagrams/activity-dat-don.puml` + `.svg` | FR-27–FR-29; FR-44 | TV5/TV7 đọc soát; TV2 duyệt tổng | TBD | Chưa cập nhật |
| T2.1-TV5 | Thanh toán | TV5 | Chọn Ví/Thẻ; thành công; thất bại; hết hạn/gửi lại; Idempotency | `docs/diagrams/activity-thanh-toan.puml` + `.svg` | FR-30–FR-33 | TV4/TV7 đọc soát; TV2 duyệt tổng | TBD | Chưa cập nhật |
| T2.1-TV6 | Theo dõi đơn | TV6 | Sai thứ tự chuyển trạng thái; hủy đơn; theo dõi; hoàn thành và tích điểm | `docs/diagrams/activity-theo-doi-don.puml` + `.svg` | FR-34–FR-39 | TV5/TV7 đọc soát; TV2 duyệt tổng | TBD | Chưa cập nhật |
| T2.1-TV7 | Đăng ký/Đăng nhập | TV7 | Sai mật khẩu; email trùng; thiếu/sai/hết hạn JWT; phân quyền | `docs/diagrams/activity-xac-thuc.puml` + `.svg` | FR-40–FR-47 | TV2/TV4 đọc soát; TV2 duyệt tổng | TBD | Chưa cập nhật |

### 9.2. Truy vết Sequence Diagram checkout (Task 2.2)

| Mã Task | Đầu việc | Chủ trì | Người đóng góp | Thành phần/lifeline cần có | Requirement liên quan | File nguồn / bản xuất | Duyệt | PR / commit | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|
| T2.2 | Sequence Diagram checkout | TV5 | TV4 (transaction/tồn kho), TV7 (JWT/xác thực) | Customer → Next.js UI → NestJS API → Database → Payment Service; alt thành công/thất bại; Idempotency-Key; phản hồi kết quả | FR-27–FR-33; FR-40–FR-43 | `docs/diagrams/sequence-checkout.puml` + `.svg` | TV7 | TBD | Chưa cập nhật |

### 9.3. Truy vết Class Diagram và API Contract (Task 2.3)

| Mã Task | Đầu việc | Chủ trì | Người cung cấp dữ liệu | Nội dung cần truy vết | File / vị trí | Người duyệt | Bằng chứng | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| T2.3-TV7 | Class Diagram tổng | TV7 | TV1/TV2: Product; TV3: Promotion; TV4: Order/OrderItem; TV5: Payment; TV6: LoyaltyTransaction và enum | Thuộc tính, kiểu dữ liệu, phương thức cần thiết, quan hệ, multiplicity; đối chiếu `schema.prisma` | `docs/diagrams/class-diagram.puml` + `.svg` | TV4 | Xác nhận từng chủ lớp; so sánh schema; PR | Chưa cập nhật |
| T2.3-API | Dựng khung hợp đồng API | TV7 | TV1–TV6 điền request/response endpoint của mình | Method, endpoint, auth/role, headers, request, response, mã lỗi, ví dụ JSON | `docs/api-contract.md` | TV7 rà soát; các owner endpoint xác nhận | PR và các phần endpoint đã điền | Chưa cập nhật |

### 9.4. Checklist nghiệm thu Task 2

| Tiêu chí | Bằng chứng / link | Người xác nhận | Hoàn thành? |
|---|---|---|---|
| Có đủ 7 Activity Diagram tương ứng 7 luồng | TBD | TV2 | [ ] |
| Mỗi Activity có start/end, swimlane, decision/merge và nhánh ngoại lệ phù hợp | TBD | TV2 | [ ] |
| Có Sequence Diagram checkout với transaction, JWT, thanh toán thành công/thất bại và Idempotency | TBD | TV7 | [ ] |
| Class Diagram có đủ lớp chính, enum và quan hệ | TBD | TV4 | [ ] |
| Class Diagram đã đối chiếu `schema.prisma`; phần chưa chắc chắn được ghi chú | TBD | TV4/TV7 | [ ] |
| Có `docs/api-contract.md`; endpoint có owner, request/response và mã lỗi | TBD | TV7 | [ ] |
| Tất cả sơ đồ có cả `.puml` và `.svg` | TBD | TV2 | [ ] |
| PR Task 2 được review và merge theo quy trình | TBD | TV2/TV7 | [ ] |

## 10. Truy vết Task 3 – Kiến trúc, ADR và Deployment Diagram

> **Mục tiêu Task 3:** Thống nhất kiến trúc Frontend/Backend/Database, ghi nhận các quyết định kiến trúc (ADR) và mô tả triển khai theo nền tảng thực tế đã chọn.

### 10.1. Ma trận Architecture và ADR (Task 3.1)

| Mã Task | Đầu việc | Chủ trì | Người đóng góp | Nội dung cần có | File / vị trí dự kiến | Người duyệt | Bằng chứng | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| T3.1-ARCH | Mô tả kiến trúc tổng thể | TV7 | TV1–TV6, mỗi người một đoạn theo phần phụ trách | Next.js/PWA; NestJS theo module; PostgreSQL/Prisma Migration; thanh toán mô phỏng; logging; health; cấu hình; ưu/nhược điểm và trade-off | `docs/architecture.md` | TV1 | PR; sơ đồ kiến trúc; review từng phần | Chưa cập nhật |
| T3.1-TV1 | ADR Monorepo | TV1 | TV7 góp ý kiến trúc | Lý do chọn Monorepo; cấu trúc `apps/web`, `apps/api`; ảnh hưởng đến build/test/deploy | `docs/adr/00x-monorepo.md` (tên thực tế TBD) | TV7 | ADR + PR | Chưa cập nhật |
| T3.1-TV1-DEPLOY | ADR nền tảng deploy và Docker | TV1 | TV7 rà soát | Nền tảng thực tế; EC2/RDS hoặc dịch vụ đã chọn; Docker; HTTPS; DB/network; secrets; rủi ro và rollback | `docs/adr/00x-deployment-docker.md` | TV7 | ADR + bằng chứng thử deploy | Chưa cập nhật |
| T3.1-TV1-CI | ADR CI/CD | TV1 | TV7 rà soát | Pipeline, trigger, build image, registry, deploy secret, migration, smoke test, rollback | `docs/adr/00x-ci-cd.md` | TV7 | ADR + workflow/pipeline | Chưa cập nhật |
| T3.1-TV2 | ADR PWA và Next.js | TV2 | TV7 rà soát | Next.js rendering, mobile-first, manifest/icon; phạm vi offline nếu có | `docs/adr/00x-pwa-nextjs-mobile-first.md` | TV7 | ADR + PR | Chưa cập nhật |
| T3.1-TV3 | ADR giá và khuyến mãi tính ở Server | TV3 | TV7 rà soát | Server là nguồn giá có thẩm quyền; client không tự quyết định giá; báo giá và khuyến mãi | `docs/adr/00x-server-side-pricing.md` | TV7 | ADR + API contract | Chưa cập nhật |
| T3.1-TV4 | ADR Optimistic Locking tồn kho | TV4 | TV7 rà soát | Cơ chế chống race condition; transaction; xung đột cập nhật và trả 409 | `docs/adr/00x-optimistic-locking-inventory.md` | TV7 | ADR + test đồng thời | Chưa cập nhật |
| T3.1-TV5 | ADR Idempotency thanh toán | TV5 | TV7 rà soát | Idempotency-Key; lưu kết quả; request gửi lặp/đồng thời; không tạo Payment trùng | `docs/adr/00x-payment-idempotency.md` | TV7 | ADR + test trùng key | Chưa cập nhật |
| T3.1-TV6 | ADR State Machine đơn hàng | TV6 | TV7 rà soát | Trạng thái, chuyển trạng thái hợp lệ, trạng thái cuối, trách nhiệm TV4/TV5/TV6 | `docs/adr/00x-order-state-machine.md` | TV7 | ADR + state diagram/SRS | Chưa cập nhật |
| T3.1-TV7 | ADR JWT, validate/logging/config | TV7 | TV1–TV6 rà soát ảnh hưởng | Vị trí lưu token; claim; hết hạn; validate; log; cấu hình; secrets | `docs/adr/00x-jwt-validation-logging-config.md` hoặc các ADR tách riêng | TV7 tự rà soát; TV1/TV2 xác nhận vận hành/frontend | ADR + API contract + review | Chưa cập nhật |

### 10.2. Deployment Diagram (Task 3.2)

| Mã Task | Đầu việc | Chủ trì | Người đóng góp | Nội dung bắt buộc | File nguồn / bản xuất | Người duyệt | PR / commit | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| T3.2 | Deployment Diagram | TV1 | TV7 đối chiếu với architecture | Thiết bị/PWA; CDN hoặc nơi phục vụ Next.js; container API; PostgreSQL bền vững; registry; HTTPS; secrets; health check; ranh giới local/CI/production; kết nối và port theo môi trường thực tế | `docs/diagrams/deployment-diagram.puml` + `.svg` | TV7 | TBD | Chưa cập nhật |

### 10.3. Checklist nghiệm thu Task 3

| Tiêu chí | Bằng chứng / link | Người xác nhận | Hoàn thành? |
|---|---|---|---|
| `architecture.md` mô tả đúng kiến trúc đang triển khai | TBD | TV1 | [ ] |
| Mỗi thành viên có ADR theo quyết định kiến trúc được phân công (ít nhất một ADR/người theo kế hoạch) | TBD | TV7 | [ ] |
| ADR có Context, Decision, Alternatives, Consequences và trạng thái phù hợp (Proposed/Accepted/Rejected/Superseded) | TBD | TV7 | [ ] |
| Deployment Diagram khớp nền tảng deploy thực tế | TBD | TV7 | [ ] |
| Có `.puml` và `.svg` cho Deployment Diagram | TBD | TV7 | [ ] |
| PR Task 3 được review và merge theo quy trình | TBD | TV1/TV7 | [ ] |

## 11. Truy vết Task 4 – Tái cấu trúc, tài liệu và MVP Sprint 1

> **Phạm vi:** Đây là sườn truy vết cho Task 4 theo kế hoạch Assignment 2. Chưa điền trạng thái hoàn thành, số PR, commit, đường dẫn code thực tế hoặc kết quả CI/test. Các mã T4 bên dưới là mã tham chiếu nội bộ của ma trận, không phải GitHub Issue number.

| Mã Task | Công việc / đầu ra cần truy vết | Phụ trách | Yêu cầu liên quan | Issue tham chiếu | Code / tài liệu / đầu ra | Test / bằng chứng cần gắn | Trạng thái |
|---|---|---|---|---|---|---|---|
| T4.1 | Đóng băng code và chuyển cấu trúc repository thành Monorepo: `apps/web`, `apps/api`; cập nhật Docker Compose và Dockerfile; các thành viên đồng bộ nhánh `dev`. | TV1 phối hợp toàn nhóm | NFR-03; yêu cầu cấu trúc triển khai | S1-I1 / Issue hạ tầng của TV1 (cần ghi rõ phạm vi Task 4.1) | `apps/web/`; `apps/api/`; `docker-compose.yml`; `Dockerfile` (đường dẫn thực tế: TBD) | PR đổi cấu trúc; kết quả build Web/API; kết quả `docker compose up`; xác nhận các thành viên đã cập nhật nhánh | Chưa cập nhật |
| T4.2 | Đưa tài liệu Task 1–3 vào `docs/` bằng PR có ghi lý do thay đổi; dựng sườn Traceability Matrix. | TV2 phối hợp TV7 và các chủ luồng | FR/NFR/US/AC của SRS; không gắn một FR đơn lẻ | S1-I2 / Issue tài liệu của TV2 (cần ghi rõ phạm vi Task 4.2) | `docs/SRS.md`; `docs/context-and-scope.md`; Use Case; sơ đồ; `docs/traceability-matrix.md` (tên file thực tế cần thống nhất) | PR tài liệu; danh sách tài liệu đã đưa vào `docs/`; kiểm tra link và mã yêu cầu | Sườn – chờ cập nhật |
| T4.3 | Hoàn thiện MVP Menu: `GET /products` có lọc danh mục; seed tối thiểu 12 món, có một số món hết hàng; trang Menu có Loading/Skeleton, Empty, Error/Retry. | TV1 | FR-01–FR-04; NFR-01–NFR-02 | Issue TV1 hiện có: S1-I1 (cần bổ sung rõ phần Menu hoặc tạo Issue riêng nếu nhóm tách việc) | Products API/controller/service; seed; Menu page/components (đường dẫn thực tế: TBD) | API test `GET /products`; test lọc danh mục; test dữ liệu rỗng/lỗi; component test Loading/Empty/Error; kiểm tra sản phẩm hết hàng | Chưa cập nhật |
| T4.4 | Tạo PR MVP Sprint 1 (Menu); thiết lập CI theo luồng Install → Lint → Test → Build; lưu bằng chứng một lần CI đỏ do lỗi lint và một lần CI xanh; chỉ gộp khi CI đạt. | TV1 phối hợp người tạo PR | NFR-03; quy trình kiểm tra chất lượng và tích hợp | S1-I1 | `.github/workflows/ci.yml` (hoặc workflow thực tế); PR MVP Menu | Link PR; link/run CI đỏ; link/run CI xanh; ảnh/log workflow; reviewer và kết quả review | Chưa cập nhật |
| T4.5 | Sprint 1 Review và Retrospective: ghi nhận nội dung demo, kết quả Sprint, điều làm tốt, vấn đề và hành động cải thiện. | TV2 ghi biên bản; cả nhóm tham gia | Không gắn FR riêng; đối chiếu mục tiêu Sprint 1 | Issue tài liệu/Review của TV2 nếu có | `docs/sprint1-review-retro.md` (nếu nhóm dùng file này) | Biên bản họp; danh sách việc hoàn thành/chưa hoàn thành; action items có người nhận | Chưa cập nhật |

### 11.1. Bảng đối chiếu đầu ra Task 4

| Đầu ra Task 4 | Vị trí dự kiến | Liên kết PR / commit | Bằng chứng | Trạng thái |
|---|---|---|---|---|
| Cấu trúc Monorepo mới | `apps/web/`, `apps/api/` | TBD | PR / commit đổi cấu trúc | Chưa cập nhật |
| Docker Compose và Dockerfile đã chỉnh | `docker-compose.yml`, `Dockerfile` hoặc vị trí thực tế | TBD | Build và chạy container thành công | Chưa cập nhật |
| MVP Menu API và giao diện | `apps/api/.../products`; `apps/web/.../menu` | TBD | API test + component test | Chưa cập nhật |
| CI workflow | `.github/workflows/ci.yml` | TBD | Một lần đỏ + một lần xanh | Chưa cập nhật |
| Tài liệu Task 1–3 và ma trận truy vết | `docs/` | TBD | PR tài liệu | Sườn – chờ cập nhật |
| Sprint 1 Review/Retro | `docs/sprint1-review-retro.md` | TBD | Biên bản | Chưa cập nhật |

## 12. Truy vết Task 5 – Hoàn thiện từng luồng, kiểm thử và triển khai

> **Phạm vi:** Đây là sườn truy vết cho Task 5. Mỗi thành viên cập nhật đường dẫn module, PR, commit, Test Case thực tế và kết quả sau khi triển khai. Không đánh dấu Pass/Done khi chưa có bằng chứng.

### 12.1. Truy vết triển khai theo thành viên và luồng nghiệp vụ

| Mã Task | Thành viên | Công việc / đầu ra cần truy vết | Yêu cầu liên quan | Issue tham chiếu | Code / tài liệu dự kiến | Test / bằng chứng cần gắn | Trạng thái |
|---|---|---|---|---|---|---|---|
| T5-TV1 | TV1 | Thiết lập CD: build image theo commit SHA, push registry, deploy bằng CI secrets, chạy migration, smoke test `/health`; bảo đảm HTTPS, DB không public và Docker Compose chạy Web/API/DB. | NFR-03–NFR-05; FR-46 | S2-I1 | `.github/workflows/` (CD); `docker-compose.yml`; cấu hình deploy; `docs/deployment.md` | Link pipeline CD; log migration; smoke test `/health`; kiểm tra HTTPS; kiểm tra DB không public | Chưa cập nhật |
| T5-TV1-2 | TV1 | Sửa lỗi deploy, viết hướng dẫn deploy/rollback, gắn tag release. | NFR-04–NFR-05 | S2-I1 | `docs/deployment.md`; release tag; cấu hình rollback | Link release; hướng dẫn rollback đã thử; URL Production hoạt động | Chưa cập nhật |
| T5-TV2 | TV2 | Hoàn thiện trang chi tiết: `GET /products/:id` gồm Size/Topping; tính giá theo Size/Topping; PWA Manifest và icon; unit test tính giá. | FR-06–FR-14; NFR-06–NFR-08 | S2-I2 | `apps/web/.../products/[id]`; API Client; phần Products API do nhóm xác nhận; manifest và icons | API test chi tiết sản phẩm; unit test tính giá; kiểm tra topping hết hàng; kiểm tra cài đặt PWA; ảnh giao diện mobile | Chưa cập nhật |
| T5-TV2-2 | TV2 | Kiểm thử tay các luồng, ghi lỗi vào Issues; viết README hướng dẫn chạy local, test, build, deploy và rollback (phần deploy do TV1 cung cấp); phối hợp hoàn thiện ma trận, release notes, kịch bản video và Review/Retro Sprint 2. | Tất cả FR/NFR trong phạm vi MVP; tài liệu bàn giao | S2-I2 và Issue tài liệu/Review tương ứng | `README.md`; `docs/traceability-matrix.md`; `docs/release-notes.md`; `docs/sprint2-review-retro.md` | Link Issues lỗi; kết quả kiểm thử tay; thử clone/chạy trên máy sạch; README; biên bản Review/Retro; kịch bản/video | Chưa cập nhật |
| T5-TV3 | TV3 | Hoàn thiện Cart Store (state + localStorage), trang giỏ, tính tổng; triển khai `POST /promotions/validate` và model Promotion; unit test reducer/tổng tiền/quy tắc khuyến mãi; component test; phối hợp chốt payload với TV4. | FR-15–FR-26; NFR-09–NFR-13 (NFR-09–NFR-13 là đề xuất trong SRS, cần PO xác nhận baseline) | S2-I3 | Cart store/components; Promotion model/service/controller; `POST /promotions/validate` | Unit test reducer/tổng; component test; test mã hết hạn/không đạt giá trị tối thiểu; test localStorage; kiểm tra mobile | Chưa cập nhật |
| T5-TV4 | TV4 | Hoàn thiện model Order/OrderItem và `POST /orders`; JWT guard, transaction tạo đơn/trừ kho, tính tổng và validate; xây dựng checkout. | FR-27–FR-29; NFR-14 | S2-I4 | Orders module; Prisma models/migrations; `POST /orders`; checkout page | Unit test tính tổng/validate; integration test tạo đơn thành công; hết hàng trả 409; hai request đồng thời không làm kho âm | Chưa cập nhật |
| T5-TV5 | TV5 | Hoàn thiện PaymentModule, dịch vụ thanh toán mô phỏng Ví/Thẻ (có trường hợp thất bại), lưu Idempotency-Key; triển khai `POST /payments` cập nhật đơn trong transaction và giao diện thanh toán. | FR-30–FR-33; NFR-15–NFR-16 | S2-I5 | Payments module/service; Payment và idempotency storage; `POST /payments`; payment UI | Unit test quy tắc thanh toán; integration test gửi 2 request cùng key chỉ tạo 1 Payment; kiểm thử Ví/Thẻ thành công/thất bại; xác minh trạng thái Order theo SRS | Chưa cập nhật |
| T5-TV6 | TV6 | Hoàn thiện State Machine; model/migration LoyaltyTransaction; `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status` (STAFF); trang xác nhận/lịch sử/theo dõi tự làm mới 5–10 giây. | FR-34–FR-39; các yêu cầu JWT/phân quyền liên quan NFR-17–NFR-20 | S2-I6 | Orders status service/controller; LoyaltyTransaction model/migration; history/tracking UI | Unit test chuyển trạng thái và tính điểm; test quyền STAFF; integration test API lịch sử/chi tiết/cập nhật; E2E Playwright từ Menu → chọn → giỏ → đặt → thanh toán → xác nhận | Chưa cập nhật |
| T5-TV7 | TV7 | Hoàn thiện AuthModule (register/login, bcrypt, JWT), JwtAuthGuard, RolesGuard, ValidationPipe, exception filter, ConfigModule, `.env.example`, `GET /health`; tích hợp trang đăng nhập/đăng ký và auth context/route guard. | FR-40–FR-47; NFR-17–NFR-23 | S2-I7 | Auth module/guards; config; health module; auth pages/context; `.env.example` | Unit test bcrypt/JWT; integration test đăng ký/đăng nhập/sai mật khẩu 401/route bảo vệ 401; test `/health`; test validate input; kiểm tra secret không lọt repo/log CI | Chưa cập nhật |

### 12.2. Truy vết kiểm thử tích hợp và nghiệm thu Task 5

| Mã kiểm thử khung | Luồng kiểm thử | Yêu cầu liên quan | Người phối hợp | Kết quả mong đợi | Link Test/ảnh/log | Kết quả thực tế |
|---|---|---|---|---|---|---|
| T5-IT-01 | Menu → chi tiết sản phẩm | FR-01–FR-14 | TV1, TV2 | Hiển thị danh sách, lọc, chi tiết, Size/Topping và giá đúng | TBD | Chưa chạy |
| T5-IT-02 | Chi tiết → giỏ hàng → báo giá/khuyến mãi | FR-14–FR-26 | TV2, TV3 | Lựa chọn chuyển đúng vào giỏ; server trả báo giá hợp lệ | TBD | Chưa chạy |
| T5-IT-03 | Checkout và tạo đơn | FR-26–FR-29, FR-44 | TV3, TV4, TV7 | JWT hợp lệ tạo đơn; thiếu JWT bị yêu cầu đăng nhập; hết hàng trả 409 | TBD | Chưa chạy |
| T5-IT-04 | Thanh toán Ví/Thẻ | FR-30–FR-33 | TV4, TV5 | Payment khớp tổng đơn; xử lý thành công/thất bại theo SRS | TBD | Chưa chạy |
| T5-IT-05 | Theo dõi và cập nhật trạng thái đơn | FR-34–FR-38 | TV5, TV6, TV7 | Lịch sử đúng chủ sở hữu; chỉ STAFF cập nhật; state transition hợp lệ | TBD | Chưa chạy |
| T5-IT-06 | Tích điểm khi đơn hoàn thành | FR-39 | TV6 | Ghi một LoyaltyTransaction cho một order đủ điều kiện; không cộng trùng | TBD | Chưa chạy |
| T5-IT-07 | Đăng ký/đăng nhập và bảo vệ API | FR-40–FR-47 | TV2, TV7 | JWT cấp/xác minh đúng; 401/403 đúng; health check hoạt động | TBD | Chưa chạy |
| T5-IT-08 | Triển khai Production và smoke test | NFR-03–NFR-05; FR-46 | TV1, TV7 | Deploy thành công; HTTPS hoạt động; `/health` kiểm tra được API/DB; có rollback | TBD | Chưa chạy |

### 12.3. Theo dõi Pull Request và bằng chứng Task 5

| Mã Task | PR URL | Commit SHA | Đường dẫn code đã merge | Test đã chạy | Reviewer | Ngày cập nhật | Trạng thái |
|---|---|---|---|---|---|---|---|
| T5-TV1 | TBD | TBD | TBD | TBD | TBD | TBD | Chưa cập nhật |
| T5-TV2 | TBD | TBD | TBD | TBD | TBD | TBD | Chưa cập nhật |
| T5-TV3 | TBD | TBD | TBD | TBD | TBD | TBD | Chưa cập nhật |
| T5-TV4 | TBD | TBD | TBD | TBD | TBD | TBD | Chưa cập nhật |
| T5-TV5 | TBD | TBD | TBD | TBD | TBD | TBD | Chưa cập nhật |
| T5-TV6 | TBD | TBD | TBD | TBD | TBD | TBD | Chưa cập nhật |
| T5-TV7 | TBD | TBD | TBD | TBD | TBD | TBD | Chưa cập nhật |

### 12.4. Bảng kiểm bàn giao cuối Task 5

| Đầu ra | Người phụ trách chính | Vị trí / liên kết | Đã có? |
|---|---|---|---|
| PR từng luồng kèm test | TV2–TV7 | TBD | [ ] |
| API `/health` | TV7 | TBD | [ ] |
| Pipeline CD | TV1 | TBD | [ ] |
| URL Production HTTPS | TV1 | TBD | [ ] |
| `docs/deployment.md` có rollback | TV1 | TBD | [ ] |
| README (local, test, build, deploy, rollback) | TV2, TV1 bổ sung phần deploy | `README.md` | [ ] |
| Database migration và seed chạy được trên máy sạch | TV7 phối hợp Backend/TV1 | TBD | [ ] |
| Integration/E2E test tối thiểu một luồng xuyên suốt | TV6 phối hợp cả nhóm | TBD | [ ] |
| Traceability Matrix đã thu thập dữ liệu từ tất cả thành viên | TV2 tổng hợp | `docs/traceability-matrix.md` | [ ] |
| Release notes và tag release | TV1/TV2 theo phân công nhóm | TBD | [ ] |
| Video demo và kịch bản | TV6 tổng hợp; các TV cung cấp phần quay | TBD | [ ] |
| Sprint 2 Review/Retrospective | Cả nhóm; TV2 ghi biên bản theo phân công | `docs/sprint2-review-retro.md` | [ ] |

## 13. Mẫu cập nhật một dòng truy vết khi có kết quả thực tế

Sao chép mẫu sau cho từng yêu cầu hoặc đầu việc khi nhóm bắt đầu có PR/test:

| Requirement / Task ID | GitHub Issue # / URL | PR URL | Commit SHA | Code path | Test Case / Test file | Kết quả (Pass/Fail) | Người kiểm thử | Ngày | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|
| TBD | TBD | TBD | TBD | TBD | TBD | Chưa chạy | TBD | TBD | Chưa cập nhật |

> **Quy tắc cập nhật:** Chỉ chuyển sang `Đã triển khai` khi có code/PR đã merge; chỉ chuyển sang `Đã kiểm thử` khi có test và bằng chứng kết quả. Số GitHub Issue, URL PR, SHA, file code, Test Case và ngày kiểm thử phải lấy từ repository/pipeline thực tế, không suy đoán từ thứ tự trong bảng.