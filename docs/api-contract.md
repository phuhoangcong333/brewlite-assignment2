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
| `GET /products` | TV1 | Không | Mọi người | Menu (có lọc danh mục) | Đã điền |
| `GET /products/:id` | TV2 | Không | Mọi người | Chi tiết, size, topping | Đã điền |
| `POST /promotions/validate` | TV3 | Không | Mọi người | Giỏ hàng: báo giá và mã khuyến mãi | Đã điền |
| `POST /auth/register` | TV7 | Không | Mọi người | Đăng ký | Đã điền |
| `POST /auth/login` | TV7 | Không | Mọi người | Đăng nhập, cấp JWT | Đã điền |
| `GET /health` | TV7 | Không | Mọi người | Smoke test sau deploy | Đã điền |
| `POST /orders` | TV4 | Có | `CUSTOMER` | Đặt đơn | Đã điền |
| `POST /payments` | TV5 | Có | `CUSTOMER` | Thanh toán (header `Idempotency-Key`) | Đã điền |
| `GET /orders` | TV6 | Có | `CUSTOMER` (đơn của mình), `STAFF` (tất cả) | Lịch sử đơn | Khung |
| `GET /orders/:id` | TV6 | Có | `CUSTOMER` (đơn của mình), `STAFF` | Theo dõi đơn | Khung |
| `PATCH /orders/:id/status` | TV6 | Có | Chỉ `STAFF` | Nhân viên đổi trạng thái | Khung |

## 4. Chi tiết từng endpoint

### 4.1. `GET /products` (TV1)

**Gợi ý từ phân công:** lọc theo danh mục; dữ liệu seed từ 12 món, có vài món hết hàng.
**Query:**

Tham số | Kiểu | Bắt buộc | Mô tả
categoryId | number | Không | ID danh mục cần lọc sản phẩm. Nếu không truyền, trả về tất cả sản phẩm.

Ví dụ:

GET /products
GET /products?categoryId=1

**Response 200:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Cà phê sữa đá",
      "price": 25000,
      "imageUrl": "/uploads/ca-phe-sua-da.jpg",
      "categoryId": 1,
      "categoryName": "Cà phê",
      "stock": 20,
      "isAvailable": true
    },
    {
      "id": 2,
      "name": "Bạc xỉu",
      "price": 30000,
      "imageUrl": "/uploads/bac-xiu.jpg",
      "categoryId": 1,
      "categoryName": "Cà phê",
      "stock": 0,
      "isAvailable": false
    }
  ],
  "total": 2
}
```

**Quy ước:**

- price: Giá sản phẩm, đơn vị VNĐ, kiểu số nguyên.
- stock: Số lượng tồn kho.
- isAvailable: true nếu còn hàng (stock > 0), false nếu hết hàng (stock = 0).
- categoryId: ID danh mục của sản phẩm.
- categoryName: Tên danh mục sản phẩm.
- total: Tổng số sản phẩm trong kết quả trả về.
- Không truyền categoryId thì lấy tất cả sản phẩm.
- Truyền categoryId thì chỉ lấy sản phẩm thuộc danh mục tương ứng.
- Sản phẩm hết hàng vẫn được trả về để giao diện hiển thị trạng thái hết hàng.

Lỗi:

| Mã | Trường hợp
| 400 | categoryId không hợp lệ hoặc không phải số nguyên dương.
| 404 | Không tìm thấy danh mục tương ứng với categoryId.
| 500 | Lỗi hệ thống khi truy vấn danh sách sản phẩm.

### 4.2. `GET /products/:id` (TV2)

**Response 200:**
```json
{
  "id": 1,
  "name": "Trà sữa trân châu",
  "description": "Trà sữa truyền thống",
  "price": 30000,
  "imageUrl": "/uploads/tra-sua.jpg",
  "sizes": [
    { "id": 1, "code": "S", "additionalPrice": 0 },
    { "id": 2, "code": "M", "additionalPrice": 5000 },
    { "id": 3, "code": "L", "additionalPrice": 10000 }
  ],
  "toppings": [
    {
      "id": 1,
      "code": "TRAN_CHAU",
      "name": "Trân châu",
      "additionalPrice": 5000,
      "isAvailable": true
    },
    {
      "id": 2,
      "code": "KEM",
      "name": "Kem",
      "additionalPrice": 5000,
      "isAvailable": false
    }
  ]
}
```

**Lỗi:**
|Mã	 |  Trường hợp
|400	 |  ID không hợp lệ
|404	 |  Không tìm thấy sản phẩm
|500	 |  Lỗi hệ thống

**Quy ước:**
- Size S: +0đ, M: +5.000đ, L: +10.000đ.
- Mỗi topping: +5.000đ.
- isAvailable = false: Topping hết hàng, không cho chọn.

### 4.3. `POST /promotions/validate` (TV3)

Báo giá cho giỏ hàng và kiểm tra mã khuyến mãi trong cùng một lần gọi. **Giá do server tính**: client chỉ gửi mã sản phẩm, size, topping, số lượng, ghi chú và mã khuyến mãi; mọi trường giá mà client gửi đều không được dùng để tính (xem ADR "Giá tính ở server"). Không cần đăng nhập. Endpoint **không thay đổi dữ liệu**: không trừ kho, không tăng lượt dùng mã (`usedCount` chỉ tăng khi `POST /orders` thành công).

Mảng `items` có **cùng cấu trúc** với `items` của `POST /orders` (mục 4.7) để client dùng một payload cho cả hai bước. `POST /orders` luôn tính lại giá, không tin kết quả báo giá cũ.

- **Request:**

```json
{
  "items": [
    {
      "productId": 1,
      "sizeId": 1,
      "toppingIds": [1, 2],
      "quantity": 2,
      "note": "Ít đá, ít ngọt",
      "clientUnitPrice": 56000
    }
  ],
  "promotionCode": "BREW2026"
}
```

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `items` | mảng | Có | 1 đến 20 phần tử |
| `items[].productId` | số | Có | Mã sản phẩm |
| `items[].sizeId` | số | Có | Mã size của sản phẩm (TV2) |
| `items[].toppingIds` | mảng số | Không | Có thể rỗng hoặc bỏ qua |
| `items[].quantity` | số nguyên | Có | 1 đến 10 |
| `items[].note` | chuỗi | Không | Ghi chú của khách (tối đa 200 ký tự, đề xuất) |
| `items[].clientUnitPrice` | số nguyên | Không | Đơn giá client đang hiển thị, **chỉ dùng để phát hiện giá đã đổi** (`priceChanged`), không dùng để tính |
| `promotionCode` | chuỗi | Không | Không phân biệt hoa/thường, cắt khoảng trắng hai đầu. Bỏ qua hoặc để rỗng nếu không dùng mã |

- **Response 200** (có mã hợp lệ):

```json
{
  "items": [
    {
      "productId": 1,
      "productName": "Trà sữa trân châu",
      "imageUrl": "/images/tra-sua.jpg",
      "sizeId": 1,
      "toppingIds": [1, 2],
      "quantity": 2,
      "status": "AVAILABLE",
      "unavailableToppingIds": [],
      "unitPrice": 56000,
      "lineTotal": 112000,
      "priceChanged": false
    }
  ],
  "subtotal": 112000,
  "promotion": {
    "code": "BREW2026",
    "valid": true,
    "discountAmount": 11200,
    "reason": null,
    "message": null
  },
  "discount": 11200,
  "total": 100800
}
```

| Trường | Ý nghĩa |
|---|---|
| `items[].status` | `AVAILABLE`, `OUT_OF_STOCK`, `TOPPING_OUT_OF_STOCK` hoặc `PRODUCT_NOT_FOUND` |
| `items[].unavailableToppingIds` | Các topping hết hàng của dòng (khi `status` là `TOPPING_OUT_OF_STOCK`), ngược lại là mảng rỗng |
| `items[].unitPrice` | Đơn giá một ly = giá cơ bản + phụ thu size + tổng giá topping |
| `items[].lineTotal` | `unitPrice × quantity`. Dòng không `AVAILABLE` có `lineTotal` bằng 0 và **không tính vào** `subtotal` |
| `items[].priceChanged` | `true` nếu `clientUnitPrice` có gửi và khác `unitPrice` hiện tại |
| `subtotal` | Tổng `lineTotal` của các dòng `AVAILABLE` |
| `promotion` | `null` nếu request không có `promotionCode` |
| `promotion.valid` | `true` nếu mã áp dụng được |
| `promotion.reason` | `null` khi hợp lệ; khi không hợp lệ là một trong: `PROMO_NOT_FOUND` (sai mã hoặc mã đã tắt), `PROMO_NOT_STARTED`, `PROMO_EXPIRED`, `PROMO_MIN_ORDER_NOT_MET`, `PROMO_USAGE_LIMIT_REACHED` |
| `promotion.message` | Câu tiếng Việt hiển thị cho khách khi không hợp lệ, ví dụ "Mã đã hết hạn" |
| `discount` | Số tiền giảm thực tế (0 nếu không có mã hoặc mã không hợp lệ) |
| `total` | `subtotal - discount`, luôn lớn hơn hoặc bằng 0 |

Cách tính giảm giá: loại `PERCENT` = làm tròn xuống (`subtotal × giá trị / 100`), không vượt mức giảm tối đa của mã; loại `FIXED_AMOUNT` = số tiền cố định. Giảm giá không vượt `subtotal`.

- **Response 200 khi mã không hợp lệ** (vẫn trả báo giá, tổng không đổi):

```json
{
  "items": [
    {
      "productId": 1,
      "productName": "Trà sữa trân châu",
      "imageUrl": "/images/tra-sua.jpg",
      "sizeId": 1,
      "toppingIds": [1, 2],
      "quantity": 2,
      "status": "AVAILABLE",
      "unavailableToppingIds": [],
      "unitPrice": 56000,
      "lineTotal": 112000,
      "priceChanged": false
    }
  ],
  "subtotal": 112000,
  "promotion": {
    "code": "HETHAN",
    "valid": false,
    "discountAmount": 0,
    "reason": "PROMO_EXPIRED",
    "message": "Mã đã hết hạn"
  },
  "discount": 0,
  "total": 112000
}
```

- **Response 200 khi có dòng hết hàng** (dòng đó không tính vào tổng):

```json
{
  "items": [
    {
      "productId": 3,
      "productName": "Cà phê sữa",
      "imageUrl": "/images/ca-phe-sua.jpg",
      "sizeId": 1,
      "toppingIds": [],
      "quantity": 1,
      "status": "OUT_OF_STOCK",
      "unavailableToppingIds": [],
      "unitPrice": 35000,
      "lineTotal": 0,
      "priceChanged": false
    }
  ],
  "subtotal": 0,
  "promotion": null,
  "discount": 0,
  "total": 0
}
```

- **Lỗi:**

| Mã | Khi nào |
|---|---|
| 400 | `items` rỗng hoặc quá 20 phần tử; `quantity` ngoài khoảng 1 đến 10; thiếu `productId` hoặc `sizeId`; sai kiểu dữ liệu |
| 500 | Lỗi máy chủ không lường trước |

Mã khuyến mãi không hợp lệ và sản phẩm không còn bán **không phải lỗi HTTP**: endpoint vẫn trả 200 và báo qua `promotion.valid`, `promotion.reason` và `items[].status`, để giao diện có báo giá hiển thị kèm lý do. Endpoint không cần JWT nên không trả 401 hoặc 403. Lỗi 400 và 500 theo định dạng thống nhất ở mục 2.1.

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

Xử lý thanh toán đơn hàng qua Ví hoặc Thẻ mô phỏng. Bắt buộc có `Idempotency-Key` để chống trừ tiền trùng khi gửi lại; cập nhật đơn sang `PAID` khi thành công.

- **Header:**
  - `Authorization: Bearer *** (vai trò `CUSTOMER`)
  - `Idempotency-Key: <UUID>` (chuỗi duy nhất toàn cục)

- **Request:**

```json
{
  "orderId": 1042,
  "amount": 85000,
  "method": "MOCK_WALLET"
}
```

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `orderId` | số nguyên (Int) | Có | Đơn hàng tồn tại, đang ở trạng thái `PENDING` hoặc `PAYMENT_FAILED` |
| `amount` | số nguyên (Int) | Có | Đơn vị VNĐ, phải khớp chính xác với `Order.total` |
| `method` | chuỗi (String) | Có | Chỉ chấp nhận `"MOCK_WALLET"` (Ví) hoặc `"MOCK_CARD"` (Thẻ) |

- **Response 200 / 201** (201: tạo mới thành công; 200: trả lại kết quả cũ khi trùng Idempotency-Key):

```json
{
  "id": 1,
  "orderId": 1042,
  "idempotencyKey": "b1f4c0de-1111-4a2b-9c3d-0123456789ab",
  "amount": 85000,
  "method": "MOCK_WALLET",
  "status": "PAID",
  "transactionId": "TXN-987654321",
  "createdAt": "2026-11-06T08:35:00Z"
}
```

- **Lỗi:**

| Mã | Khi nào |
|---|---|
| 400 | Thiếu header `Idempotency-Key`, thiếu trường hoặc `amount` không khớp với tổng tiền đơn hàng |
| 401 | Chưa đăng nhập, token sai hoặc token hết hạn |
| 403 | Không có quyền thanh toán đơn hàng này (đơn không thuộc về người dùng hiện tại) |
| 404 | Không tìm thấy đơn hàng theo `orderId` |
| 409 | Đơn hàng không ở trạng thái được phép thanh toán (đã hoàn thành hoặc đã hủy) hoặc xung đột Idempotency-Key |
| 422 | Thanh toán mô phỏng thất bại (thẻ test lỗi đuôi `0000`, ví không đủ tiền); đơn chuyển `PAYMENT_FAILED`, giữ nguyên tồn kho để thử lại |

- **Quy ước:**
  - `Idempotency-Key` là duy nhất toàn cục trong bảng `Payment`.
  - Thanh toán thành công: Cập nhật `Order.status` sang `PAID` trong transaction.
  - Thanh toán thất bại (422): Cập nhật `Order.status` sang `PAYMENT_FAILED`, giữ nguyên tồn kho và giỏ hàng, cho phép khách đổi phương thức để thanh toán lại.


### 4.9. `GET /orders` (TV6)

**Gợi ý từ phân công:** Trả về lịch sử đơn hàng của khách hàng đang đăng nhập, sắp xếp từ mới nhất đến cũ nhất.

- **Header:** `Authorization: Bearer <accessToken>`
- **Query:** Không có. Backend lấy userId từ JWT.
- **Request:** Không có body.

- **Response 200:**

```json
[
  {
    "id": 105,
    "userId": 1,
    "total": 95000,
    "status": "PREPARING",
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
]
```

**Quy ước:**
- Khách hàng chỉ xem được đơn hàng của chính mình.
- Danh sách sắp xếp theo `createdAt` giảm dần.
- Nếu chưa có đơn hàng, trả về mảng rỗng `[]`.
- `total` và `price` là số nguyên VNĐ.
- Trạng thái đơn sử dụng enum `OrderStatus`.

**Lỗi:**

| Mã | Trường hợp |
|---|---|
| 401 | Không có JWT, JWT không hợp lệ hoặc hết hạn |
| 500 | Lỗi hệ thống khi truy vấn lịch sử đơn hàng |

### 4.10. `GET /orders/:id` (TV6)

**Gợi ý từ phân công:** Xem chi tiết và theo dõi trạng thái đơn hàng. Giao diện tự làm mới mỗi 5 đến 10 giây.

- **Header:** `Authorization: Bearer <accessToken>`
- **Path parameter:** `id` là mã đơn hàng, kiểu số nguyên dương.
- **Request:** Không có body.

- **Response 200:**

```json
{
  "id": 105,
  "userId": 1,
  "total": 95000,
  "status": "READY",
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

**Quy ước:**
- Khách hàng chỉ được xem đơn hàng của mình.
- Đơn hàng không tồn tại hoặc không thuộc khách hàng trả về `404`.
- Trạng thái gồm: `PENDING`, `PAID`, `PAYMENT_FAILED`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`.
- Frontend tự gọi lại API sau mỗi 5 đến 10 giây để cập nhật trạng thái.
- API chỉ lấy dữ liệu, không thay đổi trạng thái đơn hàng.

**Lỗi:**

| Mã | Trường hợp |
|---|---|
| 400 | ID đơn hàng không hợp lệ |
| 401 | Không có JWT, JWT không hợp lệ hoặc hết hạn |
| 404 | Không tìm thấy đơn hàng hoặc đơn không thuộc khách hàng |
| 500 | Lỗi hệ thống |

### 4.11. `PATCH /orders/:id/status` (TV6)

**Gợi ý từ phân công:** Nhân viên cập nhật trạng thái đơn hàng theo đúng thứ tự. Chuyển trạng thái sai bị từ chối; tích điểm khi đơn hoàn thành.

- **Header:** `Authorization: Bearer <accessToken>` (vai trò `STAFF`)
- **Path parameter:** `id` là mã đơn hàng, kiểu số nguyên dương.

- **Request:**

```json
{
  "status": "PREPARING"
}
```

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `status` | string | Có | Trạng thái đích phải hợp lệ theo State Machine |

- **Response 204:** Cập nhật thành công, không trả về body. Frontend gọi lại `GET /orders/:id` để lấy trạng thái mới.

**Quy ước:**
- Chỉ nhân viên có vai trò `STAFF` được cập nhật trạng thái.
- Các chuyển trạng thái do nhân viên thực hiện:
  - `PAID` → `PREPARING`
  - `PREPARING` → `READY`
  - `READY` → `COMPLETED`
- Không được bỏ qua bước hoặc cập nhật đơn đã hoàn thành/hủy.
- Thanh toán và hủy đơn được xử lý bởi nghiệp vụ tương ứng, không thông qua endpoint này.
- Khi đơn chuyển từ `READY` sang `COMPLETED`, hệ thống ghi nhận `LoyaltyTransaction`.
- Điểm thưởng dự kiến: `points = floor(total / 10000)`, với `total` là tổng tiền thực trả.
- Mỗi đơn hàng chỉ được cộng điểm một lần.
- Việc cập nhật trạng thái và ghi nhận điểm thưởng thực hiện trong cùng database transaction.

**Lỗi:**

| Mã | Trường hợp |
|---|---|
| 400 | ID hoặc status không hợp lệ, thiếu trường bắt buộc |
| 401 | Không có JWT, JWT không hợp lệ hoặc hết hạn |
| 403 | Người dùng không có vai trò STAFF |
| 404 | Không tìm thấy đơn hàng |
| 409 | Chuyển trạng thái sai thứ tự hoặc xung đột cập nhật |
| 500 | Lỗi hệ thống |

- **Response lỗi 409 (Chuyển trạng thái không hợp lệ):**

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Invalid order status transition: PAID -> COMPLETED",
  "requestId": "b1f4c0de-1111-4a2b-9c3d-0123456789ab"
}
```

Các lỗi khác sử dụng định dạng thống nhất tại mục 2.1.
  

## 5. Lịch sử thay đổi

| Ngày | Người sửa | Nội dung |
|---|---|---|
| 04/11/2026 | TV7 | Dựng khung; điền quy ước chung và 3 endpoint của TV7 (`/auth/register`, `/auth/login`, `/health`) |
| 05/11/2026 | TV7 | Chốt ADR JWT: token lưu ở localStorage và gửi bằng header Bearer (`POST /auth/login` trả `accessToken` trong body) |
