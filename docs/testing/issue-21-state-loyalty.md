# Issue #21 — State machine và điểm thưởng

Phạm vi bám SRS §7.7, §11.3 và BR-6.1–BR-6.7. Không bao gồm Issue #55.

## Trạng thái được chấp nhận

| Hiện tại | Tiếp theo | Thành phần thực hiện |
| --- | --- | --- |
| PENDING | PAID, PAYMENT_FAILED | Payment service |
| PENDING | CANCELLED | Chủ sở hữu qua DELETE /orders/:id |
| PAYMENT_FAILED | PENDING | Payment service khi thử lại |
| PAYMENT_FAILED | CANCELLED | Chủ sở hữu qua DELETE /orders/:id |
| PAID | PREPARING | STAFF |
| PREPARING | READY | STAFF |
| READY | COMPLETED | STAFF |
| COMPLETED, CANCELLED | Không có | Trạng thái cuối |

`order-state.spec.ts` kiểm thử toàn bộ 49 cặp trạng thái và trường hợp mẫu sai thứ tự. PATCH trạng thái chỉ cho STAFF, không cho nhân viên ghi đè trạng thái thanh toán hoặc hủy qua endpoint tiến độ.

Trạng thái được kiểm tra trước khi cập nhật. `updateMany` điều kiện `{ id, status: from }` trong transaction bảo đảm chỉ một request thắng. Xung đột hoặc chuyển sai trả 409; không cập nhật dữ liệu. Luồng hủy truyền `userId` vào cả truy vấn trong transaction, ngoài bước kiểm tra quyền ban đầu. Hoàn kho sử dụng hợp đồng hiện tại của TV4: nguyên liệu khi món có RecipeItem, Product.stock cho dữ liệu legacy.

## Quy tắc điểm thưởng

- Chỉ READY → COMPLETED mới được cộng điểm.
- `floor(order.total / 10000)`; `order.total` đã là tiền sau giảm giá. Không trừ `discount` thêm lần nữa.
- Tổng dưới 10.000đ: hoàn thành đơn bình thường, không tạo LoyaltyTransaction 0 điểm.
- Điểm thuộc người đặt đơn, không thuộc nhân viên thao tác.
- Cập nhật trạng thái, tạo ledger và tăng điểm nằm trong cùng transaction.
- Unique `LoyaltyTransaction.orderId` có sẵn trong migration `20261113140000_add_loyalty_transaction`; không tạo migration trùng.
- Gửi lại COMPLETED trả 409; không cộng lần thứ hai.
- Hai request hoàn thành cùng đơn chỉ một request thành công; hai đơn khác nhau của cùng người dùng cộng điểm bằng atomic increment.

## Kiểm thử và tái hiện

Database PostgreSQL thật dành riêng cho TV6: `brewlite_tv6_tests`, cùng Docker PostgreSQL cổng 5433. Không reset database ứng dụng đang chạy.

Từ `apps/api`, PowerShell:

```powershell
$env:DATABASE_URL = 'postgresql://brewlite:brewlite123@localhost:5433/brewlite_tv6_tests?schema=public'
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd test -- --runInBand --runTestsByPath src/orders/order-state.spec.ts src/orders/loyalty-points.spec.ts
npm.cmd run test:e2e -- --runInBand --testPathPatterns=order-loyalty
```

Kết quả chạy thực tế: 63 unit tests và 15 HTTP/PostgreSQL tests pass.

| Tiêu chí | Bằng chứng |
| --- | --- |
| Chuyển trạng thái hợp lệ/sai, trạng thái cuối | order-state.spec.ts: ma trận 7×7 |
| Công thức, mốc 9.999/10.000, làm tròn, đầu vào sai | loyalty-points.spec.ts |
| PENDING → thanh toán → PREPARING → READY chưa có điểm | order-loyalty.e2e-spec.ts |
| READY → COMPLETED tính đúng sau giảm giá | order-loyalty.e2e-spec.ts |
| Không có ledger 0 điểm | order-loyalty.e2e-spec.ts |
| CUSTOMER 403, thiếu JWT 401 | order-loyalty.e2e-spec.ts |
| Gửi lại/đồng thời không cộng trùng | order-loyalty.e2e-spec.ts |
| Hai đơn cùng khách cộng dồn chính xác | order-loyalty.e2e-spec.ts |
| Unique ledger gây lỗi thì status rollback | order-loyalty.e2e-spec.ts |
| Hủy PAYMENT_FAILED không cộng điểm | order-loyalty.e2e-spec.ts |

Chi tiết kiểm thử quyền truy cập, lịch sử/chi tiết, hoàn kho và Playwright nằm trong bổ sung Issue #28.
# Cập nhật yêu cầu hủy đơn ngày 15/11/2026

- STAFF được hủy **PENDING/PREPARING** qua `DELETE /orders/staff/:id` hoặc `PATCH /orders/:id/status` với `CANCELLED`.
- CUSTOMER chỉ được hủy đơn của mình ở **PENDING/PAYMENT_FAILED** qua `DELETE /orders/:id`. Khách không được hủy PREPARING.
- Các bước PAID → PREPARING → READY → COMPLETED giữ nguyên; trạng thái kết thúc không chuyển tiếp.
- Hủy đơn và hoàn nguyên liệu từ snapshot nằm trong cùng transaction, chốt bằng trạng thái cũ để chống hoàn hai lần. Không hoàn tiền, không sửa giao dịch thanh toán, không cộng điểm cho đơn hủy.
- Bảng hủy theo vai trò có 14 unit cases, bổ sung kiểm tra hoàn snapshot đúng một lần và tương thích kho sản phẩm cũ trên PostgreSQL.

