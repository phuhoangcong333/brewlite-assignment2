# Software Requirements Specification (SRS) – BrewLite

> **Trạng thái:** Bản tổng hợp các đóng góp TV1–TV6 và TV7
>
> **Người tổng hợp:** TV2 – Product Owner / Business Analyst  
> **Phiên bản:** 0.5 – Draft tổng hợp, chốt quy tắc luồng TV6  
> **Phạm vi:** Yêu cầu chức năng, yêu cầu phi chức năng, User Story, Acceptance Criteria, quy tắc nghiệp vụ và hợp đồng API của BrewLite.

---

## Thông tin tài liệu

| Thuộc tính | Giá trị |
|---|---|
| Tên hệ thống | BrewLite |
| Tên tài liệu | Software Requirements Specification (SRS) |
| Phiên bản | 0.5 – Draft tổng hợp, chốt quy tắc luồng TV6 |
| Người tổng hợp | TV2 – Product Owner / Business Analyst |
| Thành viên có nội dung đóng góp đã nhận | TV1, TV2, TV3, TV4, TV5, TV6, TV7 |
| Trạng thái | Đã chuẩn hóa 7 luồng ở mức yêu cầu; các điểm còn mở không ảnh hưởng đến quy tắc TV6 đã chốt được liệt kê riêng tại Mục 11 |

## 1. Giới thiệu

### 1.1. Mục đích

Tài liệu này mô tả các yêu cầu chức năng (Functional Requirements – FR), yêu cầu phi chức năng (Non-Functional Requirements – NFR), User Story, Acceptance Criteria và quy tắc nghiệp vụ của hệ thống BrewLite. Đây là căn cứ chung để nhóm phân tích, thiết kế, phát triển, kiểm thử và nghiệm thu sản phẩm.

### 1.2. Phạm vi hệ thống

BrewLite là hệ thống đặt đồ uống trực tuyến. Khách hàng có thể xem Menu, xem chi tiết và tùy chỉnh đồ uống, quản lý giỏ hàng, đặt đơn, thanh toán và theo dõi đơn hàng. Nhân viên có thể cập nhật trạng thái đơn theo quyền được cấp. Hệ thống hỗ trợ đăng ký, đăng nhập, xác thực JWT và các chức năng nền tảng phục vụ vận hành, triển khai.

Các luồng nghiệp vụ theo phân công Assignment 2:

1. TV1 – Xem Menu.
2. TV2 – Chọn tùy chọn sản phẩm.
3. TV3 – Giỏ hàng và khuyến mãi.
4. TV4 – Đặt đơn và kiểm tra tồn kho.
5. TV5 – Thanh toán.
6. TV6 – Theo dõi đơn, lịch sử đơn và điểm thưởng.
7. TV7 – Xác thực và nền tảng chung.

### 1.3. Thuật ngữ và quy ước

| Thuật ngữ | Ý nghĩa |
|---|---|
| FR | Functional Requirement – Yêu cầu chức năng |
| NFR | Non-Functional Requirement – Yêu cầu phi chức năng |
| US | User Story – Câu chuyện người dùng |
| AC | Acceptance Criteria – Tiêu chí chấp nhận/nghiệm thu |
| BR | Business Rule – Quy tắc nghiệp vụ |
| MoSCoW | Must, Should, Could, Won't – Phương pháp ưu tiên yêu cầu |
| API | Application Programming Interface – Giao diện lập trình ứng dụng |
| JWT | JSON Web Token – Token xác thực |
| PWA | Progressive Web App |
| MVP | Minimum Viable Product – Phiên bản sản phẩm tối thiểu |
| Idempotency-Key | Khóa giúp một yêu cầu thanh toán gửi lặp không tạo giao dịch trùng |

### 1.4. Quy ước mã yêu cầu

- FR được đánh số liên tục trong SRS: `FR-01`, `FR-02`, ...
- NFR được đánh số liên tục trong SRS: `NFR-01`, `NFR-02`, ...
- User Story dùng mã `US-01`, `US-02`, ...; trường hợp có nhiều vai trò trong cùng luồng có thể dùng mã nhánh như `US-07.1`.
- Acceptance Criteria ở cấp User Story dùng dạng `US-xx-AC-yy`; tiêu chí chi tiết của FR dùng dạng `FR-xx-AC-yy`.
- Các mã tạm trong tài liệu đóng góp (ví dụ `TV3-FR-01`) được ánh xạ sang mã chính thức trong các bảng dưới đây.
- Mã FR-34 đến FR-39 được dành cho luồng Theo dõi đơn TV6 trong bản SRS này.

### 1.5. Quy ước mức ưu tiên MoSCoW

| Mức ưu tiên | Ý nghĩa |
|---|---|
| Must | Bắt buộc phải có trong MVP/đợt nghiệm thu hiện tại. |
| Should | Quan trọng và nên hoàn thành; có thể xem xét điều chỉnh nếu có trở ngại về thời gian. |
| Could | Có giá trị nhưng không thiết yếu đối với MVP. |
| Won't | Không thực hiện trong MVP hiện tại; có thể xem xét ở phiên bản sau. |

## 2. Tổng quan hệ thống

### 2.1. Tác nhân

| Tác nhân | Mô tả |
|---|---|
| Khách hàng | Xem Menu, xem chi tiết sản phẩm, tùy chỉnh đồ uống, quản lý giỏ, đặt đơn, thanh toán và xem đơn của mình. |
| Nhân viên quầy | Đăng nhập bằng tài khoản nhân viên và cập nhật trạng thái đơn theo quyền được cấp. |
| Quản lý | Quản lý/giám sát hoạt động cửa hàng theo phạm vi quyền được cấp; quyền cụ thể cần đối chiếu Use-case Overview. |
| Dịch vụ thanh toán mô phỏng | Thành phần giả lập Ví/Thẻ, trả kết quả thanh toán thành công hoặc thất bại. |
| Pipeline CI/CD / Người vận hành | Gọi endpoint health check để kiểm tra hệ thống sau triển khai. |

> Danh sách actor và quyền cuối cùng cần được TV2 đối chiếu với Use-case Overview và đặc tả Use Case trước khi chốt.

### 2.2. Phân chia luồng và người phụ trách

| Thành viên | Luồng nghiệp vụ | Phần yêu cầu phụ trách |
|---|---|---|
| TV1 | Xem Menu | FR Menu; NFR hiệu năng và khả năng triển khai |
| TV2 | Chọn tùy chọn | FR chi tiết sản phẩm; NFR khả dụng, Mobile-first và PWA |
| TV3 | Giỏ hàng | FR giỏ hàng và khuyến mãi; NFR kèm theo là đề xuất của TV3, chờ TV2 duyệt |
| TV4 | Đặt đơn | FR đặt đơn và tồn kho; NFR toàn vẹn dữ liệu |
| TV5 | Thanh toán | FR thanh toán; NFR độ tin cậy và hiệu năng |
| TV6 | Theo dõi đơn | FR xác nhận đơn, lịch sử đơn, xem/cập nhật trạng thái và điểm thưởng; TV2 đã chốt quy tắc theo Assignment 2/Product Backlog |
| TV7 | Xác thực và nền tảng chung | FR xác thực, phân quyền, health check; NFR bảo mật và vận hành |

## 3. User Story và Acceptance Criteria

### 3.1. US-01 – Xem danh sách đồ uống (TV1)

**Là một** Khách hàng,  
**Tôi muốn** xem danh sách các món đồ uống kèm hình ảnh, tên món và giá tiền,  
**Để** tôi có thể dễ dàng xem và lựa chọn món đồ uống yêu thích một cách nhanh chóng.

| Mã AC | Tiêu chí chấp nhận | Yêu cầu liên quan |
|---|---|---|
| US-01-AC-01 | Khi mở trang Menu, hệ thống hiển thị ít nhất 12 món đồ uống với hình ảnh, tên và giá tiền tính bằng VNĐ. | FR-01 |
| US-01-AC-02 | Khi chọn một danh mục cụ thể, ví dụ “Trà sữa”, hệ thống chỉ hiển thị sản phẩm thuộc danh mục đó. Khi chọn “Tất cả”, hệ thống hiển thị toàn bộ sản phẩm. | FR-02 |
| US-01-AC-03 | Sản phẩm có `stock = 0` phải hiển thị nhãn “Hết hàng” và vô hiệu hóa nút thêm vào giỏ hàng. | FR-03 |
| US-01-AC-04 | Trong thời gian chờ dữ liệu từ Backend, giao diện hiển thị Skeleton Loading. | FR-04 |
| US-01-AC-05 | Khi xảy ra lỗi kết nối hoặc lỗi từ máy chủ, hệ thống hiển thị thông báo lỗi và nút “Thử lại”. | FR-04 |

### 3.2. US-02 – Chọn tùy chọn cho đồ uống (TV2)

**Là một** Khách hàng,  
**Tôi muốn** xem chi tiết món đồ uống và chọn Size, Topping, số lượng cùng ghi chú,  
**Để** tôi có thể tùy chỉnh đồ uống theo sở thích và biết giá tiền sau khi lựa chọn trước khi thêm vào giỏ hàng.

| Mã AC | Tiêu chí chấp nhận | Yêu cầu liên quan |
|---|---|---|
| US-02-AC-01 | Khi chọn một món trên Menu, hệ thống mở trang chi tiết và hiển thị đúng tên, hình ảnh, giá gốc của món đó. | FR-06 |
| US-02-AC-02 | Trang chi tiết lấy dữ liệu qua `GET /products/:id`; nếu sản phẩm không tồn tại, API trả `404 Not Found` và giao diện thông báo phù hợp. | FR-07 |
| US-02-AC-03 | Khách hàng chọn được một trong ba Size S, M hoặc L. | FR-08 |
| US-02-AC-04 | Khách hàng chọn được Topping Trân châu và/hoặc Kem khi các topping đó còn khả dụng. | FR-09 |
| US-02-AC-05 | Giá cập nhật theo lựa chọn: S cộng 0 VNĐ, M cộng 5.000 VNĐ, L cộng 10.000 VNĐ; mỗi topping được chọn cộng 5.000 VNĐ. | FR-10 |
| US-02-AC-06 | Khách hàng thay đổi được số lượng; số lượng gửi sang giỏ hàng là số nguyên dương. | FR-11 |
| US-02-AC-07 | Khách hàng có thể nhập ghi chú; ghi chú không bắt buộc và được chuyển sang giỏ hàng nếu có nhập. | FR-12, FR-14 |
| US-02-AC-08 | Topping hết hàng được hiển thị trạng thái “Hết hàng” và không thể chọn. | FR-13 |
| US-02-AC-09 | Khi nhấn “Thêm vào giỏ”, sản phẩm cùng Size, Topping, số lượng và ghi chú được chuyển sang luồng Giỏ hàng. | FR-14 |
| US-02-AC-10 | Trang chi tiết thao tác được trên thiết bị di động; thông tin và nút chọn không bị chồng lấn hoặc che khuất. | NFR-06, NFR-07 |

### 3.3. US-03 – Quản lý giỏ hàng và khuyến mãi (TV3)

**Là một** Khách hàng,  
**Tôi muốn** thêm, sửa, xóa các món đã chọn trong giỏ hàng, xem tổng tiền và áp dụng mã khuyến mãi,  
**Để** kiểm tra lại đơn và biết chính xác số tiền phải trả trước khi đặt đơn.

| Mã AC | Tiêu chí chấp nhận | Yêu cầu liên quan |
|---|---|---|
| US-03-AC-01 | Thêm món đã cấu hình vào giỏ; nếu trùng sản phẩm, Size, tập Topping và ghi chú thì cộng dồn số lượng vào dòng hiện có. | FR-15 |
| US-03-AC-02 | Có thể tăng/giảm số lượng, sửa tùy chọn và xóa từng dòng; tổng tiền được cập nhật lại. | FR-16, FR-18 |
| US-03-AC-03 | Có thể xóa toàn bộ giỏ sau khi xác nhận. | FR-17 |
| US-03-AC-04 | Giỏ giới hạn 10 ly/dòng và 20 dòng/giỏ; đây là đề xuất của TV3, chờ Product Owner chốt. | FR-19 |
| US-03-AC-05 | Giỏ được khôi phục khi tải lại trang hoặc mở lại tab trong cùng trình duyệt. | FR-21 |
| US-03-AC-06 | Giỏ rỗng hiển thị thông báo, nút quay về Menu và vô hiệu hóa nút đặt đơn. | FR-22 |
| US-03-AC-07 | Món/topping không còn khả dụng được cảnh báo, không được tính vào báo giá và không thể chuyển sang đặt đơn. | FR-23 |
| US-03-AC-08 | Khách có thể áp dụng tối đa một mã khuyến mãi; hệ thống hiển thị số tiền giảm hoặc lý do mã không hợp lệ. | FR-24 |
| US-03-AC-09 | Khách có thể gỡ mã; mã tự bị gỡ nếu giỏ không còn đáp ứng điều kiện. | FR-25 |
| US-03-AC-10 | Giỏ hợp lệ được chuyển sang checkout với các trường sản phẩm và mã khuyến mãi; không gửi giá do client tự quyết định. | FR-26 |

### 3.4. US-04 – Tạo đơn hàng (TV4)

**Là một** Khách hàng đã đăng nhập,  
**Tôi muốn** tạo đơn hàng từ giỏ hàng hiện tại và hệ thống tự động kiểm tra tồn kho, trừ kho,  
**Để** chính thức đặt mua sản phẩm và chuyển sang bước thanh toán.

| Mã AC | Tiêu chí chấp nhận | Yêu cầu liên quan |
|---|---|---|
| US-04-AC-01 | Khách đã đăng nhập và giỏ có sản phẩm; `POST /orders` trả HTTP 201 cùng mã đơn, tổng tiền và trạng thái chờ thanh toán. | FR-27 |
| US-04-AC-02 | Request không có JWT bị từ chối với HTTP 401; không tạo đơn và không trừ kho. | FR-27 |
| US-04-AC-03 | Đủ tồn kho thì hệ thống trừ đúng số lượng; không đủ kho trả HTTP 409 và không thay đổi dữ liệu kho. | FR-28 |
| US-04-AC-04 | Hủy đơn chưa thanh toán thì trạng thái chuyển thành đã hủy và tồn kho được hoàn lại chính xác. | FR-29 |

### 3.5. US-05 – Thanh toán không tiền mặt (TV5)

**Là một** Khách hàng,  
**Tôi muốn** thanh toán đơn bằng Ví/Thẻ mô phỏng,  
**Để** hoàn tất đơn hàng mà không cần sử dụng tiền mặt.

| Mã AC | Tiêu chí chấp nhận | Yêu cầu liên quan |
|---|---|---|
| US-05-AC-01 | Khách chọn Ví hoặc Thẻ và xác nhận; hệ thống tạo Payment với số tiền khớp tổng đơn hàng. | FR-30 |
| US-05-AC-02 | Gửi lại yêu cầu cùng `Idempotency-Key` không tạo thêm Payment và trả về kết quả trước đó. | FR-31 |
| US-05-AC-03 | Thanh toán thất bại hiển thị thông báo và nút thử lại; giữ giỏ và tồn kho theo quy tắc đã chốt. | FR-32 |
| US-05-AC-04 | Thanh toán thành công cập nhật đơn từ `PENDING` sang `PAID`. | FR-33 |

### 3.6. US-06 – Xác nhận, lịch sử và theo dõi đơn (TV6)

**Là một** Khách hàng đã đăng nhập,  
**Tôi muốn** xem xác nhận, lịch sử và trạng thái các đơn hàng của mình,  
**Để** biết đơn đã được tiếp nhận và đang ở bước nào.

| Mã AC | Tiêu chí chấp nhận | Yêu cầu liên quan |
|---|---|---|
| US-06-AC-01 | Sau khi tạo đơn thành công, màn hình xác nhận hiển thị mã đơn hàng và trạng thái hiện tại của đơn. | FR-34 |
| US-06-AC-02 | Khách hàng mở lịch sử đơn thì chỉ nhìn thấy các đơn thuộc tài khoản đang đăng nhập; danh sách được sắp xếp mới nhất trước. | FR-35 |
| US-06-AC-03 | Mỗi dòng lịch sử hiển thị tối thiểu mã đơn, trạng thái, tổng tiền và ngày đặt. | FR-35 |
| US-06-AC-04 | Người chưa đăng nhập gọi `GET /orders` bị từ chối với HTTP 401. | FR-35 |
| US-06-AC-05 | Khách hàng mở một đơn cụ thể và xem được chi tiết đơn cùng trạng thái hiện tại; không được xem dữ liệu đơn của tài khoản khác. | FR-36 |
| US-06-AC-06 | Trang theo dõi tự làm mới trạng thái theo chu kỳ 5–10 giây để hiển thị trạng thái mới nhất. | FR-37 |
| US-06-AC-07 | Trạng thái đơn được hiển thị theo các bước nghiệp vụ: chờ thanh toán, đã thanh toán, đang pha chế, sẵn sàng, hoàn thành hoặc đã hủy; trường hợp thanh toán lỗi hiển thị trạng thái tương ứng. | FR-37 |

### 3.6.1. US-06.1 – Nhân viên cập nhật trạng thái đơn

**Là một** Nhân viên quầy,  
**Tôi muốn** cập nhật trạng thái đơn theo đúng trình tự nghiệp vụ,  
**Để** khách hàng có thể theo dõi chính xác tiến độ xử lý đơn.

| Mã AC | Tiêu chí chấp nhận | Yêu cầu liên quan |
|---|---|---|
| US-06.1-AC-01 | Nhân viên đã đăng nhập với role `STAFF` có thể cập nhật trạng thái qua `PATCH /orders/:id/status` khi chuyển trạng thái hợp lệ. | FR-38 |
| US-06.1-AC-02 | Khách hàng không có quyền cập nhật trạng thái đơn; request từ vai trò Khách bị từ chối HTTP 403. | FR-38, FR-43 |
| US-06.1-AC-03 | Chuyển trạng thái sai thứ tự bị từ chối HTTP 409 và trạng thái đơn trong CSDL không thay đổi. | FR-38 |
| US-06.1-AC-04 | Đơn ở trạng thái `COMPLETED` hoặc `CANCELLED` là trạng thái cuối, không được chuyển tiếp sang trạng thái khác. | FR-38 |

### 3.6.2. US-06.2 – Ghi nhận điểm thưởng

**Là một** Khách hàng,  
**Tôi muốn** được ghi nhận điểm thưởng từ đơn hàng đủ điều kiện,  
**Để** có thể tích lũy điểm theo chính sách của cửa hàng.

| Mã AC | Tiêu chí chấp nhận | Yêu cầu liên quan |
|---|---|---|
| US-06.2-AC-01 | Hệ thống ghi nhận giao dịch điểm gắn với khách hàng và đơn hàng trong `LoyaltyTransaction` khi đơn đạt điều kiện tích điểm. | FR-39 |
| US-06.2-AC-02 | Khi đơn chuyển sang `COMPLETED`, hệ thống cộng 1 điểm cho mỗi 10.000 VNĐ giá trị thanh toán thực tế của đơn; số điểm được làm tròn xuống số nguyên. | FR-39 |
| US-06.2-AC-03 | Nếu cùng một đơn được xử lý chuyển sang `COMPLETED` nhiều lần hoặc request bị gửi lại, hệ thống vẫn chỉ ghi nhận tối đa một `LoyaltyTransaction` cho đơn đó. | FR-39 |

> **Quyết định đặc tả:** TV2 chốt luồng TV6 theo phân công Assignment 2 và Product Backlog: dùng `GET /orders` cho lịch sử đơn; chỉ nhân viên có quyền mới cập nhật trạng thái qua `PATCH /orders/:id/status`; điểm thưởng được ghi nhận khi đơn `COMPLETED`. TV6 thực hiện code/test theo các quy tắc này.

### 3.7. User Story xác thực và nền tảng (TV7)

**US-07.1 – Khách hàng đăng ký và đăng nhập**  
Là một Khách hàng, tôi muốn đăng ký tài khoản và đăng nhập, để đặt đơn và xem lịch sử đơn của mình.

**US-07.2 – Nhân viên đăng nhập**  
Là một Nhân viên quầy, tôi muốn đăng nhập với quyền nhân viên, để cập nhật trạng thái đơn mà khách hàng không được phép làm.

**US-07.3 – Kiểm tra sức khỏe hệ thống**  
Là một thành viên nhóm vận hành (DevOps), tôi muốn có endpoint kiểm tra sức khỏe hệ thống, để smoke test sau mỗi lần deploy và hỗ trợ dừng/rollback khi hệ thống lỗi.

| Mã AC | Tiêu chí chấp nhận | Yêu cầu liên quan |
|---|---|---|
| US-07-AC-01 | Đăng ký hợp lệ trả HTTP 201 và thông tin người dùng; không trả về mật khẩu hoặc passwordHash. | FR-40 |
| US-07-AC-02 | Email đã tồn tại trả HTTP 409; dữ liệu sai định dạng trả HTTP 400. | FR-40 |
| US-07-AC-03 | Đăng nhập đúng trả JWT; sai email hoặc mật khẩu trả HTTP 401 với thông báo không tiết lộ email có tồn tại hay không. | FR-41 |
| US-07-AC-04 | API cần xác thực từ chối request thiếu, sai chữ ký hoặc hết hạn JWT với HTTP 401. | FR-42 |
| US-07-AC-05 | Khách gọi API chỉ dành cho nhân viên bị từ chối HTTP 403. | FR-43 |
| US-07-AC-06 | Khách chưa đăng nhập mở checkout được chuyển tới đăng nhập; đăng nhập thành công quay lại checkout và giữ nguyên giỏ hàng. | FR-44 |
| US-07-AC-07 | Khi token hết hạn, giao diện xóa phiên cũ, thông báo và chuyển về trang đăng nhập. | FR-45 |
| US-07-AC-08 | `GET /health` trả 200 khi API và DB hoạt động; trả 503 khi DB mất kết nối. | FR-46 |
| US-07-AC-09 | Đăng xuất xóa token ở thiết bị hiện tại và trang cần đăng nhập yêu cầu đăng nhập lại. | FR-47 |

## 4. Yêu cầu chức năng (Functional Requirements – FR)

### 4.1. Luồng 1 – Xem Menu (TV1)

| Mã FR | Mã đóng góp | Tên yêu cầu | Mô tả | Ưu tiên |
|---|---|---|---|---|
| FR-01 | TV1-MENU-1 | Hiển thị danh sách sản phẩm | Hiển thị danh sách đồ uống gồm hình ảnh, tên món và giá tiền VNĐ. `GET /products` trả tối thiểu 12 sản phẩm. | Must |
| FR-02 | TV1-MENU-2 | Lọc sản phẩm theo danh mục | Khách hàng lọc danh sách theo danh mục như Cà phê, Trà sữa; có lựa chọn “Tất cả”. | Should |
| FR-03 | TV1-MENU-3 | Hiển thị trạng thái hết hàng | Sản phẩm có `stock = 0` hiển thị “Hết hàng” và vô hiệu hóa nút thêm vào giỏ. | Must |
| FR-04 | TV1-MENU-4 | Xử lý trạng thái tải và lỗi | Hỗ trợ Loading, Empty và Error/Retry khi lấy danh sách. | Must |
| FR-05 | TV1-MENU-5 | Tìm kiếm sản phẩm | Tìm đồ uống theo tên; không triển khai trong MVP hiện tại. | Won't |

#### 4.1.1. Tiêu chí nghiệm thu chi tiết

- **FR-01:** `GET /products` trả tối thiểu 12 sản phẩm. Mỗi sản phẩm có `id`, `name`, `price`, `imageUrl`; giao diện hiển thị đủ và chính xác các trường này.
- **FR-02:** Chọn danh mục cụ thể chỉ hiển thị sản phẩm thuộc danh mục đó; chọn “Tất cả” hiển thị toàn bộ sản phẩm.
- **FR-03:** Khi `stock = 0`, hiển thị nhãn “Hết hàng” và disable nút “Thêm vào giỏ”. Sản phẩm còn hàng vẫn tuân theo các điều kiện nghiệp vụ khác.
- **FR-04:** Loading hiển thị Skeleton Loading; danh sách rỗng hiển thị “Chưa có sản phẩm”; lỗi mạng/server hiển thị thông báo cùng nút “Thử lại”.
- **FR-05:** Tìm kiếm theo tên không nằm trong MVP; ghi nhận để xem xét ở phiên bản sau.

### 4.2. Luồng 2 – Chọn tùy chọn sản phẩm (TV2)

| Mã FR | Mã đóng góp | Tên yêu cầu | Mô tả | Ưu tiên |
|---|---|---|---|---|
| FR-06 | TV2-FR-01 | Xem chi tiết sản phẩm | Mở trang chi tiết của sản phẩm được chọn, hiển thị tên, hình ảnh và giá gốc. | Must |
| FR-07 | TV2-FR-02 | Lấy thông tin chi tiết sản phẩm | Frontend gọi `GET /products/:id`; sản phẩm không tồn tại trả `404 Not Found`. | Must |
| FR-08 | TV2-FR-03 | Chọn kích cỡ | Cho phép chọn một trong ba Size S, M hoặc L. | Must |
| FR-09 | TV2-FR-04 | Chọn Topping | Cho phép chọn Trân châu và/hoặc Kem theo lựa chọn được cung cấp và còn khả dụng. | Must |
| FR-10 | TV2-FR-05 | Cập nhật giá theo tùy chọn | Tự động tính và cập nhật giá khi thay đổi Size hoặc Topping. | Must |
| FR-11 | TV2-FR-06 | Chọn số lượng | Cho phép tăng/giảm số lượng sản phẩm; số lượng là số nguyên dương. | Must |
| FR-12 | TV2-FR-07 | Nhập ghi chú | Cho phép nhập ghi chú riêng cho món; ghi chú không bắt buộc. | Should |
| FR-13 | TV2-FR-08 | Xử lý Topping hết hàng | Hiển thị trạng thái hết hàng và không cho chọn topping không khả dụng. | Must |
| FR-14 | TV2-FR-09 | Thêm sản phẩm cùng tùy chọn vào giỏ | Chuyển mã sản phẩm, Size, Topping, số lượng, ghi chú sang phân hệ Giỏ hàng. | Must |

#### 4.2.1. Tiêu chí nghiệm thu chi tiết

- **FR-06:** Khi nhấn một món trên Menu, mở đúng trang chi tiết; hiển thị tối thiểu tên, hình ảnh và giá gốc của sản phẩm.
- **FR-07:** Gọi `GET /products/:id` bằng mã sản phẩm được chọn. Nếu tồn tại, trả dữ liệu chi tiết; nếu không tồn tại trả HTTP `404 Not Found`. Giao diện không hiển thị nhầm dữ liệu sản phẩm khác khi tải thất bại.
- **FR-08:** Chỉ chọn một Size trong S/M/L. Phụ thu theo nội dung TV2: S = 0 VNĐ, M = 5.000 VNĐ, L = 10.000 VNĐ.
- **FR-09:** Các topping MVP là Trân châu và Kem. Mỗi topping được chọn cộng 5.000 VNĐ; trạng thái chọn phải rõ ràng.
- **FR-10:** Giá cập nhật ngay, không tải lại trang. Công thức: `Giá tùy chọn = Giá gốc + Phụ thu Size + (Số topping được chọn × 5.000 VNĐ)`.
- **FR-11:** Số lượng là số nguyên dương; được chuyển cùng sản phẩm và tùy chọn sang giỏ.
- **FR-12:** Ghi chú không bắt buộc; nếu có thì chuyển cùng dữ liệu sản phẩm sang giỏ.
- **FR-13:** Topping hết hàng/không khả dụng hiển thị “Hết hàng”, không thể chọn; các lựa chọn hợp lệ khác vẫn sử dụng được.
- **FR-14:** Khi nhấn “Thêm vào giỏ”, chuyển tối thiểu `productId`, `sizeId`, `toppingIds`, `quantity`, `note` (nếu có). TV3 tiếp nhận và quản lý dữ liệu giỏ; TV2 không đặc tả lại thao tác sửa/xóa/tính tổng của giỏ.

### 4.3. Luồng 3 – Giỏ hàng và khuyến mãi (TV3)

| Mã FR | Mã đóng góp | Tên yêu cầu | Mô tả | Ưu tiên |
|---|---|---|---|---|
| FR-15 | TV3-FR-01 | Thêm món vào giỏ | Thêm món kèm Size, Topping, ghi chú, số lượng. Dòng trùng cấu hình được cộng dồn. | Must |
| FR-16 | TV3-FR-02 | Thay đổi số lượng | Tăng/giảm số lượng từng dòng; giảm về 0 thì xóa dòng. | Must |
| FR-17 | TV3-FR-03 | Xóa món/làm trống giỏ | Xóa từng dòng hoặc xóa toàn bộ giỏ sau khi xác nhận. | Must |
| FR-18 | TV3-FR-04 | Sửa tùy chọn trong giỏ | Cho phép đổi Size, Topping, ghi chú; các dòng trùng sau chỉnh sửa được gộp. | Should |
| FR-19 | TV3-FR-05 | Giới hạn số lượng | Đề xuất tối đa 10 ly/dòng và 20 dòng/giỏ; giá trị chờ Product Owner chốt. | Must – chờ xác nhận |
| FR-20 | TV3-FR-06 | Báo giá và tính tổng tiền | Server tính đơn giá dòng, thành tiền, tạm tính, giảm giá và tổng; client chỉ hiển thị kết quả server. | Must |
| FR-21 | TV3-FR-07 | Giữ giỏ khi tải lại trang | Lưu giỏ bằng `localStorage` và khôi phục khi tải lại trang/mở lại tab; không yêu cầu đăng nhập. | Must |
| FR-22 | TV3-FR-08 | Hiển thị giỏ rỗng | Hiển thị trạng thái giỏ rỗng, nút về Menu và disable nút Đặt đơn. | Must |
| FR-23 | TV3-FR-09 | Kiểm tra hết hàng/đổi giá trong giỏ | Báo dòng sản phẩm/topping không còn khả dụng; thông báo khi giá thay đổi; chặn đặt đơn khi còn dòng lỗi. | Should |
| FR-24 | TV3-FR-10 | Áp dụng mã khuyến mãi | Nhập một mã; server kiểm tra hiệu lực và trả số tiền giảm hoặc lý do không hợp lệ. | Should |
| FR-25 | TV3-FR-11 | Gỡ mã khuyến mãi | Gỡ mã thủ công hoặc tự gỡ khi giỏ không còn đáp ứng điều kiện. | Should |
| FR-26 | TV3-FR-12 | Chuyển giỏ sang đặt đơn | Chuyển `items[]` và mã khuyến mãi (nếu có) sang checkout khi giỏ hợp lệ; chưa yêu cầu đăng nhập ở bước giỏ. | Must |

#### 4.3.1. Tiêu chí nghiệm thu chi tiết

- **FR-15:** Thêm cấu hình món từ trang chi tiết. Dòng được xem là trùng khi cùng `productId`, `sizeId`, tập `toppingIds` (không phụ thuộc thứ tự) và `note`; nếu trùng thì cộng dồn số lượng thay vì tạo dòng mới.
- **FR-16:** Nút `+` tăng số lượng; nút `−` giảm số lượng. Khi giảm từ 1 về 0, dòng biến mất. Thành tiền dòng và tổng được tính lại.
- **FR-17:** Xóa một dòng làm tổng tiền tính lại. “Xóa tất cả” phải có bước xác nhận; xác nhận thì giỏ rỗng, hủy xác nhận thì giữ nguyên giỏ.
- **FR-18:** Có thể sửa Size/Topping/ghi chú của dòng. Sau khi sửa, đơn giá và tổng cập nhật; nếu trùng dòng khác thì gộp (không vượt giới hạn đã chốt). Không cho lưu cấu hình có topping hết hàng.
- **FR-19:** Nếu chốt giới hạn theo đề xuất TV3: mỗi dòng tối đa 10 ly, giỏ tối đa 20 dòng. Vượt giới hạn thì từ chối, thông báo và giữ nguyên giỏ. Server từ chối `quantity` không phải số nguyên trong khoảng 1–10 hoặc `items[]` có hơn 20 phần tử bằng HTTP 400.
- **FR-20:** Khi mở giỏ hoặc thay đổi giỏ/mã, client gọi `POST /promotions/validate`; server trả giá từng dòng, `subtotal`, `discount`, `total`. Giá hiển thị phải trùng phản hồi server; trường giá từ localStorage/client không được dùng làm giá có thẩm quyền. Lỗi mạng/500 hiển thị Retry và disable Đặt đơn.
- **FR-21:** Giỏ được khôi phục đúng dòng, số lượng, Size, Topping và ghi chú khi F5/đóng mở lại tab trong cùng trình duyệt. Dữ liệu localStorage hỏng không làm ứng dụng crash; sau khi đặt đơn thành công, giỏ được xóa.
- **FR-22:** Khi giỏ rỗng, hiển thị thông báo giỏ trống và nút “Xem menu”; nút “Đặt đơn” bị vô hiệu hóa; không gọi API báo giá cho giỏ rỗng.
- **FR-23:** Khi sản phẩm/topping hết hàng hoặc sản phẩm không còn tồn tại, dòng được gắn trạng thái tương ứng, không tính vào tổng và không cho đặt đơn. Nếu giá thay đổi, thông báo giá mới. Sau khi khách sửa/xóa dòng lỗi, có thể tiếp tục nếu giỏ còn dòng hợp lệ.
- **FR-24:** Mã hợp lệ được áp dụng và hiển thị giảm giá/tổng mới. Mã sai, chưa đến ngày bắt đầu, hết hạn, không đạt giá trị đơn tối thiểu, hết lượt (nếu có) hoặc bị tắt phải trả `valid=false` cùng `reason`; tổng không đổi. Một giỏ chỉ áp dụng tối đa một mã; mã mới thay thế mã cũ.
- **FR-25:** Gỡ mã làm giảm giá về 0 và tổng bằng tạm tính. Nếu thay đổi giỏ khiến mã mất điều kiện, mã tự bị gỡ và có thông báo. Xóa toàn bộ giỏ cũng gỡ mã.
- **FR-26:** Giỏ hợp lệ chuyển tới checkout với `items: [{productId, sizeId, toppingIds, quantity, note}]` và `promotionCode` nếu có. Không gửi giá do client tự tính như giá chính thức. Giỏ rỗng/có dòng lỗi bị chặn. Việc yêu cầu đăng nhập do luồng TV4/TV7 xử lý.

### 4.4. Luồng 4 – Đặt đơn (TV4)

| Mã FR | Mã đóng góp | Tên yêu cầu | Mô tả | Ưu tiên |
|---|---|---|---|---|
| FR-27 | TV4-FR-01 | Tạo đơn hàng từ giỏ | Khách đã đăng nhập gửi dữ liệu giỏ hợp lệ; hệ thống tạo `Order` và `OrderItem`, lưu giá tại thời điểm đặt và trả mã đơn. | Must |
| FR-28 | TV4-FR-02 | Kiểm tra và trừ tồn kho | Kiểm tra tồn kho và tạo đơn/trừ kho trong transaction; nếu không đủ kho thì rollback và trả `409 Conflict`. | Must |
| FR-29 | TV4-FR-03 | Hủy đơn chưa thanh toán và hoàn kho | Hỗ trợ hủy đơn chưa thanh toán; cập nhật trạng thái và cộng trả đúng số lượng đã trừ. | Should |

#### 4.4.1. Tiêu chí nghiệm thu chi tiết

- **FR-27:** Điều kiện trước: khách có JWT hợp lệ và giỏ có ít nhất một sản phẩm. Gọi `POST /orders`; hệ thống kiểm tra token, validate giỏ, tự tính lại tổng, tạo `Order`/`OrderItem`; trả HTTP 201 với `orderId`, tổng tiền, trạng thái và thời gian tạo. Không có JWT trả 401, không tạo đơn.
- **FR-28:** Nếu kho đủ, trừ đúng số lượng cùng transaction tạo đơn. Ví dụ stock 10, mua 2 thì còn 8. Nếu stock 1 mà đặt 2, trả 409, transaction rollback, stock giữ nguyên. Yêu cầu xử lý đồng thời không để stock âm.
- **FR-29:** Với đơn đang chờ thanh toán và đã trừ kho, thao tác hủy chuyển đơn sang “Đã hủy” và cộng lại đúng số lượng sản phẩm. Không hoàn kho chỉ vì thanh toán thất bại nếu đơn vẫn còn hiệu lực/chờ thử lại.

### 4.5. Luồng 5 – Thanh toán (TV5)

| Mã FR | Mã đóng góp | Tên yêu cầu | Mô tả | Ưu tiên |
|---|---|---|---|---|
| FR-30 | TV5-FR-01 | Thanh toán qua Ví/Thẻ mô phỏng | Cho phép chọn Ví/Thẻ, đối chiếu số tiền với `Order.total`, gọi dịch vụ mô phỏng và tạo bản ghi Payment. | Must |
| FR-31 | TV5-FR-02 | Chống thanh toán trùng (Idempotency) | Bắt buộc header `Idempotency-Key` dạng UUID; gửi lại cùng key phải trả kết quả cũ, không tạo giao dịch mới. | Must |
| FR-32 | TV5-FR-03 | Xử lý thanh toán thất bại | Ghi nhận Payment thất bại, thông báo khách và cho thử lại; giữ giỏ và tồn kho theo trạng thái đơn đã thống nhất. | Must |
| FR-33 | TV5-FR-04 | Cập nhật đơn sang Đã thanh toán | Khi mock payment thành công, cập nhật `Order.status` từ `PENDING` sang `PAID` trong transaction. | Must |

#### 4.5.1. Tiêu chí nghiệm thu chi tiết

- **FR-30:** Điều kiện trước: đơn `PENDING`, khách có JWT hợp lệ. Chọn `WALLET` hoặc `CARD`, gửi `POST /payments`; thành công trả HTTP 201, trạng thái Payment `SUCCESS`, lưu số tiền lấy từ `Order.total`. Client không gửi `amount`; server là nguồn duy nhất xác định số tiền.
- **FR-31:** Request phải có header `Idempotency-Key` (UUID). Gửi lại cùng key sau khi xử lý xong thì trả kết quả cũ, không tạo thêm Payment. Thiếu key trả HTTP 400. Kiểm thử đồng thời nhiều request cùng key chỉ tạo một Payment.
- **FR-32:** Thẻ test có 4 số cuối `0000` mô phỏng thất bại; API trả `422 Unprocessable Entity`, đơn chuyển `PAYMENT_FAILED`, tồn kho và dữ liệu giỏ được giữ để thử lại. Lần retry phải dùng `Idempotency-Key` mới.
- **FR-33:** Khi cổng mô phỏng xác nhận thành công, Payment được lưu và `Order.status` cập nhật sang `PAID` trong transaction. Đơn sẵn sàng cho bước xử lý tiếp theo.

### 4.6. Luồng 6 – Theo dõi đơn (TV6 – Theo dõi đơn)

| Mã FR | Mã đóng góp | Tên yêu cầu | Mô tả | Ưu tiên |
|---|---|---|---|---|
| FR-34 | TV6-FR-01 (chuẩn hóa) | Hiển thị xác nhận đơn | Sau khi tạo đơn thành công, hiển thị mã đơn hàng và trạng thái hiện tại do Backend trả về. | Must |
| FR-35 | TV6-FR-02 (chuẩn hóa) | Xem lịch sử đơn của khách hàng | Khách đã đăng nhập xem các đơn thuộc tài khoản của mình qua `GET /orders`; danh sách sắp xếp mới nhất trước. | Must |
| FR-36 | TV6-FR-03 (chuẩn hóa) | Xem chi tiết đơn hàng | Khách xem chi tiết đơn của chính mình qua `GET /orders/:id`; không được truy cập đơn của tài khoản khác. | Must |
| FR-37 | TV6-FR-04 (chuẩn hóa) | Theo dõi trạng thái đơn | Hiển thị trạng thái xử lý đơn và tự làm mới dữ liệu theo chu kỳ 5–10 giây. | Must |
| FR-38 | TV6-FR-05 (chuẩn hóa) | Cập nhật trạng thái theo đúng quy trình | Nhân viên cập nhật trạng thái qua API; chỉ chấp nhận chuyển trạng thái hợp lệ, từ chối chuyển sai thứ tự bằng HTTP 409. | Must |
| FR-39 | TV6-FR-06 (chuẩn hóa) | Ghi nhận điểm thưởng | Khi đơn chuyển sang `COMPLETED`, ghi giao dịch điểm cho khách theo quy tắc 1 điểm/10.000 VNĐ giá trị thanh toán thực tế; mỗi đơn chỉ ghi nhận một lần. | Should |

#### 4.6.1. Tiêu chí nghiệm thu chi tiết

- **FR-34:** Sau khi `POST /orders` tạo đơn thành công, giao diện xác nhận hiển thị đúng `orderId`/mã đơn và `status` do Backend trả về; không tự tạo mã đơn khác.
- **FR-35:** `GET /orders` yêu cầu JWT. Backend lấy `userId` từ claim `sub` của JWT, chỉ trả các đơn thuộc người dùng hiện tại và sắp xếp `createdAt` giảm dần. Không nhận `userId` tùy ý từ query/body để tra cứu lịch sử cá nhân. Mỗi phần tử có tối thiểu mã đơn, trạng thái, tổng tiền và ngày đặt. Thiếu/sai/hết hạn JWT trả HTTP 401.
- **FR-36:** `GET /orders/:id` yêu cầu JWT và trả mã đơn, trạng thái, tổng tiền, ngày tạo cùng danh sách `OrderItem`. Khách hàng chỉ được xem đơn của chính mình; nếu đơn không tồn tại hoặc không thuộc người dùng hiện tại, API trả HTTP 404 để không tiết lộ sự tồn tại của đơn người khác.
- **FR-37:** Giao diện hỗ trợ các trạng thái: `PENDING` (Chờ thanh toán), `PAYMENT_FAILED` (Thanh toán thất bại), `PAID` (Đã thanh toán), `PREPARING` (Đang pha chế), `READY` (Sẵn sàng), `COMPLETED` (Hoàn thành), `CANCELLED` (Đã hủy). Trang theo dõi tự gọi lại API chi tiết đơn theo chu kỳ 5–10 giây.
- **FR-38:** `PATCH /orders/:id/status` yêu cầu JWT và role `STAFF`; chỉ nhân viên được cập nhật trạng thái vận hành. Nhân viên chỉ thực hiện các bước `PAID → PREPARING`, `PREPARING → READY`, `READY → COMPLETED`; không được tự đặt trạng thái thanh toán `PAID`/`PAYMENT_FAILED` vì các trạng thái này do TV5 cập nhật theo kết quả thanh toán. Luồng hủy đơn chỉ được chuyển từ `PENDING` hoặc `PAYMENT_FAILED` sang `CANCELLED` theo state machine của TV4; `PAID → CANCELLED` bị từ chối. Chuyển trạng thái không hợp lệ trả HTTP 409, dữ liệu không đổi. `COMPLETED` và `CANCELLED` là trạng thái cuối.
- **FR-39:** Khi đơn chuyển từ `READY` sang `COMPLETED`, hệ thống tạo `LoyaltyTransaction` gồm `id`, `userId`, `orderId`, `points`, `createdAt`. Số điểm = phần nguyên của `totalPaid / 10.000` (1 điểm cho mỗi 10.000 VNĐ đã thanh toán); không cộng điểm cho đơn bị hủy hoặc chưa hoàn thành. Mỗi `orderId` chỉ được ghi nhận điểm một lần; việc cập nhật trạng thái và ghi nhận điểm phải bảo đảm không cộng trùng khi request được gửi lại.

> **NFR TV6:** Assignment 2 không giao TV6 một nhóm NFR riêng. Các API lịch sử/chi tiết/cập nhật trạng thái kế thừa xác thực JWT, phân quyền và kiểm tra dữ liệu theo yêu cầu NFR của TV7. Test chuyển trạng thái và test tính điểm là tiêu chí nghiệm thu chức năng của TV6.

### 4.7. Luồng 7 – Xác thực và nền tảng chung (TV7)

| Mã FR | Mã đóng góp | Tên yêu cầu | Mô tả | Ưu tiên |
|---|---|---|---|---|
| FR-40 | TV7-FR-01 | Đăng ký tài khoản | Đăng ký bằng email, mật khẩu và tên; email duy nhất; tài khoản mới có vai trò Khách. | Must |
| FR-41 | TV7-FR-02 | Đăng nhập và cấp JWT | Xác thực email/mật khẩu và cấp JWT chứa mã người dùng, vai trò. | Must |
| FR-42 | TV7-FR-03 | Bảo vệ API bằng JWT | API cần đăng nhập từ chối request thiếu token, sai chữ ký hoặc hết hạn. | Must |
| FR-43 | TV7-FR-04 | Phân quyền Khách/Nhân viên | API chỉ dành cho nhân viên từ chối tài khoản Khách. | Must |
| FR-44 | TV7-FR-05 | Trang đăng ký/đăng nhập và chặn route | Có trang đăng ký/đăng nhập; checkout yêu cầu đăng nhập và quay lại checkout sau khi đăng nhập. | Must |
| FR-45 | TV7-FR-06 | Xử lý token hết hạn ở giao diện | Khi API trả 401 do token hết hạn, xóa phiên cũ, thông báo và chuyển về đăng nhập. | Should |
| FR-46 | TV7-FR-07 | Kiểm tra sức khỏe hệ thống | `GET /health` kiểm tra API và kết nối database; 200 khi hoạt động, 503 khi database lỗi. | Must |
| FR-47 | TV7-FR-08 | Đăng xuất | Cho phép đăng xuất bằng cách xóa phiên/token tại thiết bị hiện tại. | Could |

#### 4.7.1. Tiêu chí nghiệm thu chi tiết

- **FR-40:** `POST /auth/register` nhận email, password, name. Đăng ký hợp lệ trả 201 với `id`, `email`, `name`, `role`, không trả mật khẩu; email trùng trả 409; email sai định dạng/thiếu trường/mật khẩu không hợp lệ trả 400. Mật khẩu được băm bcrypt trước khi lưu.
- **FR-41:** `POST /auth/login` đúng thông tin trả 200 kèm JWT và thông tin người dùng; sai email hoặc mật khẩu trả 401 với cùng thông báo để không tiết lộ email có tồn tại.
- **FR-42:** `JwtAuthGuard` kiểm tra header `Authorization: Bearer <token>`, chữ ký và thời hạn. Thiếu token, token bị sửa/sai chữ ký hoặc hết hạn đều trả 401; token hợp lệ cho phép request tới handler.
- **FR-43:** `RolesGuard` kiểm tra vai trò. Token `CUSTOMER` gọi `PATCH /orders/:id/status` trả 403 và không đổi trạng thái; token `STAFF` được phép đi tiếp nếu chuyển trạng thái hợp lệ.
- **FR-44:** Chưa đăng nhập mở checkout thì chuyển tới trang đăng nhập. Đăng nhập đúng quay về checkout và giỏ còn nguyên. Sai mật khẩu hiển thị lỗi tại form; form đăng ký validate dữ liệu trước khi gọi API.
- **FR-45:** Khi token hết hạn, API trả 401; giao diện thông báo phiên hết hạn, xóa token cũ và chuyển tới đăng nhập.
- **FR-46:** `GET /health` không yêu cầu đăng nhập. API và database hoạt động trả 200 với trạng thái tương ứng; database không kết nối được trả 503.
- **FR-47:** Khi đăng xuất, token bị xóa ở nơi lưu trên thiết bị hiện tại; trang cần đăng nhập yêu cầu đăng nhập lại. Việc thu hồi token phía server không thuộc phạm vi đã nêu.

## 5. Yêu cầu phi chức năng (Non-Functional Requirements – NFR)

### 5.1. Bảng tổng hợp NFR

| Mã NFR | Mã đóng góp | Nhóm | Nội dung yêu cầu | Ưu tiên | Tiêu chí nghiệm thu |
|---|---|---|---|---|---|
| NFR-01 | TV1-NFR-01 | Hiệu năng | API lấy danh sách sản phẩm phản hồi nhanh. | Must | Gọi `GET /products` 10 lần với dữ liệu mẫu; cả 10 lần dưới 500 ms. |
| NFR-02 | TV1-NFR-02 | Hiệu năng | Trang Menu tải nhanh trên thiết bị di động. | Should | Chrome DevTools giả lập mạng 4G/Mobile; nội dung Menu hiển thị đầy đủ dưới 3 giây. |
| NFR-03 | TV1-NFR-03 | Triển khai | Khởi chạy hệ thống bằng một lệnh. | Must | Trên máy đã cài Docker, `docker compose up` khởi chạy Frontend, Backend và PostgreSQL. |
| NFR-04 | TV1-NFR-04 | Triển khai | Có Production HTTPS và endpoint health check. | Must | URL Production truy cập HTTPS không cảnh báo; `GET /health` trả 200 khi hệ thống hoạt động. |
| NFR-05 | TV1-NFR-05 | Triển khai | Tự động triển khai và có hướng dẫn rollback. | Should | Tạo Git Tag kích hoạt pipeline deploy Render; có hướng dẫn rollback về bản stable gần nhất. |
| NFR-06 | TV2-NFR-01 | Khả dụng/Mobile-first | Trang chi tiết và điều khiển Size, Topping, số lượng ưu tiên thiết bị di động. | Must | Trên mobile, tên, ảnh, giá và tùy chọn rõ ràng; hoàn tất thao tác chọn và thêm giỏ mà không cần giao diện desktop. |
| NFR-07 | TV2-NFR-02 | Khả dụng/Responsive | Trang chi tiết thích ứng nhiều kích thước màn hình. | Should | Kiểm tra mobile và desktop; không chồng lấn, che nút hoặc tràn ngang do bố cục. |
| NFR-08 | TV2-NFR-03 | PWA | Có cấu hình PWA cơ bản gồm Web App Manifest và icon. | Should | Manifest tải thành công, khai báo thông tin ứng dụng và icon hợp lệ; trình duyệt nhận diện icon. |
| NFR-09 | TV3-NFR-01 | Hiệu năng | `POST /promotions/validate` phản hồi nhanh với giỏ thường gặp. | Should – đề xuất | 10 lần gọi với giỏ 5 dòng và seed data; cả 10 lần dưới 500 ms trên local/Docker Compose. |
| NFR-10 | TV3-NFR-02 | Toàn vẹn dữ liệu/Bảo mật giá | Server không tin giá do client gửi; server là nguồn tính giá có thẩm quyền. | Must – đề xuất | Gửi giá giả trong payload/localStorage; kết quả báo giá vẫn lấy từ DB và công thức server. |
| NFR-11 | TV3-NFR-03 | Độ bền dữ liệu giỏ | Dữ liệu localStorage hỏng/phiên bản cũ hoặc bị chặn không làm ứng dụng crash. | Must – đề xuất | JSON hỏng không gây trắng trang; khi localStorage bị chặn, giỏ vẫn hoạt động trong phiên hiện tại. |
| NFR-12 | TV3-NFR-04 | Usability/Mobile-first | Trang giỏ sử dụng được trên điện thoại. | Should – đề xuất | Ở viewport 360×640 không cuộn ngang; nút +/−/xóa cao tối thiểu 44 px. |
| NFR-13 | TV3-NFR-05 | Khả năng kiểm thử | Logic giỏ và khuyến mãi có unit test. | Should – đề xuất | Test bao phủ thêm/gộp/sửa/xóa, giới hạn dòng/số lượng, mã sai/hết hạn/thiếu tối thiểu/giảm tối đa; test chạy xanh trong CI. |
| NFR-14 | TV4-NFR-01 | Toàn vẹn dữ liệu | Xử lý đồng thời không làm tồn kho âm (race condition). | Must | Khi 2 request mua cùng sản phẩm chỉ còn 1 đơn vị cùng lúc, chỉ một request tạo đơn thành công, request còn lại nhận 409; `stock >= 0`. |
| NFR-15 | TV5-NFR-01 | Độ tin cậy | Idempotency xử lý đúng khi nhiều request cùng key gửi đồng thời. | Must | Gửi đồng thời 5 request cùng `Idempotency-Key`; chỉ một Payment được tạo, các request khác nhận kết quả cũ. |
| NFR-16 | TV5-NFR-02 | Hiệu năng | API thanh toán mock phản hồi nhanh. | Should | Với 20 request local, P95 thời gian phản hồi `POST /payments` dưới 1.000 ms. |
| NFR-17 | TV7-NFR-01 | Bảo mật | Mật khẩu được băm bcrypt có salt; không lưu hoặc ghi log mật khẩu gốc. | Must | DB chỉ có chuỗi bcrypt; response không có passwordHash; unit test băm/so khớp pass. |
| NFR-18 | TV7-NFR-02 | Bảo mật | JWT có thời hạn và ký bằng secret lấy từ biến môi trường. | Must | Token có `exp`; token hết hạn trả 401; đổi `JWT_SECRET` làm token cũ bị từ chối. |
| NFR-19 | TV7-NFR-03 | Bảo mật | Secret không được commit vào repo hoặc in ra log CI. | Must | `.env` nằm trong `.gitignore`, chỉ commit `.env.example` giả; quét repo/log CI không thấy secret thật. |
| NFR-20 | TV7-NFR-04 | Bảo mật | Input từ client phải validate ở server; lỗi thống nhất và không lộ chi tiết nội bộ. | Must | Payload sai trả 400 theo định dạng chung; response không chứa stack trace hoặc câu SQL. |
| NFR-21 | TV7-NFR-05 | Bảo mật/Cấu hình | Biến môi trường bắt buộc và kết nối DB được kiểm tra khi khởi động. | Should | Thiếu `JWT_SECRET` hoặc `DATABASE_URL`, API dừng và nêu biến cấu hình bị thiếu. |
| NFR-22 | TV7-NFR-06 | Khả năng vận hành | Mỗi request có request ID trong log để truy vết. | Should | Các dòng log của cùng request có chung request ID; response có header request ID. |
| NFR-23 | TV7-NFR-07 | Khả năng tái tạo | Database dựng lại được từ migration và seed trên máy sạch. | Must | Chạy migrate reset và seed không lỗi; `GET /health` trả 200 và tài khoản seed có thể đăng nhập. |

> NFR-09 đến NFR-13 là đề xuất bổ sung từ TV3, không phải nhóm NFR được giao riêng trong bảng phân công. TV2 cần quyết định giữ, sửa hoặc bỏ để tránh trùng lặp với NFR của các luồng khác.

### 5.2. Phương pháp kiểm thử NFR

| Mã NFR | Cách kiểm thử | Công cụ/môi trường | Kết quả mong đợi |
|---|---|---|---|
| NFR-01 | Gọi API 10 lần, ghi thời gian từng lần. | Postman/curl, dữ liệu seed | 10/10 lần dưới 500 ms. |
| NFR-02 | Giả lập mạng 4G/Mobile và đo thời gian tải Menu. | Chrome DevTools | Nội dung Menu hiển thị đầy đủ dưới 3 giây. |
| NFR-03 | Khởi chạy hệ thống trên môi trường Docker sạch. | Docker Compose | Web, API, DB khởi chạy bằng một lệnh. |
| NFR-04 | Truy cập URL Production và gọi `GET /health`. | Trình duyệt/curl | HTTPS hợp lệ; health trả 200 khi API và DB hoạt động. |
| NFR-05 | Tạo Git Tag và kiểm tra deploy/rollback. | GitHub Actions/Render | Pipeline deploy theo tag; có hướng dẫn rollback. |
| NFR-06 | Thao tác trang chi tiết trên điện thoại/giả lập mobile. | Điện thoại/Chrome DevTools | Chọn Size, Topping, số lượng và thêm giỏ được. |
| NFR-07 | Kiểm tra tối thiểu một viewport mobile và một desktop. | Chrome DevTools | Không tràn ngang, chồng lấn hoặc che nút. |
| NFR-08 | Kiểm tra manifest và icon. | Chrome DevTools | Manifest tải được, trường và icon hợp lệ. |
| NFR-09 | Gọi API 10 lần với giỏ 5 dòng, ghi từng thời gian. | curl/Postman/k6, Docker Compose local | 10/10 lần dưới 500 ms. |
| NFR-10 | Gửi giá giả và chạy unit/integration test. | Jest/Supertest | Giá phản hồi được tính từ dữ liệu DB, không dùng giá client. |
| NFR-11 | Ghi JSON hỏng vào localStorage và thử chặn localStorage. | Chrome DevTools/Jest | Không crash; giỏ rỗng hoặc hoạt động trong phiên. |
| NFR-12 | Mở trang giỏ ở 360×640 và thao tác các nút. | Chrome DevTools/điện thoại thật | Không cuộn ngang; nút thao tác tối thiểu 44 px. |
| NFR-13 | Chạy unit test logic giỏ và mã giảm giá trong CI. | Jest/Vitest/GitHub Actions | Các nhánh kiểm thử đã nêu đều pass. |
| NFR-14 | Gửi đồng thời nhiều request mua sản phẩm có tồn kho giới hạn. | Jest Integration Test/k6/script async | Không có stock âm; chỉ request phù hợp tồn kho thành công. |
| NFR-15 | Gửi 5 request đồng thời cùng Idempotency-Key. | Jest/Supertest | Một Payment duy nhất; các request còn lại trả kết quả cũ. |
| NFR-16 | Gửi 20 request liên tiếp và đo P95. | Postman Runner/Autocannon | P95 dưới 1.000 ms trên local. |
| NFR-17 | Kiểm tra bản ghi User, response API và unit test bcrypt. | PostgreSQL/Jest | Password lưu dạng bcrypt; response không lộ passwordHash. |
| NFR-18 | Giải mã token xem `exp`, gọi API bằng token hết hạn; đổi secret. | Integration Test/công cụ JWT | Token hết hạn hoặc ký bằng secret cũ bị 401. |
| NFR-19 | Quét repo/lịch sử commit và xem log CI. | git grep/công cụ quét secret/GitHub Actions | Không có secret thật; `.env` không bị commit. |
| NFR-20 | Gửi payload sai tới API xác thực. | Integration Test/Postman | Trả 400 định dạng thống nhất, không lộ stack trace/SQL. |
| NFR-21 | Khởi động API khi thiếu từng biến môi trường bắt buộc. | Local/Docker | API dừng và nêu tên biến thiếu. |
| NFR-22 | Gọi API và lọc log theo request ID. | Log API local | Cùng request có cùng request ID; response có header tương ứng. |
| NFR-23 | Clone trên máy sạch, migrate reset, seed, gọi health và đăng nhập. | Máy sạch/container mới | Toàn bộ quy trình không lỗi. |

## 6. Quy tắc nghiệp vụ (Business Rules)

### 6.1. Xem Menu – TV1

1. Giá sản phẩm hiển thị bằng VNĐ.
2. Sản phẩm hết hàng vẫn hiển thị trên Menu để khách biết tình trạng.
3. Sản phẩm có `stock = 0` không được thêm vào giỏ.
4. Lọc danh mục không làm thay đổi dữ liệu sản phẩm gốc.
5. Tìm kiếm sản phẩm theo tên không thuộc MVP.

### 6.2. Chọn tùy chọn – TV2

1. Mỗi sản phẩm có giá gốc hiển thị trên trang chi tiết.
2. Size thuộc MVP: S, M, L.
3. Phụ thu Size: S = 0 VNĐ, M = 5.000 VNĐ, L = 10.000 VNĐ.
4. Topping thuộc MVP: Trân châu và Kem.
5. Mỗi Topping được chọn cộng 5.000 VNĐ vào giá một sản phẩm.
6. Giá tùy chọn = giá gốc + phụ thu Size + phụ thu các Topping được chọn.
7. Topping hết hàng/không khả dụng không được phép chọn.
8. Số lượng phải là số nguyên dương.
9. Ghi chú sản phẩm là tùy chọn.
10. Khi chuyển sang Giỏ hàng, phải giữ nguyên sản phẩm và các lựa chọn khách đã chọn.

### 6.3. Giỏ hàng và khuyến mãi – TV3

| Mã BR | Nội dung quy tắc | Áp dụng |
|---|---|---|
| BR-3.1 | Giá do server quyết định. Client gửi `productId`, `sizeId`, `toppingIds`, `quantity`, `note`; mọi giá client gửi đều bị bỏ qua khi tính tiền. | Báo giá, tạo đơn |
| BR-3.2 | Đơn giá dòng = giá cơ bản + phụ thu Size + tổng giá Topping; thành tiền dòng = đơn giá × số lượng; tạm tính = tổng các dòng `AVAILABLE`. | Giỏ/báo giá |
| BR-3.3 | Hai dòng trùng khi cùng `productId`, `sizeId`, tập `toppingIds` (không phân biệt thứ tự) và `note`; dòng trùng được gộp. | Thêm/sửa món |
| BR-3.4 | Mỗi dòng tối đa 10 ly và mỗi giỏ tối đa 20 dòng – giá trị đang chờ TV2 chốt. | Thêm/sửa/báo giá |
| BR-3.5 | Giỏ lưu trong trình duyệt, không cần đăng nhập; đăng nhập chỉ bắt buộc khi đặt đơn. | Giỏ/checkout |
| BR-3.6 | Mỗi giỏ/đơn áp dụng tối đa một mã; mã không phân biệt hoa/thường và cắt khoảng trắng hai đầu. | Khuyến mãi |
| BR-3.7 | Mã hợp lệ khi đang bật, trong thời hạn, tạm tính đạt mức tối thiểu và (nếu có `usageLimit`) còn lượt sử dụng. | Khuyến mãi |
| BR-3.8 | Mã `PERCENT` giảm theo phần trăm, có thể giới hạn bởi `maxDiscountAmount`; mã `FIXED_AMOUNT` giảm số tiền cố định. Giảm giá không vượt tạm tính, tổng thanh toán không âm. | Khuyến mãi |
| BR-3.9 | Bước báo giá không tăng `usedCount`; chỉ tăng lượt dùng khi đơn được tạo thành công trong transaction của TV4. | Khuyến mãi/đặt đơn |
| BR-3.10 | Dòng có sản phẩm/topping hết hàng hoặc không còn tồn tại không được tính vào tổng và không được đặt đơn. | Giỏ/báo giá |
| BR-3.11 | Tiền tệ là VNĐ, biểu diễn bằng số nguyên, không có phần thập phân. | Toàn hệ thống |

### 6.4. Đặt đơn – TV4

1. `POST /orders` yêu cầu JWT hợp lệ.
2. Giá trong `OrderItem` phải được chốt theo giá tại thời điểm tạo đơn thành công, không thay đổi theo giá Menu về sau.
3. Kiểm tra và trừ tồn kho cùng transaction tạo đơn; nếu một mặt hàng không đủ, rollback toàn bộ giao dịch.
4. Hủy đơn chưa thanh toán phải hoàn lại đúng lượng tồn kho đã trừ.

### 6.5. Thanh toán – TV5

1. `amount` là số nguyên VNĐ và phải khớp chính xác `Order.total`.
2. Mỗi giao dịch thanh toán phải có `Idempotency-Key` duy nhất; cùng key không được tạo thanh toán trùng.
3. Thanh toán thất bại giữ giỏ và giữ tồn kho để khách có thể thử lại; chỉ hoàn kho khi đơn chuyển `CANCELLED` theo quy tắc TV5 đề xuất.
4. Cổng thanh toán trong phạm vi MVP là dịch vụ mô phỏng Ví/Thẻ; không tích hợp cổng thanh toán thật.

### 6.6. Theo dõi đơn – TV6

| Mã BR | Nội dung quy tắc | Áp dụng |
|---|---|---|
| BR-6.1 | Khách hàng phải đăng nhập và chỉ được xem lịch sử/chi tiết các đơn thuộc tài khoản hiện tại; `userId` được lấy từ JWT, không lấy từ dữ liệu client tự khai báo. | `GET /orders`, `GET /orders/:id` |
| BR-6.2 | Lịch sử đơn được sắp xếp theo `createdAt` giảm dần, đơn mới nhất hiển thị trước. | `GET /orders` |
| BR-6.3 | Chỉ cho phép các chuyển trạng thái: `PENDING → PAID`; `PENDING → PAYMENT_FAILED`; `PAYMENT_FAILED → PENDING` (thử thanh toán lại); `PAID → PREPARING → READY → COMPLETED`; và hủy từ `PENDING` hoặc `PAYMENT_FAILED` sang `CANCELLED`. `PAID → CANCELLED` bị cấm. | State machine đơn hàng |
| BR-6.4 | `PENDING → PAID` và `PENDING → PAYMENT_FAILED` do luồng thanh toán TV5 cập nhật; `PAYMENT_FAILED → PENDING` được thực hiện khi bắt đầu thử thanh toán lại. | Tích hợp TV5 |
| BR-6.5 | Chỉ tài khoản role `STAFF` được gọi `PATCH /orders/:id/status` để cập nhật các trạng thái xử lý của cửa hàng. Chuyển sai trạng thái trả HTTP 409 và không làm thay đổi dữ liệu. | `PATCH /orders/:id/status` |
| BR-6.6 | `COMPLETED` và `CANCELLED` là trạng thái cuối, không được chuyển sang trạng thái khác. | State machine đơn hàng |
| BR-6.7 | Chỉ cộng điểm khi đơn chuyển sang `COMPLETED`; cứ mỗi 10.000 VNĐ thanh toán thực tế được 1 điểm, phần lẻ dưới 10.000 VNĐ không tính điểm. Mỗi đơn chỉ được cộng điểm một lần. | `LoyaltyTransaction` |

### 6.7. Xác thực và nền tảng – TV7

1. Email là duy nhất trong hệ thống.
2. Tài khoản đăng ký mới có vai trò Khách; vai trò Nhân viên chỉ cấp qua seed/quản trị, không qua form đăng ký.
3. Thông báo đăng nhập thất bại dùng chung cho sai email và sai mật khẩu.
4. Đặt đơn bắt buộc đăng nhập với JWT hợp lệ.
5. Chỉ Nhân viên được đổi trạng thái đơn.
6. Mật khẩu có độ dài tối thiểu 8 ký tự là đề xuất của TV7, chờ Product Owner xác nhận.

## 7. Hợp đồng API và quyền sở hữu

### 7.1. Danh sách endpoint

| Endpoint | Người phụ trách | Mục đích | Xác thực |
|---|---|---|---|
| `GET /products` | TV1 | Lấy danh sách Menu, lọc danh mục | Không yêu cầu |
| `GET /products/:id` | TV2 | Lấy chi tiết sản phẩm, Size và Topping | Không yêu cầu |
| `POST /promotions/validate` | TV3 | Báo giá giỏ và kiểm tra mã khuyến mãi | Không yêu cầu theo tài liệu TV3 |
| `POST /orders` | TV4 | Tạo đơn và trừ tồn kho | JWT bắt buộc |
| `POST /payments` | TV5 | Thanh toán; nhận header `Idempotency-Key` | JWT của khách |
| `POST /auth/register` | TV7 | Đăng ký tài khoản | Không yêu cầu |
| `POST /auth/login` | TV7 | Đăng nhập, cấp JWT | Không yêu cầu |
| `GET /health` | TV7 | Kiểm tra sức khỏe API và DB | Không yêu cầu |
| `GET /orders` | TV6 | Lấy lịch sử đơn của khách đang đăng nhập; Backend tự lọc theo `sub` trong JWT | JWT bắt buộc |
| `GET /orders/:id` | TV6 | Xem chi tiết/theo dõi đơn | JWT và kiểm tra quyền sở hữu |
| `PATCH /orders/:id/status` | TV6 | Nhân viên cập nhật trạng thái đơn | JWT + role STAFF |

### 7.2. Payload tích hợp từ TV2 sang TV3 và TV4

Các file TV2, TV3 và TV4 cùng thể hiện các trường lựa chọn sản phẩm là mã sản phẩm, Size, Topping, số lượng và ghi chú. TV3/TV4 đề xuất cụ thể `sizeId`, `toppingIds`; cần TV2 xác nhận đây là tên trường chính thức trong `GET /products/:id` và payload giỏ.

```json
{
  "items": [
    {
      "productId": "p-001",
      "sizeId": "size-M",
      "toppingIds": ["t-01", "t-02"],
      "quantity": 2,
      "note": "Ít đá, ít ngọt"
    }
  ],
  "promotionCode": "GIAM10"
}
```

Không gửi giá client như giá có thẩm quyền. Nếu cần gửi `clientUnitPrice` để phát hiện giá thay đổi, server chỉ dùng để đối chiếu/thông báo, không dùng để tính tiền.

### 7.3. API `POST /promotions/validate` (TV3)

**Request đề xuất từ TV3:**

```json
{
  "items": [
    {
      "productId": "p-001",
      "sizeId": "size-L",
      "toppingIds": ["t-01"],
      "quantity": 2,
      "note": "Ít đá",
      "clientUnitPrice": 56000
    }
  ],
  "promotionCode": "GIAM10"
}
```

**Response minh họa từ TV3:**

```json
{
  "items": [
    {
      "productId": "p-001",
      "sizeId": "size-L",
      "toppingIds": ["t-01"],
      "quantity": 2,
      "status": "AVAILABLE",
      "unitPrice": 56000,
      "lineTotal": 112000,
      "priceChanged": false
    }
  ],
  "subtotal": 112000,
  "promotion": {
    "code": "GIAM10",
    "valid": true,
    "discountAmount": 11200,
    "reason": null
  },
  "discount": 11200,
  "total": 100800
}
```

- Mã hợp lệ: phản hồi có `valid=true`, `discountAmount` và `total`.
- Mã không hợp lệ: theo đề xuất TV3 vẫn trả HTTP 200 để trả được báo giá, kèm `valid=false` và `reason`.
- Payload sai (giỏ rỗng, `quantity` ngoài giới hạn, quá số dòng, thiếu trường bắt buộc): HTTP 400.
- Dòng sản phẩm/topping không còn bán được có trạng thái khác `AVAILABLE`; frontend hiển thị cảnh báo và chặn đặt đơn.
- Hợp đồng chính thức phải được TV7 ghi vào `docs/api-contract.md`; TV4 xác nhận payload `items[]` khớp với `POST /orders`.

### 7.4. API `POST /orders` (TV4)

- **Đầu vào:** `items[]` gồm `productId`, `quantity`, `sizeId`, `toppingIds`, `note`; thông tin khuyến mãi nếu có. JWT gửi qua `Authorization: Bearer <token>`.
- **Đầu ra dự kiến:** `id/orderId`, `totalAmount` hoặc `total`, `status`, `items`, `createdAt`.
- **Mã lỗi:** 400 dữ liệu giỏ không hợp lệ; 401 thiếu/sai JWT; 409 hết hàng/tồn kho không đủ.
- TV4 cần chốt tên trường trả về, trạng thái ban đầu và sự tương thích với payload/response của TV5.

### 7.5. API `POST /payments` (TV5)

- **Header:** `Authorization: Bearer <token>` và `Idempotency-Key: <UUID>`.
- **Body:** `orderId`, `method` (`WALLET` hoặc `CARD`) và `walletId`/`cardNumber` tương ứng. `Idempotency-Key` nằm ở header; client không gửi `amount`.
- **Thành công:** HTTP 201; phản hồi có Payment ID, orderId, amount, method, status `PAID`, createdAt.
- **Lỗi dự kiến:** 400 thiếu key/sai amount; 401 chưa đăng nhập; 404 không tìm thấy đơn; 422 thanh toán mô phỏng thất bại (cần thống nhất với lựa chọn 400 của TV5).
- Server phải lấy tổng tiền từ Order và đối chiếu, không tin amount do client tự gửi.

### 7.6. API xác thực và health check (TV7)

- `POST /auth/register`: nhận `email`, `password`, `name`; trả thông tin `id`, `email`, `name`, `role` và không trả mật khẩu.
- `POST /auth/login`: nhận `email`, `password`; trả `accessToken` và thông tin người dùng.
- `GET /health`: không yêu cầu JWT; 200 khi API và DB hoạt động, 503 khi DB không kết nối.
- JWT mang mã người dùng và vai trò. Tên claim (đề xuất `sub`, `role`) cùng thời hạn token cần được thống nhất trong API contract/ADR.

### 7.7. API xác nhận, lịch sử và theo dõi đơn (TV6 – đã chốt)

#### `GET /orders` – Lịch sử đơn của khách hàng

- **Xác thực:** JWT bắt buộc.
- **Quyền truy cập:** Backend lấy `userId` từ claim `sub` của JWT và chỉ trả đơn thuộc người dùng hiện tại; không cho client truyền `userId` để xem lịch sử người khác.
- **Sắp xếp:** `createdAt` giảm dần (mới nhất trước).
- **Dữ liệu tối thiểu:** `id`/`orderCode`, `status`, `total`, `createdAt`.
- **Lỗi:** `401 Unauthorized` nếu thiếu, sai chữ ký hoặc JWT hết hạn.
- **Quy ước route:** Chọn `GET /orders` theo bảng hợp đồng endpoint của Assignment 2. Không dùng `GET /orders/me` làm route chính thức trong MVP; cập nhật Acceptance Criteria của Product Backlog từ `/orders/me` thành `/orders`.

#### `GET /orders/:id` – Chi tiết đơn và dữ liệu theo dõi

- **Xác thực:** JWT bắt buộc.
- **Quyền truy cập:** Khách chỉ xem đơn của chính mình.
- **Dữ liệu tối thiểu:** Mã đơn, trạng thái, tổng tiền, ngày tạo và danh sách `OrderItem`.
- **Lỗi:** `401 Unauthorized` nếu chưa đăng nhập; `404 Not Found` nếu đơn không tồn tại hoặc không thuộc người dùng hiện tại.

#### `PATCH /orders/:id/status` – Nhân viên cập nhật trạng thái đơn

- **Xác thực/phân quyền:** JWT bắt buộc; chỉ role `STAFF` được gọi API này. Khách hàng gọi API sẽ nhận `403 Forbidden`.
- **Request body:** `{ "status": "PREPARING" }` với giá trị thuộc enum `OrderStatus`.
- **Các chuyển trạng thái xử lý bởi nhân viên:** `PAID → PREPARING`, `PREPARING → READY`, `READY → COMPLETED`. Trạng thái thanh toán `PAID`/`PAYMENT_FAILED` do TV5 cập nhật, không cho nhân viên ghi đè qua endpoint này.
- **Hủy đơn:** Chuyển sang `CANCELLED` chỉ từ `PENDING` hoặc `PAYMENT_FAILED`, thông qua nghiệp vụ hủy của TV4 và kiểm tra state machine chung. Không cho phép hủy từ `PAID`, `PREPARING`, `READY` hoặc trạng thái cuối. Refund không thuộc phạm vi MVP.
- **Kết quả:** Trả về đơn sau khi cập nhật thành công.
- **Lỗi:** `401 Unauthorized` nếu chưa xác thực; `403 Forbidden` nếu không có role `STAFF`; `404 Not Found` nếu không có đơn; `409 Conflict` nếu chuyển trạng thái không hợp lệ.

#### Quy tắc state machine đã chốt

| Trạng thái hiện tại | Trạng thái kế tiếp hợp lệ | Thành phần thực hiện |
|---|---|---|
| `PENDING` | `PAID`, `PAYMENT_FAILED`, `CANCELLED` | TV5 (kết quả thanh toán); luồng hủy TV4 |
| `PAYMENT_FAILED` | `PENDING`, `CANCELLED` | TV5 (thử thanh toán lại); luồng hủy TV4 |
| `PAID` | `PREPARING` | Nhân viên qua TV6 |
| `PREPARING` | `READY` | Nhân viên qua TV6 |
| `READY` | `COMPLETED` | Nhân viên qua TV6 |
| `COMPLETED` | Không có | Trạng thái cuối |
| `CANCELLED` | Không có | Trạng thái cuối |

Chuyển trạng thái không nằm trong bảng trên phải bị từ chối với HTTP 409 và không được cập nhật CSDL.

#### Ghi nhận điểm thưởng

- Chỉ ghi điểm khi đơn chuyển thành công từ `READY` sang `COMPLETED`.
- Số điểm = `floor(totalPaid / 10000)`, trong đó `totalPaid` là số tiền khách thực tế phải thanh toán sau khuyến mãi, tính theo VNĐ.
- Nếu số điểm tính được bằng 0 thì không tạo giao dịch điểm.
- Mỗi đơn chỉ tạo tối đa một giao dịch cộng điểm; ràng buộc duy nhất theo `orderId` hoặc cơ chế tương đương phải ngăn cộng trùng khi cập nhật trạng thái được gửi lại.
- Đơn `CANCELLED`, `PENDING`, `PAYMENT_FAILED`, `PAID`, `PREPARING` hoặc `READY` chưa được cộng điểm.

## 8. Dữ liệu và mô hình liên quan

### 8.1. Product / Size / Topping

- `Product` cần có dữ liệu sản phẩm, giá gốc, ảnh, danh mục và tồn kho phù hợp với Menu.
- `GET /products/:id` cần cung cấp Size, Topping và phụ thu tương ứng để TV2 hiển thị/tính giá.
- TV3 yêu cầu báo giá có thể đọc trạng thái hết hàng của sản phẩm và topping. TV1/TV2/TV4 cần xác nhận tên field/cột trong schema, ví dụ `stock`, `available` hoặc cấu trúc tồn kho riêng.
- Payload lựa chọn đang đề xuất: `productId`, `sizeId`, `toppingIds`, `quantity`, `note`.

### 8.2. Promotion (đề xuất TV3 gửi TV7 cho Class Diagram)

| Thuộc tính | Kiểu dự kiến | Ghi chú |
|---|---|---|
| `id` | UUID/Int | Khóa chính |
| `code` | String | Duy nhất, lưu chữ hoa |
| `description` | String | Mô tả hiển thị |
| `discountType` | Enum `DiscountType` | `PERCENT`, `FIXED_AMOUNT` |
| `discountValue` | Int | Phần trăm hoặc số tiền VNĐ |
| `maxDiscountAmount` | Int? | Mức giảm tối đa cho PERCENT |
| `minOrderValue` | Int | Tạm tính tối thiểu, mặc định 0 |
| `startsAt` | DateTime | Bắt đầu hiệu lực |
| `expiresAt` | DateTime | Hết hạn |
| `usageLimit` | Int? | Tổng số lượt dùng; null = không giới hạn |
| `usedCount` | Int | Số lượt đã dùng, mặc định 0 |
| `isActive` | Boolean | Bật/tắt mã |

Quan hệ đề xuất: `Order` giữ `promotionId?` hoặc `promotionCode` và `discountAmount` tại thời điểm đặt; `Promotion 0..1 — 0..* Order`. Cấu trúc cuối cùng cần TV3, TV4 và TV7 thống nhất với `schema.prisma`.

### 8.3. Order / OrderItem / Payment / LoyaltyTransaction

- TV4 phụ trách `Order`, `OrderItem`; giá của từng dòng được chốt tại thời điểm tạo đơn.
- TV5 phụ trách `Payment` và `Idempotency-Key`; Payment lưu dấu trạng thái/thông tin giao dịch mô phỏng.
- TV6 phụ trách luồng lịch sử/theo dõi trạng thái và `LoyaltyTransaction`.
- Enum `OrderStatus` dùng thống nhất: `PENDING`, `PAYMENT_FAILED`, `PAID`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`. State machine và thành phần có quyền chuyển từng trạng thái được quy định tại Mục 7.7.

**LoyaltyTransaction – thuộc tính theo Assignment 2:**

| Thuộc tính | Ý nghĩa |
|---|---|
| `id` | Mã giao dịch điểm thưởng |
| `userId` | Người dùng được ghi nhận điểm |
| `orderId` | Đơn hàng tạo ra điểm thưởng |
| `points` | Số điểm được cộng |
| `createdAt` | Thời điểm ghi nhận giao dịch |

Quan hệ: một `User` có nhiều `LoyaltyTransaction`; một `Order` có tối đa một giao dịch cộng điểm. Cần tạo unique constraint trên `LoyaltyTransaction.orderId` (hoặc cơ chế tương đương) để bảo đảm mỗi đơn chỉ được cộng điểm một lần.

## 9. Ma trận truy vết yêu cầu

| User Story | Mã FR | Mã NFR liên quan | Người phụ trách | Trạng thái |
|---|---|---|---|---|
| US-01 – Xem Menu | FR-01 đến FR-05 | NFR-01 đến NFR-05 | TV1 | Có tiêu chí; chờ gắn test/kết quả |
| US-02 – Chọn tùy chọn | FR-06 đến FR-14 | NFR-06 đến NFR-08 | TV2 | Có tiêu chí; chờ gắn test/kết quả |
| US-03 – Giỏ hàng | FR-15 đến FR-26 | NFR-09 đến NFR-13 (đề xuất) | TV3 | Có nội dung; một số quyết định chờ TV2/TV4/TV7 |
| US-04 – Đặt đơn | FR-27 đến FR-29 | NFR-14 | TV4 | Có nội dung; chờ thống nhất status/payload |
| US-05 – Thanh toán | FR-30 đến FR-33 | NFR-15 đến NFR-16 | TV5 | Có nội dung; chờ thống nhất kết quả thất bại/status |
| US-06 – Theo dõi đơn | FR-34 đến FR-39 | Không có NFR riêng được giao; áp dụng yêu cầu JWT/phân quyền liên quan của TV7 | TV6 | Quy tắc đã chốt trong SRS; chờ triển khai và gắn test |
| US-07 – Xác thực/nền tảng | FR-40 đến FR-47 | NFR-17 đến NFR-23 | TV7 | Có nội dung; chờ chốt claim/thời hạn JWT và một số cấu hình |

## 10. Nguồn đóng góp và lưu ý về phân công

| Tài liệu nguồn | Nội dung đã sử dụng |
|---|---|
| Nội dung SRS TV1/TV2 | FR-01 đến FR-14, NFR-01 đến NFR-08, US-01/US-02 và quy tắc hai luồng đầu |
| `tv3-fr-nfr-gio-hang.md` | US-03, FR-15 đến FR-26, NFR đề xuất, BR, API báo giá/khuyến mãi và các điểm cần xác nhận |
| `tv4--fr-nfr-thanh-toan.md` | US-04, FR-27 đến FR-29, NFR-14, BR và API `POST /orders` |
| `tv5-fr-nfr-cho-nhom.md` | US-05, FR-30 đến FR-33, NFR-15/NFR-16, BR và API `POST /payments` |
| `TV7_FR_NFR.md` | US-07.1 đến US-07.3, FR-40 đến FR-47, NFR-17 đến NFR-23, BR và API Auth/Health |
| `TV7_dieu_kien_JWT_gui_TV4.md` | Điều kiện trước, luồng thay thế, ngoại lệ và hậu điều kiện JWT cho `POST /orders` |
| `BrewLite Assignment 2 phân công công việc` và `BrewLite-UserStory-AcceptanceCriteria` | Nguồn yêu cầu TV6: xác nhận đơn, lịch sử, trạng thái, API theo dõi, làm mới 5–10 giây, state machine và điểm thưởng |
| `brewlite_donggop_tv6_phamvannhat 2.md` | File ghi luồng Auth/Payment thay vì Theo dõi đơn; không dùng nội dung file này để thay thế yêu cầu TV6. Các quyết định TV6 trong SRS được chuẩn hóa từ Assignment 2 và Product Backlog bởi TV2 |

## 11. Các vấn đề cần TV2/nhóm xác nhận trước khi duyệt SRS

### 11.1. Giỏ hàng và khuyến mãi (TV3)

1. **Giới hạn số lượng:** 10 ly/dòng và 20 dòng/giỏ là giá trị TV3 đề xuất; Product Owner (TV2) cần chốt.
2. **Phạm vi khuyến mãi:** Xác nhận MVP hỗ trợ cả mã giảm theo phần trăm (`PERCENT`) và số tiền cố định (`FIXED_AMOUNT`), hay chỉ một loại; xác nhận có `usageLimit` hay chỉ kiểm tra trạng thái, thời hạn và giá trị đơn tối thiểu.
3. **Hợp đồng `POST /promotions/validate`:** API gộp báo giá và kiểm tra mã theo phân công. TV7 đưa hợp đồng vào `docs/api-contract.md`; TV4 xác nhận `items[]` khớp với `POST /orders`.
4. **Mã không hợp lệ:** TV3 đề xuất HTTP 200 kèm `valid=false` và `reason` để vẫn trả báo giá không có mã; TV7/TV4 cần thống nhất cách xử lý.
5. **Tên trường tùy chọn:** TV2 xác nhận `sizeId`, `toppingIds`, `note` và dữ liệu phụ thu Size/Topping do `GET /products/:id` trả về.
6. **Tồn kho:** Báo giá cần đọc trạng thái hết hàng của sản phẩm và topping; TV1/TV2/TV4 xác nhận field/cột trong schema.
7. **Tăng `usedCount`:** TV3 đề xuất TV4 tăng `usedCount` trong transaction tạo đơn theo BR-3.9; TV4 cần đồng ý.
8. **Mã User Story và Use Case:** TV2 chốt mã User Story chính thức và mã UC của luồng Giỏ hàng.

### 11.2. Các vấn đề liên luồng còn cần đồng bộ

1. **Số lượng sản phẩm Menu:** FR TV1 yêu cầu tối thiểu 12 sản phẩm; Product Backlog Task API danh sách ghi dữ liệu mẫu 8 món. SRS giữ yêu cầu 12 theo đóng góp FR TV1; TV1/TV2 thống nhất lại dữ liệu seed và Acceptance Criteria trước khi nghiệm thu.
2. **Người phụ trách Task 4:** Assignment 2 giao TV2 luồng Chọn tùy chọn, trong khi tài liệu User Story ghi Task 4 “Chi tiết và tùy chọn sản phẩm” do TV3 phụ trách (hỗ trợ TV4). SRS phân theo Assignment 2; nhóm cập nhật lại bảng phân công/backlog để không còn hai người nhận cùng một đầu việc.
3. **Ví dụ giá ở TV3:** TV3-FR-06 có ví dụ Size L phụ thu 6.000 VNĐ, trong khi quy tắc TV2 ghi Size L +10.000 VNĐ. SRS giữ mức +10.000 VNĐ theo quy tắc TV2; TV3 cần sửa ví dụ tính giá cho thống nhất.
4. **HTTP status khi thanh toán thất bại:** TV5 ghi `400/422`; TV5/TV7 cần chọn một mã lỗi chính thức và dùng nhất quán trong API contract, test và frontend. Việc này không thay đổi state machine TV6: đơn vẫn chuyển sang `PAYMENT_FAILED` khi giao dịch thất bại.
5. **JWT:** Claim mã người dùng sử dụng `sub` và claim vai trò sử dụng `role` để các module dùng thống nhất; TV7 cần đồng bộ cấu hình phát hành/kiểm tra token và xác nhận thời hạn JWT trong ADR/API contract.
6. **PWA:** TV2 xác định rõ phạm vi MVP là Manifest + icon và khả năng cài đặt cơ bản; tính năng offline chỉ đưa vào nếu nhóm bổ sung vào backlog và có tiêu chí nghiệm thu riêng.
7. **NFR của TV3:** Các NFR-09 đến NFR-13 là phần TV3 đề xuất vì bảng phân công không giao NFR riêng; TV2 quyết định giữ/gộp/bỏ trước khi chốt baseline.
8. **Độ dài ghi chú và số lượng ở trang chi tiết:** Cần đồng bộ giới hạn `note` và số lượng tối đa với TV3. Giới hạn 10 ly/dòng của TV3 được chốt trong phần giỏ hàng; TV2 cần áp dụng cùng mức khi validate số lượng ở trang chi tiết hoặc bàn giao validation cho TV3.
9. **Topping hết hàng:** Thống nhất field khả dụng của topping trong API/schema, ưu tiên dùng một quy ước duy nhất (ví dụ `available` boolean hoặc `stock` số lượng) giữa TV2, TV3 và TV7.
10. **Trạng thái thanh toán và tên enum:** SRS chốt enum dùng `PENDING` (không dùng `PENDING_PAYMENT`) và `PAYMENT_FAILED`; TV4/TV5 cần đồng bộ schema, API contract và test theo enum này.
11. **Hủy đơn đã thanh toán:** State machine không cho phép `PAID → CANCELLED`. Nếu nghiệp vụ hoàn tiền/hủy đơn đã thanh toán được bổ sung, cần một quyết định kiến trúc và luồng refund riêng.

### 11.3. Các quyết định TV2 chốt cho luồng TV6

Các điểm sau được chốt để thống nhất SRS, API contract, Use Case, state machine và kiểm thử:

1. **API lịch sử:** Dùng `GET /orders`; JWT bắt buộc, backend lấy `userId` từ claim `sub` và chỉ trả đơn của người dùng hiện tại. Không sử dụng `GET /orders/me` trong MVP. `GET /orders/:id` chỉ cho chủ sở hữu đơn xem chi tiết; đơn không tồn tại hoặc không thuộc quyền xem trả `404`.
2. **API cập nhật trạng thái:** Dùng `PATCH /orders/:id/status`, bắt buộc JWT và role `STAFF`. Khách hàng nhận `403`. Nhân viên chỉ cập nhật tiến trình cửa hàng: `PAID → PREPARING → READY → COMPLETED`. Trạng thái thanh toán do TV5 quản lý; luồng hủy do TV4 xử lý và phải tuân thủ state machine chung.
3. **State machine:** `PENDING → PAID`; `PENDING → PAYMENT_FAILED`; `PAYMENT_FAILED → PENDING` khi thử thanh toán lại; `PAID → PREPARING → READY → COMPLETED`; cho phép hủy từ `PENDING` hoặc `PAYMENT_FAILED` sang `CANCELLED`. `PAID → CANCELLED` bị cấm. `COMPLETED` và `CANCELLED` là trạng thái cuối. Mọi chuyển trạng thái khác danh sách được phép trả `409 Conflict` và không đổi dữ liệu.
4. **Thời điểm tích điểm:** Chỉ cộng khi đơn chuyển sang `COMPLETED`, không cộng ngay tại `PAID`. Quy tắc này ưu tiên mô tả nhiệm vụ TV6 trong Assignment 2; Product Backlog Task 10(d) phải sửa theo quyết định này.
5. **Công thức điểm:** `points = floor(totalPaid / 10000)`, trong đó `totalPaid` là số tiền cuối cùng khách thực tế phải thanh toán sau khuyến mãi (đơn vị VNĐ). Phần lẻ dưới 10.000 VNĐ không tạo điểm; nếu kết quả bằng 0 thì không ghi giao dịch.
6. **Chống cộng trùng:** Mỗi đơn có tối đa một `LoyaltyTransaction` cộng điểm; dùng unique constraint theo `orderId` hoặc cơ chế idempotent tương đương. Việc chuyển `READY → COMPLETED` và tạo giao dịch điểm phải được xử lý nguyên tử hoặc có cơ chế bảo đảm không cộng trùng.
7. **Quyền cập nhật:** `PATCH /orders/:id/status` chỉ dành cho Nhân viên (`STAFF`). Các trạng thái do thanh toán TV5 cập nhật không được nhân viên ghi đè. TV4 chịu trách nhiệm luồng hủy đơn; TV6 chịu trách nhiệm kiểm tra state machine và luồng trạng thái vận hành.

> Đây là quyết định chuẩn hóa ở cấp tài liệu do TV2 tổng hợp để nhóm triển khai nhất quán. TV6, TV4, TV5 và TV7 cần đồng bộ code, `schema.prisma`, `docs/api-contract.md`, Use Case và Product Backlog theo các quyết định này; không mở lại các lựa chọn route, thời điểm cộng điểm hoặc state machine trừ khi nhóm có thay đổi được ghi nhận qua quyết định mới.

## 12. Definition of Done áp dụng cho yêu cầu

Một yêu cầu chỉ được đánh dấu hoàn tất khi:

- Chức năng đáp ứng mô tả và toàn bộ Acceptance Criteria đã thống nhất.
- Có test phù hợp (unit, integration, component hoặc E2E tùy loại yêu cầu) và kết quả được ghi nhận.
- API có validate đầu vào và xử lý lỗi theo hợp đồng đã thống nhất.
- Giao diện xử lý trạng thái loading và lỗi cơ bản khi có gọi API.
- Code có commit rõ ràng, được review qua Pull Request theo quy trình nhóm.
- Có hướng dẫn chạy/kiểm thử liên quan trong README hoặc tài liệu tương ứng.

---

> **Ghi chú quản lý tài liệu:**  Các thành viên liên quan cần đồng bộ API contract, state machine, quy tắc tích điểm, Use Case và test theo quyết định đã ghi nhận trước khi phát hành SRS baseline.
