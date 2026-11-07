# Hợp đồng API BrewLite

> **Người giữ file:** TV7. **Khung dựng:** 04/11/2026; **cập nhật 05/11/2026** (chốt JWT lưu ở localStorage và gửi bằng header Bearer). **Mỗi người điền endpoint của mình trước N6 (07/11).**
>
> Mỗi endpoint có đúng một người làm. Các luồng khác gọi theo hợp đồng này nên có thể code song song. Muốn đổi hợp đồng sau khi đã điền: báo người giữ file (TV7) và những người đang gọi endpoint đó, rồi ghi vào mục "Lịch sử thay đổi".

## 1. Cách điền

1. Chỉ sửa **phần endpoint của mình** (mục 4) để tránh xung đột khi gộp. Không sửa mục 2 và 3 nếu chưa báo TV7.
2. Thay mọi chỗ ghi `_Chưa điền_` bằng nội dung thật: request mẫu, response mẫu (JSON), các mã lỗi.
3. JSON mẫu phải **chạy được thật** (đúng tên trường, đúng kiểu dữ liệu). Người gọi endpoint sẽ code theo mẫu này.
4. Điền xong, đổi cột "Trạng thái" ở mục 3 từ `Khung` sang `Đã điền` và mở PR nhỏ (ví dụ `Task 2.x: Điền api-contract cho GET /products`).
5. Nếu thay đổi sau khi người khác đã code theo, **báo trong daily** và ghi vào mục 5.

## 2. Quy ước chung

| Mục | Quy ước (đề xuất, nhóm xác nhận) |
|---|---|
| Đường dẫn gốc | Không thêm tiền tố, đúng như bảng ở mục 3 (ví dụ `/products`). Nếu nhóm muốn tiền tố `/api` thì đổi tại đây một lần. |
| Định dạng | Request và response là JSON (`Content-Type: application/json`), tên trường dạng `camelCase`. |
| Xác thực | Endpoint cần đăng nhập nhận header `Authorization: Bearer <accessToken>`. Token lấy từ `POST /auth/login`. |
| Vai trò | `CUSTOMER` (Khách) và `STAFF` (Nhân viên), nằm trong JWT. Endpoint chỉ dành cho nhân viên trả 403 khi gọi bằng vai trò Khách. |
| Tiền tệ | VNĐ, số nguyên (ví dụ `45000`), không dùng số thập phân. |
| Thời gian | Chuỗi ISO 8601, múi giờ UTC (ví dụ `2026-11-06T08:30:00Z`). |
| Mã người dùng, mã đơn | Kiểu `id` (số hoặc chuỗi) theo `schema.prisma`. Các ví dụ dưới đây dùng số. |
| Mã request | Mỗi request có mã `requestId`. Response có header `X-Request-Id` và lỗi có trường `requestId` để truy vết log. |

### 2.1. Định dạng lỗi thống nhất

Mọi lỗi trả về theo cùng một dạng (TV7 làm bộ lọc lỗi chung):

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["email must be an email"],
  "requestId": "b1f4c0de-1111-4a2b-9c3d-0123456789ab"
}
```

`message` là chuỗi hoặc mảng chuỗi. Không bao giờ chứa stack trace hay câu SQL.

### 2.2. Mã trạng thái HTTP dùng chung

| Mã | Ý nghĩa | Ví dụ |
|---|---|---|
| 200 | Thành công | Lấy danh sách, đăng nhập |
| 201 | Tạo mới thành công | Đăng ký, tạo đơn |
| 400 | Dữ liệu gửi lên không hợp lệ | Thiếu trường, sai định dạng |
| 401 | Chưa đăng nhập hoặc token sai / hết hạn; sai email hoặc mật khẩu | Gọi `POST /orders` không có token |
| 403 | Đã đăng nhập nhưng không đủ quyền | Khách gọi `PATCH /orders/:id/status` |
| 404 | Không tìm thấy | `GET /orders/:id` không tồn tại |
| 409 | Xung đột trạng thái | Email đã tồn tại, hết hàng |
| 503 | Dịch vụ không sẵn sàng | `/health` khi mất kết nối database |

## 3. Bảng tổng hợp endpoint

Cột "Cần JWT" và "Vai trò" là **đề xuất của TV7**; chủ endpoint xác nhận hoặc sửa khi điền.

| Endpoint | Người làm | Cần JWT | Vai trò | Dùng cho | Trạng thái |
|---|---|---|---|---|---|
| `GET /products` | TV1 | Không | Mọi người | Menu (có lọc danh mục) | Khung |
| `GET /products/:id` | TV2 | Không | Mọi người | Chi tiết, size, topping | Khung |
| `POST /promotions/validate` | TV3 | Không | Mọi người | Giỏ hàng: báo giá và mã khuyến mãi | Khung |
| `POST /auth/register` | TV7 | Không | Mọi người | Đăng ký | Đã điền |
| `POST /auth/login` | TV7 | Không | Mọi người | Đăng nhập, cấp JWT | Đã điền |
| `GET /health` | TV7 | Không | Mọi người | Smoke test sau deploy | Đã điền |
| `POST /orders` | TV4 | Có | `CUSTOMER` | Đặt đơn | Khung |
| `POST /payments` | TV5 | Có | `CUSTOMER` | Thanh toán (header `Idempotency-Key`) | Khung |
| `GET /orders` | TV6 | Có | `CUSTOMER` (đơn của mình), `STAFF` (tất cả) | Lịch sử đơn | Khung |
| `GET /orders/:id` | TV6 | Có | `CUSTOMER` (đơn của mình), `STAFF` | Theo dõi đơn | Khung |
| `PATCH /orders/:id/status` | TV6 | Có | Chỉ `STAFF` | Nhân viên đổi trạng thái | Khung |

## 4. Chi tiết từng endpoint

### 4.1. `GET /products` (TV1)

**Gợi ý từ phân công:** lọc theo danh mục; dữ liệu seed từ 12 món, có vài món hết hàng.

- **Query:** _Chưa điền_ (ví dụ tên tham số lọc danh mục)
- **Response 200:** _Chưa điền_ (mẫu JSON)
- **Lỗi:** _Chưa điền_

### 4.2. `GET /products/:id` (TV2)

**Gợi ý từ phân công:** trả kèm size và topping; có trạng thái topping hết hàng.

- **Path:** `id` của sản phẩm
- **Response 200:** _Chưa điền_ (mẫu JSON, gồm size, topping, giá)
- **Lỗi:** _Chưa điền_ (ví dụ 404 khi không có sản phẩm)

### 4.3. `POST /promotions/validate` (TV3)

**Gợi ý từ phân công:** nhận nội dung giỏ và mã khuyến mãi, trả giá sau khuyến mãi; quy tắc hạn dùng và giá trị tối thiểu. Chốt payload giỏ với TV4.

- **Request:** _Chưa điền_ (mẫu JSON)
- **Response 200:** _Chưa điền_ (mẫu JSON)
- **Lỗi:** _Chưa điền_

### 4.4. `POST /auth/register` (TV7)

Tạo tài khoản mới, vai trò mặc định là `CUSTOMER`. Mật khẩu được băm bằng bcrypt, không bao giờ trả về.

- **Request:**

```json
{
  "email": "khach@example.com",
  "password": "MatKhau123",
  "name": "Nguyễn Văn A"
}
```

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `email` | chuỗi | Có | Đúng định dạng email, duy nhất |
| `password` | chuỗi | Có | Tối thiểu 8 ký tự (đề xuất) |
| `name` | chuỗi | Có | Không rỗng |

- **Response 201:**

```json
{
  "id": 1,
  "email": "khach@example.com",
  "name": "Nguyễn Văn A",
  "role": "CUSTOMER"
}
```

- **Lỗi:**

| Mã | Khi nào |
|---|---|
| 400 | Thiếu trường, email sai định dạng, mật khẩu quá ngắn |
| 409 | Email đã được đăng ký |

### 4.5. `POST /auth/login` (TV7)

Xác thực và cấp JWT. Sai email và sai mật khẩu cùng trả 401 với cùng một thông báo (không tiết lộ email có tồn tại hay không).

- **Request:**

```json
{
  "email": "khach@example.com",
  "password": "MatKhau123"
}
```

- **Response 200:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "khach@example.com",
    "name": "Nguyễn Văn A",
    "role": "CUSTOMER"
  }
}
```

- **Nội dung JWT (payload):** `sub` (mã người dùng), `role`, `iat`, `exp`. Thời hạn đề xuất 1 giờ.
- **Cách dùng token:** gửi header `Authorization: Bearer <accessToken>` ở các endpoint cần đăng nhập.
- **Lỗi:**

| Mã | Khi nào |
|---|---|
| 400 | Thiếu trường hoặc sai định dạng |
| 401 | Sai email hoặc mật khẩu |

**Lỗi chung của endpoint cần JWT** (JwtAuthGuard và RolesGuard, mọi người dùng chung):

| Mã | Khi nào |
|---|---|
| 401 | Không có token, token sai chữ ký hoặc token hết hạn |
| 403 | Token hợp lệ nhưng vai trò không đủ quyền |

### 4.6. `GET /health` (TV7)

Kiểm tra API chạy và kết nối được database. Không cần đăng nhập. Dùng cho smoke test sau deploy (TV1: CD và rollback).

- **Response 200:**

```json
{
  "status": "ok",
  "database": "up",
  "timestamp": "2026-11-06T08:30:00Z"
}
```

- **Response 503** (mất kết nối database):

```json
{
  "status": "error",
  "database": "down",
  "timestamp": "2026-11-06T08:30:00Z"
}
```

### 4.7. `POST /orders` (TV4)

Tạo đơn hàng mới từ giỏ hàng hiện tại, kiểm tra tồn kho và trừ kho an toàn trong một Database Transaction. Yêu cầu phải đăng nhập (có JWT).

- **Header:** `Authorization: Bearer <accessToken>`
- **Request:**

```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "sizeId": 1,
      "toppingIds": [1, 2],
      "note": "Ít đá, ít ngọt"
    }
  ],
  "promotionCode": "BREW2026"
}
```

- **Response 201:** 
```json
{
  "id": 105,
  "userId": 1,
  "total": 95000,
  "status": "PENDING",
  "createdAt": "2026-11-06T08:30:00Z",
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "price": 45000,
      "sizeId": 1
    }
  ]
}
```

- **Lỗi:** 
- **Lỗi:**

| Mã | Khi nào |
|---|---|
| 400 | Giỏ hàng rỗng (`items` trống), thiếu trường bắt buộc, sai kiểu dữ liệu hoặc `quantity <= 0` |
| 401 | Chưa đăng nhập, thiếu header `Authorization` hoặc token JWT sai / hết hạn |
| 409 | Sản phẩm hoặc topping hết hàng / số lượng tồn kho (`stock`) không đủ |

- **Response lỗi 400 (Dữ liệu gửi lên không hợp lệ):**

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": [
    "items should not be empty",
    "quantity must not be less than 1"
  ],
  "requestId": "b1f4c0de-1111-4a2b-9c3d-0123456789ab"
}
```

- **Response lỗi 401 (Chưa đăng nhập / Token hết hạn):**

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Unauthorized",
  "requestId": "b1f4c0de-1111-4a2b-9c3d-0123456789ab"
}
```

- **Response lỗi 409 (Sản phẩm hết hàng / Không đủ tồn kho):**

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Product stock is insufficient",
  "requestId": "b1f4c0de-1111-4a2b-9c3d-0123456789ab"
}
```

### 4.8. `POST /payments` (TV5)

**Gợi ý từ phân công:** header `Idempotency-Key`; gửi lại cùng key không tạo thanh toán trùng; thanh toán thành công thì đơn chuyển sang đã thanh toán; thất bại thì đơn vẫn chờ thanh toán.

- **Header:** `Authorization: Bearer <accessToken>`, `Idempotency-Key: <chuỗi duy nhất>`
- **Request:** _Chưa điền_ (mẫu JSON: đơn, phương thức Ví / Thẻ, số tiền)
- **Response 200 / 201:** _Chưa điền_ (mẫu JSON)
- **Lỗi:** _Chưa điền_ (thanh toán thất bại, số tiền không khớp đơn)

### 4.9. `GET /orders` (TV6)

**Gợi ý từ phân công:** lịch sử đơn.

- **Query:** _Chưa điền_ (nếu có phân trang hoặc lọc trạng thái)
- **Response 200:** _Chưa điền_ (mẫu JSON)
- **Lỗi:** _Chưa điền_

### 4.10. `GET /orders/:id` (TV6)

**Gợi ý từ phân công:** theo dõi đơn; giao diện tự làm mới mỗi 5 đến 10 giây.

- **Response 200:** _Chưa điền_ (mẫu JSON, có trạng thái đơn)
- **Lỗi:** _Chưa điền_ (404 không tìm thấy)

### 4.11. `PATCH /orders/:id/status` (TV6)

**Gợi ý từ phân công:** chỉ nhân viên; đổi trạng thái sai thứ tự bị từ chối; tích điểm khi hoàn thành.

- **Header:** `Authorization: Bearer <accessToken>` (vai trò `STAFF`)
- **Request:** _Chưa điền_ (mẫu JSON)
- **Response 200:** _Chưa điền_ (mẫu JSON)
- **Lỗi:** _Chưa điền_ (403 khi là Khách, mã lỗi cho chuyển trạng thái sai thứ tự)

## 5. Lịch sử thay đổi

| Ngày | Người sửa | Nội dung |
|---|---|---|
| 04/11/2026 | TV7 | Dựng khung; điền quy ước chung và 3 endpoint của TV7 (`/auth/register`, `/auth/login`, `/health`) |
| 05/11/2026 | TV7 | Chốt ADR JWT: token lưu ở localStorage và gửi bằng header Bearer (`POST /auth/login` trả `accessToken` trong body) |