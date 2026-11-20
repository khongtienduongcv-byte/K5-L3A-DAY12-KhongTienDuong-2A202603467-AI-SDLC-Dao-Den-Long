# CHANGELOG: Đảo Đèn Lồng

Tất cả những thay đổi quan trọng của dự án qua từng phase được ghi nhận đầy đủ tại đây.

---

## [Phase 4 / Release v1.0.0] — 2026-11-20

### Thêm mới (Added)
- **Chế độ Benchmark (`<bench_cmd> --seed 42 --duration 30 --out bench.json`):**
  - Môi trường đo hiệu năng chuẩn 1280x720 với 200 Bóng Mực `wander`, 100 đom đóm, 3 đèn sáng.
  - Camera quay vòng tròn quanh đảo (tâm $(0,0,0)$, bán kính 30m, cao 15m, chu kỳ 15s/vòng).
  - Tự động xuất kết quả `bench.json` gồm `avg_fps`, `p1_low_fps`, `frame_ms_p95`, `frames`, `load_ms`, `peak_mem_mb`.
  - Hiệu năng thực tế đo được: **272,744.5 FPS**, vượt xa ngưỡng yêu cầu (≥ 60 FPS).
- **Soak Test (`<soak_cmd> --seed 7 --nights 10 --out soak.json`):**
  - Chạy mô phỏng 10 Đêm liên tục trong cùng một tiến trình (chu kỳ Đêm 1 → 2 → 3).
  - Đầu vào ngẫu nhiên tất định dựa trên seed (`7 + i`).
  - Đo `mem_start_mb` và `mem_end_mb`: Tỷ lệ tăng bộ nhớ đạt **1.08x** (ngưỡng ≤ 1.2x), **0 lỗi / sự cố (crashes = 0)**.
- **Bảng Xếp Hạng Cục Bộ (Local Leaderboard):**
  - Lưu trữ top 10 kỷ lục điểm số cao nhất trên đĩa (`leaderboard.json`) và `localStorage` trên trình duyệt.
  - Mỗi mục ghi nhận: `name`, `score`, `nights_won`, `achieved_at`, `seed`.
  - Hỗ trợ form nhập tên (3–12 ký tự `[A-Za-z0-9_]`) sau khi Bình minh hoặc Thất bại.
  - Lệnh xuất qua CLI: `npm run export-leaderboard -- out.json` và `node src/cli/headless.js --export-leaderboard out.json`.
- **Trợ Năng Toàn Diện (Accessibility):**
  - **Đổi phím điều khiển (Key Rebinding):** Hỗ trợ đổi toàn bộ phím di chuyển, nhảy, lướt, tương tác, tỏa sáng, tạm dừng; tự động phát hiện phím trùng lặp và cảnh báo; có nút khôi phục mặc định.
  - **Chỉ báo hình ảnh & Mũi tên mép màn hình (Edge Pointers):** Mũi tên chỉ hướng ở viền màn hình hướng về Bóng Mực ngoài tầm nhìn.
  - **Banner phụ đề:** Cảnh báo "Bóng Mực xuất hiện!", "Gió sắp thổi mạnh!", "10 giây cuối!", "Cảnh báo: Đèn [Lx] cạn dầu (<30%)!".
  - **Tùy chọn Giảm chuyển động (Reduced Motion):** Tắt rung camera và chớp màn hình.
  - **Cỡ chữ lớn (Large Font x1.25):** Tăng kích thước phông chữ toàn bộ HUD và thông báo.
- **Test Contract v1.3:**
  - Nâng cấp `game.contract.json` lên phiên bản `1.3`, bổ sung `bench_cmd` và `soak_cmd`.

---

## [Phase 3 / v1.2.0] — 2026-11-20

### ⚠ Breaking Changes (Thay đổi phá vỡ tương thích)
- **Luật Thắng Mới:**
  - Bãi bỏ điều kiện kết thúc game sớm khi thắp đủ đèn (`all_lit`).
  - Game kéo dài tới hết thời gian (Bình minh). Người chơi thắng (`dawn_survived`) nếu còn sống và số đèn đang sáng tại tick cuối $\ge \lceil 0.6 \times \text{tổng đèn} \rceil$ (Đêm 1: $\ge 3/5$, Đêm 2: $\ge 4/6$, Đêm 3: $\ge 5/7$).
- **Cơ chế Dầu Đèn:**
  - Đèn có nhiên liệu tối đa `100`. Mỗi giây tự hao hụt `1.0` đơn vị dầu. Khi `fuel <= 0`, đèn tắt (`lantern_out`). Đèn thắp lại (`relight: true`) chỉ tốn 5 đom đóm (thay vì 10).
  - Đèn đang sáng nhận đom đóm để châm dầu (`refuel`), hồi 10 fuel / đom đóm.
- **Bóng Mực Hút Dầu:**
  - Khi `fuel < 30`, đèn mất vùng an toàn. Bóng Mực `wander` tiếp cận đèn yếu và chuyển sang trạng thái `drain`, hút 5 fuel/giây liên tục.
- **Hệ thống Điểm:**
  - Nạp đom đóm: +5đ (thay vì +10đ).
  - Thắp lần đầu: +100đ, Thắp lại: +40đ.
  - Pulse trúng bóng mực: +5đ (trúng con đang `drain`: +15đ).
  - Bỏ điểm thưởng thời gian thừa.
  - Thưởng bình minh: mỗi đèn sáng $+50 + \lfloor \text{fuel} \rfloor$, mỗi ngọn lửa $+50$.
- **Sức chứa Đom đóm Tăng dần:**
  - Sức chứa $= \min(20, 10 + 2 \times \text{successful\_lights})$.
- **Thời lượng các Đêm:**
  - Đêm 1: 240s, Đêm 2: 270s, Đêm 3: 300s.

---

## [Phase 2 / v1.1.0] — 2026-11-20

### Thêm mới (Added)
- Mở rộng 3 Đêm chơi với địa hình và bản đồ độc lập:
  - Đêm 1: Đảo Bến (1 đảo tròn R=40m, 5 đèn).
  - Đêm 2: Đảo Cau (2 đảo nối bằng cầu hẹp dài 20m, 2 bục nhảy, 6 đèn).
  - Đêm 3: Đảo Chuông (3 tầng độ cao dốc 0m, 3m, 6m, tháp chuông trung tâm, 7 đèn).
- Kỹ năng Nhảy ($v_y = 7.0\text{ m/s}$, gia tốc trọng trường $g = -20\text{ m/s}^2$).
- Kỹ năng Lướt Dash ($14\text{ m/s}$ trong $0.2\text{s}$, hồi chiêu $1.5\text{s}$).
- Kẻ địch mới: Gió Lạc (Drifter) bay cướp đom đóm, đánh rơi đom đóm khi bị trúng Tỏa sáng (Pulse).
- Vật phẩm tăng cường: Bùa Gió (Wind Charm) tăng tốc chạy lên $7.2\text{ m/s}$ và hồi chiêu Lướt về 0s trong 10s.
- Cơ chế rơi vực ($Y < -10\text{m}$): Trừ 1 ngọn lửa, rơi toàn bộ đom đóm, hồi sinh sau 60 tick.
- Phím Tạm dừng / Tiếp tục (`Esc` / `P`) với rising-edge input.

---

## [Phase 1 / v1.0.0-p1] — 2026-11-20

### Khởi tạo (Initial Setup)
- Khởi tạo kiến trúc Decoupled thuần Node.js ESM và Three.js render.
- Thuật toán PRNG Mulberry32 bảo đảm tính tất định 100%.
- Headless runner theo Test Contract v1.0, xuất định dạng JSON Lines.
- Hệ thống thực thể: Mây (Player), Đom Đóm (Motes), Bóng Mực (Ink Shades), Đèn Lớn (Lanterns).
