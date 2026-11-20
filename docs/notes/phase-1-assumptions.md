# Ghi chép Giả định & Đặc tả Thiết kế: Phase 1 (PRD-0)

## 1. Bản đồ & Bố trí Đảo Bến (Đêm 1)
- **Hình dáng đảo:** Đảo tròn bán kính 35m. Mặt phẳng đảo ở cao độ $Y = 0$.
- **Vị trí xuất phát của Mây:** $(0, 0, 0)$.
- **5 Cột Đèn Lồng Lớn ($L_1 \dots L_5$):** Bố trí tròn đều cách tâm đảo $R = 25\text{m}$, góc quay mỗi đèn cách nhau $72^\circ$:
  - $L_1$: $(0.000, 0.000, 25.000)$
  - $L_2$: $(23.776, 0.000, 7.725)$
  - $L_3$: $(14.695, 0.000, -20.225)$
  - $L_4$: $(-14.695, 0.000, -20.225)$
  - $L_5$: $(-23.776, 0.000, 7.725)$
  *(Nếu scenario cung cấp vị trí riêng, hệ thống sẽ ưu tiên nạp theo scenario).*

## 2. Cơ chế Đom Đóm (Motes)
- Mặc định khởi tạo 20 đom đóm rải rác trên đảo (sử dụng PRNG seeded).
- Mỗi đom đóm nhặt được cho Mây $+1$ `carried` (tối đa `carry_capacity = 5`) và $+10$ điểm (`score.per_mote`).
- Đom đóm đã nhặt biến mất khỏi mặt đất.

## 3. Cơ chế Nạp ánh sáng vào Đèn
- Khi Mây đứng trong bán kính $2.5\text{m}$ (`interact_radius`) của đèn chưa thắp và nhấn `interact` (phím `E` trên giao diện hoặc `interact: true` trong input frame):
  - Toàn bộ số đom đóm Mây đang giữ được nạp vào đèn cho đến khi đạt `lantern_cost = 3`.
  - Phát sinh sự kiện `deposit`.
  - Khi đèn đạt đủ 3 đom đóm, chuyển trạng thái `lit = true`, phát sinh sự kiện `lantern_lit` và cộng 100 điểm.
  - Vùng an toàn `safe_radius = 5.0m` quanh đèn được kích hoạt.
  - Khi cả 5 đèn đều sáng $\rightarrow$ Thắng game (`game_over` với `result: "won"`, `reason: "all_lit"`).

## 4. Hành vi Bóng Mực (Shades)
- Mặc định 3 Bóng Mực xuất hiện ở rìa đảo (cách tâm $\ge 22\text{m}$).
- Di chuyển với tốc độ $3.5\text{m/s}$ hướng về Mây (`state = "chase"`).
- Nếu Mây bước vào vùng an toàn của đèn đã thắp, Bóng Mực dừng lại ở biên vùng an toàn và lùi ra ngoài.
- Nếu Bóng Mực tiếp xúc Mây (khoảng cách $\le 1.0\text{m}$):
  - Mây mất 1 ngọn lửa (`flames` giảm 1).
  - Mây rơi 50% số đom đóm đang giữ (`hit_drop_ratio = 0.5`).
  - Mây được kích hoạt trạng thái bất tử tạm thời trong $1.5\text{s}$ (`invuln_s`).
  - Phát sinh sự kiện `player_hit`.
  - Nếu `flames == 0` $\rightarrow$ Thua game (`game_over` với `result: "lost"`, `reason: "no_flames"`).

## 5. Cơ chế Tỏa Sáng (Pulse)
- Kích hoạt khi nhấn `pulse` (phím `Space`/`Q` hoặc `pulse: true` trong input):
  - Điều kiện: Đã hồi chiêu ($2.0\text{s}$) và Mây có ít nhất 1 đom đóm (`pulse_cost = 1`).
  - Hiệu ứng: Toàn bộ Bóng Mực trong bán kính $6.0\text{m}$ bị đẩy lùi $4.0\text{m}$ và bị choáng trong $3.0\text{s}$ (`state = "stunned"`).
  - Phát sinh sự kiện `pulse` kèm danh sách `stunned_ids` và cộng 25 điểm cho mỗi Bóng Mực bị choáng.

## 6. Tính Tất Định (Determinism)
- Mọi giá trị ngẫu nhiên (vị trí sinh, hướng ban đầu) đều được điều khiển bởi thuật toán Mulberry32 với hạt giống `--seed`.
- Không sử dụng `Math.random()` hay bất kỳ nguồn bất định thời gian thực nào trong core engine.
