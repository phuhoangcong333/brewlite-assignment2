$content = @"
# Quy ước làm việc nhóm BrewLite

## Nhánh
- main: bản nộp, chỉ gộp từ dev khi đã chạy ổn.
- dev: nhánh chung.
- Mỗi người làm trên nhánh riêng: feat/tvN-<việc>, ví dụ feat/tv1-docs-skeleton.
- Không push thẳng vào main hoặc dev.

## Commit
Dạng: <loại>: <mô tả ngắn> (Task x.y)
Loại: feat, fix, docs, test, ci, chore.
Ví dụ: docs: add FR and NFR for menu flow (Task 1.2)

## Pull Request
- Tiêu đề: "Task 1.2: SRS luồng Xem menu".
- Mô tả: làm gì, vì sao thay đổi.
- Cần ít nhất 1 người Approve; CI xanh mới được gộp.
- Mọi thay đổi yêu cầu, sơ đồ, kiến trúc đều qua PR và ghi lý do.
- Mở PR theo thứ tự Task 1 đến Task 5.

## Definition of Done
- Code chạy, không lỗi build; lint và test xanh.
- Có commit rõ ràng và được review.
- API có validate; giao diện có loading, empty, error.
- Tài liệu và sơ đồ liên quan đã cập nhật (có cả file nguồn .puml và ảnh .svg).
- README có hướng dẫn nếu thay đổi cách chạy.
"@
Set-Content CONTRIBUTING.md $content -Encoding UTF8