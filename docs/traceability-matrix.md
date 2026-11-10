# Traceability Matrix – BrewLite

> **Nguồn:** SRS BrewLite v0.6 và bảng 14 GitHub Issues Sprint 1–2 đã thống nhất trong nhóm.  
> **Mục đích:** Truy vết từ yêu cầu (FR/NFR) → User Story → GitHub Issue → thành phần code → Test Case.  
> **Lưu ý:** Do bảng phân công hiện có tiêu đề Issue nhưng chưa ghi số `#` GitHub, ma trận dùng nguyên tiêu đề Issue để nhận diện. Có thể bổ sung số `#` sau khi mở từng Issue. Đường dẫn code và mã Test Case dưới đây là vị trí/mã dự kiến, chưa khẳng định đã được triển khai hoặc kiểm thử.

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
