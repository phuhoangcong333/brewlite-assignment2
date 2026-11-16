# Project Context and Scope – BrewLite

> **Phiên bản:** Bản tổng hợp theo Assignment 2 – phân công công việc  
> **Trạng thái:** Bản dự thảo để nhóm review và TV2 hoàn thiện  
> **Ngày kế hoạch trong tài liệu phân công:** N1 = 02/11/2026; N14 = 15/11/2026

---

## 1. Bối cảnh dự án (Project Context)

BrewLite là hệ thống web hỗ trợ quy trình đặt đồ uống trực tuyến. Nhóm chia nghiệp vụ thành sáu luồng liên tiếp: **Xem menu → Chọn tùy chọn → Giỏ hàng → Đặt đơn → Thanh toán → Theo dõi đơn**. Luồng xác thực và nền tảng chung được TV7 phụ trách vì yêu cầu đăng nhập/xác thực có ảnh hưởng xuyên suốt các luồng.

Mỗi thành viên phụ trách một luồng theo chiều dọc, từ yêu cầu (FR/NFR, User Story), sơ đồ hoạt động, Frontend, Backend đến kiểm thử và dòng truy vết. Code có từ Assignment 1 được phân chia lại theo luồng; người phụ trách đọc, chỉnh sửa và kiểm thử phần việc được giao.

## 2. Mục tiêu dự án

1. Xây dựng hệ thống web hoàn chỉnh cho quy trình xem và đặt đồ uống.
2. Hỗ trợ khách hàng xem menu, tùy chỉnh sản phẩm, quản lý giỏ hàng, đặt đơn, thanh toán mô phỏng và theo dõi đơn.
3. Hỗ trợ xác thực, phân quyền khách hàng/nhân viên và các chức năng nền tảng.
4. Đảm bảo Frontend, Backend và PostgreSQL tích hợp thống nhất.
5. Có bộ tài liệu phân tích, thiết kế, kiểm thử, truy vết và hướng dẫn vận hành.
6. Có CI/CD và URL Production HTTPS hoạt động tại thời điểm nghiệm thu.

## 3. Các bên liên quan (Stakeholders)

| Bên liên quan | Vai trò / Mối quan tâm |
|---|---|
| Giảng viên | Đưa ra đề bài, theo dõi tiến độ và nghiệm thu sản phẩm. |
| Khách hàng | Xem menu, chọn tùy chọn, quản lý giỏ hàng, đặt và thanh toán đơn, theo dõi đơn. |
| Nhân viên quầy | Tham gia quy trình vận hành tại quầy; cập nhật trạng thái đơn theo quyền được cấp. |
| Quản lý | Actor trong use-case tổng quát; phạm vi thao tác chi tiết cần được nhóm đặc tả trong use-case. |
| Dịch vụ thanh toán | Thành phần mô phỏng xử lý thanh toán Ví/Thẻ và trả kết quả giao dịch. |
| Product Owner (TV2) | Quản lý Product Backlog, ưu tiên yêu cầu và điều phối tổng hợp tài liệu. |
| Scrum Master (TV1) | Điều phối Scrum, hỗ trợ quy trình Git/PR, CI/CD và triển khai. |
| Nhóm phát triển TV1–TV7 | Phân tích, thiết kế, lập trình, kiểm thử và tích hợp các luồng được giao. |

## 4. Phạm vi dự án (Project Scope)

### 4.1. Trong phạm vi (In Scope)

| STT | Luồng / Phân hệ | Nội dung trong phạm vi | Phụ trách chính |
|---|---|---|---|
| 1 | Xem menu | Danh sách sản phẩm, hình ảnh, tên, giá, lọc danh mục, hiển thị hết hàng, loading/empty/error, seed dữ liệu mẫu. | TV1 |
| 2 | Chọn tùy chọn | Xem chi tiết sản phẩm; chọn size, topping; ghi chú; cập nhật giá theo lựa chọn; xử lý topping hết hàng. | TV2 |
| 3 | Giỏ hàng và khuyến mãi | Thêm/sửa/xóa món, cập nhật số lượng, tính tổng, lưu giỏ khi tải lại, kiểm tra mã khuyến mãi. | TV3 |
| 4 | Đặt đơn và tồn kho | Yêu cầu đăng nhập, tạo đơn từ giỏ, kiểm tra tồn kho, lưu giá tại thời điểm đặt, transaction trừ kho, hoàn kho khi hủy đơn chưa thanh toán, sinh mã đơn. | TV4 |
| 5 | Thanh toán | Thanh toán mô phỏng bằng Ví/Thẻ, kiểm tra số tiền, xử lý thành công/thất bại, cho phép thử lại và chống giao dịch trùng bằng `Idempotency-Key`. | TV5 |
| 6 | Theo dõi đơn và điểm thưởng | Xác nhận đơn, lịch sử, chi tiết/trạng thái đơn, nhân viên cập nhật trạng thái đúng thứ tự, tự làm mới dữ liệu, ghi nhận điểm khi hoàn thành. | TV6 |
| 7 | Xác thực và nền tảng chung | Đăng ký, đăng nhập, JWT, phân quyền khách/nhân viên, validate, logging, cấu hình, health check. | TV7 |
| 8 | Tài liệu và kiến trúc | SRS, bối cảnh/phạm vi, use-case, activity, sequence, class diagram, architecture, ADR, API contract, traceability, README. | Theo bảng phân công tại mục 7 |
| 9 | Tích hợp và triển khai | Docker Compose, CI, CD, deployment diagram, Production HTTPS, smoke test và rollback. | TV1 phối hợp TV7 |

### 4.2. Ngoài phạm vi MVP (Out of Scope)

| STT | Nội dung | Căn cứ / Ghi chú |
|---|---|---|
| 1 | Tìm kiếm sản phẩm theo tên | TV1 xác định chức năng tìm kiếm không thuộc MVP hiện tại (Won't). |
| 2 | Tích hợp cổng thanh toán thật với ngân hàng/ví bên ngoài | Assignment 2 mô tả dịch vụ thanh toán mô phỏng bằng Ví/Thẻ; không giao tích hợp nhà cung cấp thanh toán thật. |
| 3 | Các chức năng mở rộng chưa có trong Product Backlog hoặc chưa được đề bài yêu cầu | Không tự mở rộng phạm vi khi chưa được nhóm/giảng viên thống nhất. |

> **Lưu ý:** Khuyến mãi và điểm thưởng có trong phạm vi công việc được giao. Nếu tiến độ trễ, tài liệu phân công cho phép cắt giảm bản đầy đủ của khuyến mãi và điểm thưởng theo thứ tự ưu tiên nêu tại mục 9; không đồng nghĩa loại bỏ toàn bộ yêu cầu ngay từ đầu.

## 5. Ràng buộc dự án (Project Constraints)

| Mã | Nhóm | Ràng buộc |
|---|---|---|
| CON-01 | Công nghệ | Sử dụng Next.js cho Frontend, NestJS cho Backend và PostgreSQL cho Database theo nền tảng kỹ thuật của dự án. |
| CON-02 | Quy mô nhóm | Kế hoạch gốc giả định nhóm có 7 người: TV1 đến TV7. TV1 là Hoàng Công Phú; các thành viên còn lại điền tên trong bảng phân công của nhóm. |
| CON-03 | Thời gian | Kế hoạch giả định N1 là Thứ Hai 02/11/2026 và N14 là Chủ Nhật 15/11/2026. Hạn nộp chính thức chưa được xác nhận trong tài liệu; nếu khác, dời lịch nhưng giữ thứ tự công việc. |
| CON-04 | Quy trình Git | PR được tích hợp tuần tự từ Task 1 đến Task 5. Code có thể làm trước nhưng chỉ mở PR sau khi Task trước đã được gộp. PR ghi rõ mã Task, lý do thay đổi, link issue và cần ít nhất một người khác review. |
| CON-05 | Cập nhật nhánh | Thành viên phải cập nhật/rebase từ `dev` trước khi mở PR. N8 là mốc đóng băng cấu trúc; PR code đang mở phải được gộp trước khi đổi cấu trúc thư mục. |
| CON-06 | Phân chia code | Mỗi người chỉ sửa module API và route Frontend thuộc luồng mình; mỗi endpoint có đúng một người phụ trách chính. Module `products` dùng chung: TV1 giữ controller, TV2 bổ sung service chi tiết ở file riêng. |
| CON-07 | Database | Mỗi người chỉ sửa model được giao; mỗi thay đổi schema có migration riêng và PR nhỏ; các thành viên cập nhật migration từ `dev`. |
| CON-08 | Hạ tầng local | Docker và Docker Compose được dùng để đóng gói/chạy Web, API và PostgreSQL ở môi trường local. |
| CON-09 | Production | Hệ thống bắt buộc có URL Production truy cập HTTPS khi giảng viên nghiệm thu; có health check và smoke test sau triển khai. |
| CON-10 | Hạ tầng cloud | TV1 phải kiểm tra gói miễn phí, yêu cầu thẻ và chính sách lưu trữ dữ liệu của nền tảng trước khi chốt. Render là phương án được nêu trong phần nhiệm vụ TV1 trước đó, nhưng nền tảng cuối cùng phải được xác nhận tại N1. |
| CON-11 | Hợp đồng API | Các luồng gọi API của thành viên khác phải tuân theo hợp đồng đã thống nhất trong `docs/api-contract.md`; TV7 dựng khung ở N5, từng người bổ sung request/response mẫu trước N6. |

## 6. Giả định dự án (Project Assumptions)

1. Kế hoạch hiện tại giả định nhóm có 7 thành viên và phân công TV1–TV7 như tài liệu Assignment 2.
2. N1–N14 được tính theo lịch 02/11/2026–15/11/2026; nếu hạn nộp của giảng viên khác lịch giả định, nhóm dời lịch nhưng giữ trình tự Task.
3. Code từ Assignment 1 có thể tái sử dụng, nhưng từng thành viên phải rà soát, chỉnh sửa và kiểm thử theo luồng được giao.
4. Môi trường phát triển có thể cài Docker, Git và các công cụ cần thiết để chạy, kiểm thử và tích hợp.
5. Dữ liệu sản phẩm mẫu được seed để kiểm thử Menu; mục tiêu của TV1 là có ít nhất 12 sản phẩm, trong đó có một số sản phẩm hết hàng.
6. Dịch vụ thanh toán dùng mô phỏng Ví/Thẻ; có thể cấu hình tình huống thẻ thất bại để kiểm thử.
7. Các yêu cầu, API contract, sơ đồ và Prisma Schema được các thành viên phối hợp cập nhật để tránh sai khác.
8. Nền tảng deploy và chi tiết tài nguyên cloud được kiểm tra, lựa chọn tại N1; không giả định gói miễn phí có tính năng hoặc thời hạn cố định khi chưa kiểm chứng.

## 7. Tổ chức nhóm và trách nhiệm

| Thành viên | Luồng nghiệp vụ / Vai trò chính | Sản phẩm và trách nhiệm bổ sung |
|---|---|---|
| TV1 – Hoàng Công Phú | Xem menu; Scrum Master; DevOps | FR Menu; NFR hiệu năng/triển khai; `GET /products`; seed; activity Menu; CI/CD; Production; deployment diagram; phần deploy trong README. |
| TV2 - Nguyễn Thanh Thanh | Chọn tùy chọn; Product Owner; tài liệu | FR chi tiết sản phẩm; NFR mobile-first/PWA; `GET /products/:id`; activity chọn tùy chọn; SRS; traceability matrix; README; biên bản họp. |
| TV3 - Nguyễn Kiều Linh | Giỏ hàng | FR giỏ hàng/khuyến mãi; `POST /promotions/validate`; model Promotion; activity giỏ hàng; use-case diagram tổng quát. |
| TV4 - Trần Quỳnh Ngọc | Đặt đơn | FR đặt đơn/tồn kho; `POST /orders`; activity đặt đơn; model Order/OrderItem; use-case diagram và đặc tả “Đặt và thanh toán”. |
| TV5 - Nguyễn Đinh Ý Vy | Thanh toán | FR thanh toán; `POST /payments`; thanh toán mô phỏng và idempotency; activity thanh toán; sequence diagram checkout; model Payment. |
| TV6 - Phạm Văn Nhật | Theo dõi đơn | FR lịch sử/trạng thái đơn; điểm thưởng; các API đơn hàng; activity theo dõi đơn; E2E test; video demo. |
| TV7 - Nguyễn Hoàng Phúc | Xác thực và nền tảng chung | FR xác thực; NFR bảo mật; Auth API/JWT guard/health check; class diagram; architecture; API contract; logging/cấu hình. |

### 7.1. Nguyên tắc phân công và phối hợp

- Mỗi người phụ trách một luồng theo chiều dọc: yêu cầu → activity diagram → code Frontend/Backend → test → traceability.
- TV2–TV7 đều làm cả Frontend và Backend của luồng mình; thành viên cần hỗ trợ kỹ thuật thì nhờ người trong nhóm kèm, không tự ý chuyển toàn bộ việc sang người khác.
- Tạo phẩm chung có một người chủ trì, các thành viên đóng góp phần luồng của mình và có một người khác duyệt.
- Các sơ đồ phải có cả file nguồn `.puml` và bản xuất `.svg` mới được xem là hoàn thành.

## 8. Tạo phẩm chung và người phụ trách

| Tạo phẩm | Task | Tệp dự kiến | Chủ trì | Người góp chính | Người duyệt | Mốc hoàn thành |
|---|---|---|---|---|---|---|
| Bối cảnh, stakeholder, phạm vi | 1.1 | `context-and-scope.md` | TV2 | TV1 (ràng buộc, rủi ro), mọi người (mục tiêu/stakeholder) | TV1 | N3 |
| SRS: FR, NFR, MoSCoW, AC | 1.2 | `srs.md` | TV2 | Mỗi người viết FR/NFR luồng mình; TV7 NFR bảo mật; TV1 NFR hiệu năng/triển khai | TV4 | N3 |
| Use-case diagram tổng quát | 1.2 | `usecase-overview.puml`, `.svg` | TV3 | Mỗi người gửi use-case và actor của luồng mình | TV2 | N3 |
| Use-case trọng tâm và đặc tả “Đặt và thanh toán” | 1.3 | `usecase-checkout.md` | TV4 | TV5 nhánh thanh toán; TV6 hậu điều kiện trạng thái; TV7 điều kiện JWT | TV2 | N3 |
| 7 activity diagram | 2.1 | `activity-*.puml`, `.svg` | Mỗi người một sơ đồ | Người ở luồng liền kề đọc soát | TV2 | N5 |
| Sequence diagram checkout | 2.2 | `sequence-checkout.puml`, `.svg` | TV5 | TV4 (transaction/tồn kho), TV7 (JWT) | TV7 | N5 |
| Class diagram | 2.3 | `class-diagram.puml`, `.svg` | TV7 | TV1/TV2 Product; TV3 Promotion; TV4 Order/OrderItem; TV5 Payment; TV6 LoyaltyTransaction/enum | TV4 | N5 |
| Mô tả kiến trúc | 3.1 | `architecture.md` và sơ đồ | TV7 | Mỗi người một đoạn về phần mình | TV1 | N7 |
| ADR | 3.1 | `adr/00x-*.md` | Mỗi người ít nhất 1 ADR | Từng thành viên | TV7 | N7 |
| Deployment diagram | 3.2 | `deployment-diagram.puml`, `.svg` | TV1 | TV7 soát khớp kiến trúc | TV7 | N7 |
| Ma trận truy vết | Truy vết | `traceability-matrix.md` | TV2 | Mỗi người điền dòng của luồng mình | TV1 | N14 |
| README, release notes, biên bản Review/Retro | 5.4 | `README.md`, các tài liệu liên quan | TV2 | TV1 (deploy/rollback) | TV1 | N14 |
| Video demo | 5.4 | Video tổng hợp | TV6 | Mỗi người quay phần luồng mình | Theo nhóm | N14 |

## 9. Rủi ro và phương án giảm thiểu (Risks & Mitigation)

| Mã | Rủi ro | Xác suất | Ảnh hưởng | Phương án giảm thiểu |
|---|---|---|---|---|
| RISK-01 | Production deploy lỗi do HTTPS, sai biến môi trường, kết nối DB hoặc cấu hình nền tảng. | Cao | Rất cao | Thực hiện “Hello Deploy” từ N4–N5; kiểm tra HTTPS, biến môi trường, DB, health check và ghi nhận lỗi thành ADR trước khi hoàn thiện chức năng. |
| RISK-02 | Nền tảng cloud miễn phí thay đổi chính sách, hết hạn, yêu cầu thẻ hoặc có nguy cơ mất dữ liệu. | Trung bình | Cao | Kiểm tra điều kiện nền tảng tại N1; kiểm tra Database có lưu trữ bền vững hay không; quay video demo làm phương án dự phòng. Video không thay thế yêu cầu URL Production khi nghiệm thu. |
| RISK-03 | Xung đột code/tài liệu khi đổi cấu trúc thư mục hoặc nhiều người sửa cùng vùng. | Trung bình | Trung bình | Phân chia rõ module/route; đóng băng cấu trúc ở N8; gộp PR code đang mở trước khi đổi thư mục; mọi người cập nhật từ `dev`. |
| RISK-04 | Lệch Database Migration giữa các máy/thành viên. | Trung bình | Cao | Mỗi thay đổi Schema có migration riêng và PR nhỏ; người phụ trách model kiểm tra migration; tích hợp sớm vào `dev`; TV7 kiểm tra migrate reset và seed trên máy sạch tại N9. |
| RISK-05 | Thành viên chưa thành thạo Git/GitHub hoặc CI/CD. | Trung bình | Trung bình | TV1 viết hướng dẫn trong `CONTRIBUTING.md`, thống nhất quy ước commit/PR/Definition of Done và kèm cặp trực tiếp. |
| RISK-06 | Trễ tiến độ do phụ thuộc giữa các luồng hoặc chờ Task trước được merge. | Trung bình | Cao | Daily 15 phút; chốt API contract sớm; dùng cặp kèm TV2–TV3, TV4–TV5, TV6–TV7, TV1–TV7; theo dõi issue và thứ tự PR Task 1→5. |

## 10. Kế hoạch và các mốc dự án

> Lịch dưới đây là lịch giả định trong Assignment 2. Hạn nộp chính thức cần đối chiếu với thông báo của giảng viên.

| Ngày / Mốc | Công việc chính | Sản phẩm cần có trong repository |
|---|---|---|
| N1 – 02/11 | Planning, chọn nền tảng deploy, tạo khung tài liệu/nhánh và issue board. | `docs/`, issue board, tài khoản/nền tảng triển khai được chọn. |
| N2–N3 – 03–04/11 | Hoàn thành Task 1. | `context-and-scope.md`, `srs.md`, use-case tổng quát, đặc tả use-case. |
| N4–N5 – 05–06/11 | Hoàn thành Task 2; thử Hello Deploy. | 7 activity diagram; sequence; class diagram; file `.puml` và `.svg`; `api-contract.md`; URL thử deploy. |
| N5–N7 – 06–08/11 | Hoàn thành Task 3. | `architecture.md`, ADR, deployment diagram. |
| N8 – 09/11 | Đóng băng code và đổi cấu trúc repository. | `apps/web`, `apps/api`; Dockerfile và Docker Compose được cập nhật. |
| N9 – 10/11 | Hoàn thành Task 4, CI và MVP Menu. | CI có minh chứng đỏ/xanh; PR MVP Menu; Review/Retro Sprint 1. |
| N10–N12 – 11–13/11 | Task 5: hoàn thiện luồng, kiểm thử, CD và Production. | PR từng luồng kèm test; `/health`; CD; URL Production. |
| N13 – 14/11 | Sửa lỗi deploy và hoàn thiện phát hành. | URL Production HTTPS; tag release; `deployment.md`; Review/Retro Sprint 2. |
| N14 – 15/11 | Hoàn thiện và nộp. | Ma trận truy vết, README, release notes, video demo và checklist nộp bài. |

### 10.1. Quy trình làm việc và tích hợp

1. Daily 15 phút mỗi ngày, đặc biệt trong N8–N12; mỗi thành viên nêu việc hôm qua, việc hôm nay và trở ngại.
2. PR ghi rõ `Task x.y`, lý do thay đổi và link issue; cần ít nhất một thành viên khác review.
3. PR tích hợp theo thứ tự Task 1 → Task 5; chỉ mở PR khi Task trước đã được gộp.
4. Trước khi mở PR, cập nhật/rebase từ `dev`.
5. N8 là ngày đóng băng cấu trúc: mọi PR code đang mở phải được gộp trước khi TV1 đổi tên/di chuyển thư mục; sau đó tất cả cập nhật từ `dev`.
6. CI tối thiểu gồm Install → Lint → Test → Build; các bước bắt buộc phải xanh mới được merge.
7. CD dự kiến: build image gắn commit SHA → push registry → deploy bằng secret CI → chạy migration → smoke test `/health` → dừng và rollback nếu lỗi.

## 11. Cấu trúc repository và ranh giới sở hữu

- Thư mục code sau khi tái cấu trúc tại N8:
  - `apps/web` – Frontend Next.js.
  - `apps/api` – Backend NestJS.
- Mỗi thành viên chỉ sửa `apps/api/src/modules/<module>` và `apps/web/app/<route>` thuộc phần được giao.
- Module `products` dùng chung: TV1 phụ trách controller/danh sách menu; TV2 bổ sung service chi tiết sản phẩm ở file riêng.
- Mỗi thành viên chỉ sửa model Prisma được giao; migration riêng cho mỗi thay đổi Schema và đi kèm PR.
- `docs/api-contract.md` do TV7 dựng khung ở N5; từng người bổ sung ví dụ request/response endpoint của mình trước N6.

## 12. Công nghệ và triển khai

| Thành phần | Công nghệ / Cách sử dụng |
|---|---|
| Frontend | Next.js; giao diện mobile-first; TV2 bổ sung PWA manifest và icon. |
| Backend | NestJS, tổ chức theo module. |
| Database | PostgreSQL; schema được quản lý bằng Prisma Migration theo cấu hình hiện tại của dự án. |
| Container | Docker và Docker Compose để chạy Web, API và DB local. |
| Version control | Git và GitHub; nhánh tích hợp `dev`; Pull Request theo Task. |
| CI | Install → Lint → Test → Build; có minh chứng pipeline đỏ và xanh. |
| CD | Build image theo commit SHA, push registry, deploy bằng secret, migration và smoke test; rollback khi lỗi. |
| Production | Nền tảng cloud được TV1 kiểm tra/chốt tại N1; phải truy cập HTTPS, DB không public và có health check. |

## 13. Tiêu chí thành công của dự án

1. Hoàn thành các tạo phẩm Task 1–3 theo kế hoạch và có đủ file nguồn `.puml` cùng bản xuất `.svg` cho các sơ đồ yêu cầu.
2. Sáu luồng nghiệp vụ và luồng xác thực/nền tảng được tích hợp, kiểm thử theo SRS và API contract.
3. Có kiểm thử đơn vị, tích hợp và ít nhất một E2E test xuyên suốt: Menu → Chọn → Giỏ → Đặt → Thanh toán → Xác nhận.
4. Có CI chạy thành công và lưu minh chứng cả pipeline đỏ lẫn xanh.
5. Có thể khởi chạy hệ thống local bằng Docker Compose theo README.
6. Có URL Production HTTPS hoạt động tại thời điểm giảng viên chấm; endpoint `/health` dùng được cho smoke test.
7. Có tài liệu README, deployment/rollback, release notes, ma trận truy vết và video demo.

## 14. Phương án khi thiếu người hoặc trễ tiến độ

### 14.1. Phương án khi nhóm có 6 người

Theo tài liệu phân công: bỏ vị trí TV2 riêng; luồng 2 (Chọn tùy chọn) chuyển cho TV1 vì cùng module `products`; vai trò Product Owner, tài liệu và PWA chuyển cho TV3 (luồng nhẹ nhất).

### 14.2. Thứ tự cắt giảm khi trễ

1. Cắt phần làm đẹp, kịch bản E2E bổ sung và màn hình phụ.
2. Cắt bản đầy đủ của khuyến mãi và điểm thưởng; chỉ giữ phần tối thiểu theo kế hoạch: `LoyaltyTransaction` đủ để vẽ sơ đồ và ghi một bản ghi khi đơn hoàn thành.
3. Rút ngắn video, thay bằng bản demo ngắn.

### 14.3. Các nội dung không được cắt

- URL Production truy cập được qua HTTPS tại thời điểm nghiệm thu.
- Các tạo phẩm Task 1 đến Task 3.
- CI có minh chứng một lần đỏ và một lần xanh.
- Endpoint `/health`.
- Ít nhất một E2E test.
- Ma trận truy vết.

---

**Nguồn chính:** `BrewLite Assignment 2: phân công công việc` (30/10/2026). Các ràng buộc, tiêu chí và chi tiết bổ sung về Menu/hiệu năng/triển khai được kết hợp với nội dung nhiệm vụ TV1 đã cung cấp trong cuộc trao đổi. Những nội dung cần quyết định cụ thể nhưng chưa có trong nguồn được đánh dấu cần nhóm xác nhận.
