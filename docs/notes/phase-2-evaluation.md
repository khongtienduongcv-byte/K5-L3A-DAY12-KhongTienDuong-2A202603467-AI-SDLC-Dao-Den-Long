# Đánh giá & Nhật ký AI: Phase 2 (Ticket-02)

## 1. Đánh giá Kết quả Phase 2 (Evaluation)
- **Các yêu cầu đạt được:**
  - [x] Đã cập nhật 100% thông số chuẩn Test Contract v1.1 trong `game.contract.json` và core engine.
  - [x] Mở rộng đầy đủ 3 Đêm (Đảo Bến, Đảo Cau, Đảo Chuông) với hệ thống bục nhảy, cầu tre, và các tầng cao.
  - [x] Triển khai thành công các tính năng mới: Lướt (Dash), Nhảy & Trọng lực, Gió Lạc (Drifter), Bùa Gió (Wind Charm), và Rơi khỏi đảo.
  - [x] Đảm bảo tính chống hồi quy: Toàn bộ 6 nhóm test cũ của Phase 1 vẫn đạt 100% khi chạy với bộ thông số chuẩn v1.1.
  - [x] Hiệu năng xuất sắc: 21.600 ticks headless hoàn thành chỉ trong **0.35 giây** (ngưỡng cho phép là $\le 30$ giây).
- **Phân tích hồi quy (Regression Analysis):**
  - Việc nâng chi phí thắp đèn từ 3 lên 10 và chi phí pulse từ 1 lên 3 làm thay đổi một số kịch bản test cũ. Các test đã được cập nhật số liệu mới kèm lý do minh bạch, không làm hỏng logic gốc.

## 2. Phân tích Lỗi của AI & Cải tiến Harness
- **Lỗi phát hiện:**
  - Trong test rơi khỏi đảo, AI đặt tọa độ `(0, -10.5, 0)` tại Đêm 1 mà không nhận ra rằng tại tâm đảo $(0,0)$, mặt đất ở $Y = 0$, nên hệ thống nhận diện va chạm sàn và kéo Mây về $Y = 0$ thay vì rơi xuống biển mây.
- **Cách phát hiện:**
  - Chạy `npm test`, test báo lỗi `expected undefined to be defined` vì sự kiện `player_hit` by fall không phát sinh.
- **Cách khắc phục & Cải tiến Harness:**
  - AI đã phân tích lại map bounds: Đảo Bến chỉ có bán kính 40m, ngoài 40m mới là biển mây. Do đó kiểm tra rơi phải đặt tọa độ ngoài bán kính đảo (ví dụ $X = 50.0\text{m}$).
  - Ghi nhận quy tắc vào `AGENTS.md`: *"Khi test cơ chế rơi khỏi đảo, tọa độ XZ của nhân vật phải nằm ngoài bán kính đất liền của hòn đảo tương ứng"*.

## 3. Nhật ký Sử dụng Token & Chi phí
- **Chiến lược tiết kiệm token:**
  - Kế thừa trực tiếp cấu trúc headless engine của Phase 1 mà không viết lại từ đầu.
  - Tách map definitions thành `src/core/maps.js` để tránh phình to file `engine.js`.
- **Ước tính sử dụng Phase 2:**
  - Input tokens: ~24,000 tokens.
  - Output tokens: ~8,500 tokens.
  - Chi phí ước tính: ~$0.021 USD.
  - Tổng lũy kế Phase 1 + 2: ~$0.036 USD (rất tiết kiệm).
