# Đánh giá & Nhật ký AI: Phase 3 (Ticket-03)

## 1. Đánh giá Kết quả Phase 3 (Evaluation)
- **Các yêu cầu đạt được:**
  - [x] Đã cập nhật toàn diện mô hình nhiên liệu đèn theo Test Contract v1.2: hao hụt 1.0/s, tắt đèn khi hết dầu, châm dầu (`refuel`), thắp lại tốn 5 đom đóm (`relight: true`).
  - [x] Triển khai thành công hành vi Bóng Mực hút dầu (`drain` state) khi đèn có `fuel < 30`, phát event `fuel_drain` mỗi 60 ticks và thưởng +15 điểm khi pulse trúng.
  - [x] Tái cấu trúc luật thắng: Không kết thúc sớm khi thắp hết đèn, chuyển sang sống sót tới bình minh (`dawn_survived`) với $\ge 60\%$ đèn còn sáng.
  - [x] Cơ chế tăng dần sức chứa đom đóm ($10 + 2 \times \text{lights}$, tối đa 20).
  - [x] Toàn bộ 14 bài kiểm thử tự động đạt 100%.

## 2. Xử lý Thay đổi Yêu cầu & Cập nhật Test cũ (Breaking Changes Handling)
- **Sửa đổi test cũ có lý do rõ ràng:**
  - *Test thắng cuộc cũ:* Ở Phase 1 & 2, test kiểm tra thắng ngay khi 5 đèn sáng (`all_lit`). Do Ticket-03 bỏ luật này, test được cập nhật thành: mô phỏng thời gian đếm ngược về 0 (bình minh) với $\ge 3$ đèn sáng để kích hoạt `dawn_survived`.
  - *Test điểm nhặt đom đóm:* Cập nhật từ $+10$ thành $+5$ điểm theo bảng điểm chuẩn hóa của Ticket-03.
  - *Tài liệu hóa đầy đủ:* Viết riêng [CHANGELOG.md](../../CHANGELOG.md) liệt kê các breaking changes và [phase-3-adr.md](phase-3-adr.md) ghi nhận quyết định kiến trúc.

## 3. Phân tích Lỗi của AI & Cải tiến Harness
- **Lỗi phát hiện:** 
  - Trong sự kiện `game_over`, AI ban đầu vẫn giữ `all_lit` khiến kịch bản kết thúc trước khi bình minh.
- **Cách phát hiện:**
  - Đọc lại ticket Phần 3: *"Thắp đủ đèn không kết thúc Đêm"*.
- **Cải tiến Harness:**
  - Ghi rõ vào `AGENTS.md`: *"Tuyệt đối không kết thúc Đêm khi thắp đủ đèn; chỉ kết thúc khi hết giờ (xét số đèn $\ge 60\%$) hoặc khi hết Ngọn Lửa"*.

## 4. Nhật ký Sử dụng Token & Chi phí
- **Ước tính sử dụng Phase 3:**
  - Input tokens: ~20,000 tokens.
  - Output tokens: ~7,000 tokens.
  - Chi phí ước tính: ~$0.018 USD.
  - Tổng lũy kế Phase 1 + 2 + 3: ~$0.054 USD.
