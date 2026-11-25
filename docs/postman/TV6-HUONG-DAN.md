# TV6 — Postman và minh chứng kiểm thử

Collection [`TV6.postman_collection.json`](TV6.postman_collection.json) dùng chuẩn Postman v2.1, gồm **78 request**. Chạy toàn bộ theo thứ tự bằng Collection Runner. Phạm vi gồm kho theo size, phân quyền, trạng thái/lịch sử đơn, hủy và hoàn kho, snapshot công thức, thanh toán mô phỏng thất bại, điểm thưởng và validation.

Kết quả và ảnh nằm trong [`evidence/TV6-20261125/`](evidence/TV6-20261125/). Mở `index.html` hoặc xem ảnh trong `screenshots/`. Ảnh API chụp báo cáo từ request/response Newman thực tế, không phải giao diện Postman Desktop. Ảnh trình duyệt chụp ứng dụng thật bằng Playwright trên desktop và Pixel 5 giả lập.

## Chuẩn bị

Cần Node.js, PostgreSQL test riêng, dependency API và Newman. Thực hiện từ thư mục gốc repository:

```powershell
npm.cmd ci --prefix apps/api
npm.cmd install --prefix docs/postman/tv6-tools

# Tạo database này trước bằng PostgreSQL. Đổi host/user/password theo máy bạn.
$env:E2E_DATABASE_URL = 'postgresql://brewlite:brewlite123@127.0.0.1:5433/brewlite_tv6_postman_tests?schema=public'
$env:DATABASE_URL = $env:E2E_DATABASE_URL
cd apps/api
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd run build
cd ../..
```

Runner chỉ chấp nhận tên database có thành phần `test`, `tests` hoặc `e2e`. Dùng database riêng. Runner tạo ba tài khoản CUSTOMER/STAFF/khách khác, sản phẩm giá 35.000đ, nguyên liệu tồn 200 và công thức S/M/L tương ứng 10/15/20. Mỗi lượt dùng fixture mới; không cần sửa ID trong JSON.

## Chạy tự động bằng Newman

```powershell
node docs/postman/run-tv6.mjs
```

API riêng khởi động ở `http://127.0.0.1:3201`. Nếu cổng bận, đặt `$env:TV6_API_PORT = '3202'`. Runner từ chối tái sử dụng API đang chiếm cổng. Kết quả ghi trong `docs/postman/tv6-results/`: `newman.raw.json`, `execution.json`, `database-checks.json`, `cleanup.json` và log. Exit code khác 0 nếu assertion hoặc kiểm chứng database không đạt. Sau khi chạy, runner dọn fixture và đóng API.

## Chạy trong Postman Desktop để tự chụp màn hình

```powershell
node docs/postman/run-tv6.mjs --serve
```

1. Giữ terminal này chạy.
2. Trong Postman chọn **Import**, nhập `docs/postman/TV6.postman_collection.json` và file vừa sinh `docs/postman/TV6.local.postman_environment.json`.
3. Chọn environment **TV6 local isolated fixtures**.
4. Chọn collection → **Run** → đủ 4 folder → **1 iteration**, chạy đúng thứ tự, không chạy song song.
5. Lưu kết quả hoặc chụp Summary, Tests và Response. Bấm Ctrl+C ở terminal sau khi hoàn tất để đóng API và dọn fixture.

Mỗi lần chạy lại đầy đủ, khởi động lại `--serve` và import environment mới. Collection thay đổi tồn và trạng thái nên cần fixture mới. File environment chứa mật khẩu test tạm thời và được gitignore; không đưa environment, JWT, raw Newman report hay trace chứa phiên đăng nhập lên GitHub.

Collection để trống thông tin fixture để không dùng lại ID đã xóa hay xuất mật khẩu. `--serve` cấp fixture còn tồn tại cho Postman; chế độ tự động cấp tương tự cho Newman. Các response mẫu trong JSON chỉ là minh chứng đã chạy, đã che token/mật khẩu.

## Bộ test repository

```powershell
$env:DATABASE_URL = $env:E2E_DATABASE_URL
cd apps/api
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
npm.cmd run lint
npm.cmd run build
cd ../web
npm.cmd ci
npm.cmd test -- --maxWorkers=1 --minWorkers=1
npm.cmd run lint
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Lượt minh chứng build Next.js với `--webpack`, `NEXT_PUBLIC_USE_MOCK=false` và `NEXT_PUBLIC_API_URL=http://127.0.0.1:3101`. Browser chạy API/web riêng ở 3101/3100, bật chụp ảnh và trace trong harness ngoài mã ứng dụng. Chi tiết lệnh, từng case và thời gian nằm trong báo cáo.

Kiểm thử dùng NestJS, Next.js production build và PostgreSQL thật ở local. Thanh toán là mô phỏng AS2, Pixel 5 là Chromium giả lập. Một TODO khuyến mãi được ghi riêng, không tính là test đạt. Ma trận 49 cặp trạng thái, cạnh tranh transaction và kiểm chứng quyền hiện tại nằm trong bộ test repository bên cạnh collection. Số liệu thực tế và commit nguồn ghi trong `evidence/TV6-20261125/summary.json`.
