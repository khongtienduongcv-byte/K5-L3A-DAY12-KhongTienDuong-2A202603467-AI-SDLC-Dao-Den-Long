# Tài liệu Đặc tả Yêu cầu & Tiêu chí Nghiệm thu: Phase 2 (Ticket-02)

## 1. Chuẩn hóa Thông số Vật lý (Test Contract v1.1)
- **AC-01:** Tốc độ chạy chuẩn $6.0\text{ m/s}$. Nhảy với vận tốc $7.0\text{ m/s}$, gia tốc trọng trường $-20\text{ m/s}^2$. Chỉ nhảy khi đang chạm đất (`grounded = true`).
- **AC-02:** Kỹ năng Lướt (Dash) đạt vận tốc $14.0\text{ m/s}$ trong $0.2\text{ s}$ ($12\text{ ticks}$). Hồi chiêu $1.5\text{ s}$ ($90\text{ ticks}$). Giữ nguyên cao độ khi lướt trên không. Không có trạng thái bất tử khi lướt.
- **AC-03:** Sức chứa túi đom đóm nâng lên 10 con. Bán kính nhặt $1.0\text{ m}$, chênh cao $\le 1.5\text{ m}$.
- **AC-04:** Chi phí thắp mỗi đèn là 10 đom đóm. Bán kính tương tác $2.0\text{ m}$. Vùng an toàn quanh đèn đã thắp mở rộng lên bán kính $6.0\text{ m}$.
- **AC-05:** Tỏa Sáng (Pulse) tiêu hao 3 đom đóm, bán kính $5.0\text{ m}$, hồi chiêu $3.0\text{ s}$ ($180\text{ ticks}$). Làm choáng Bóng Mực $120\text{ ticks}$, đẩy lùi $4.0\text{ m}$ trong $15\text{ ticks}$ đầu.

## 2. Kẻ địch & Vật phẩm mới
- **AC-06 (Gió Lạc - Drifter):** Xuất hiện ở Đêm 2 và Đêm 3 với tối đa 2 con. Di chuyển $7.0\text{ m/s}$. Đuổi theo Mây khi Mây có $\ge 5$ đom đóm trong phạm vi $15\text{ m}$. Chạm Mây (khoảng cách $\le 1.2\text{ m}$) cướp $\min(3, \text{carried})$ đom đóm và bay xa trốn thoát trong $240\text{ ticks}$. Nếu bị dính Tỏa Sáng khi đang cướp đom đóm, lập tức thả rơi toàn bộ đom đóm tại chỗ.
- **AC-07 (Bùa Gió - Wind Charm):** Nhặt tại vị trí cố định trên bản đồ. Cung cấp hiệu ứng kéo dài $600\text{ ticks}$ ($10\text{ s}$): tốc độ chạy tăng lên $7.2\text{ m/s}$ và kỹ năng Lướt không có thời gian hồi chiêu. Hồi sinh lại sau $2700\text{ ticks}$.
- **AC-08 (Rơi khỏi đảo):** Khi cao độ $Y < -10.0\text{ m}$, Mây bị trừ 1 Ngọn Lửa và mất toàn bộ số đom đóm đang mang. Chờ $60\text{ ticks}$ rồi hồi sinh tại vị trí xuất phát với trạng thái bất tử $90\text{ ticks}$.

## 3. Bản đồ 3 Đêm & Tính năng Bổ trợ
- **AC-09 (Hệ thống 3 Đêm):**
  - Đêm 1: Đảo Bến (5 đèn lồng, bán kính 40m, thời lượng 300s).
  - Đêm 2: Đảo Cau (2 đảo nối cầu tre, 2 bục nhảy, 6 đèn lồng, thời lượng 330s).
  - Đêm 3: Đảo Chuông (3 tầng cao $Y=0, 3, 6$, tháp chuông trung tâm, 7 đèn lồng, gió thổi định kỳ 30s một lần, thời lượng 360s).
- **AC-10 (Bục nhảy - Jump Pads):** Khi Mây chạm bục nhảy trên Đêm 2 & 3, lập tức được phóng với vận tốc $v_y = 14\text{ m/s}$ và vận tốc ngang $24\text{ m/s}$ hướng về đảo đích cho đến khi chạm đất.
- **AC-11 (Tạm dừng - Pause):** Phím `Esc`/`P` đóng băng toàn bộ tiến trình mô phỏng game, phát event `paused` và chuyển trạng thái sang `paused`. Bấm lần nữa phát event `resumed` và tiếp tục game.
