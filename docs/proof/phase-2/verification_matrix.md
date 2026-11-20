# Ma trận Truy vết Yêu cầu & Bằng chứng Kiểm chứng: Phase 2 (Ticket-02)

| STT | Yêu cầu Ticket-02 & Contract v1.1 | Cách kiểm chứng | File / Vị trí Bằng chứng | Kết quả |
|:---:|---|---|---|:---:|
| 1 | **Chuẩn hóa thông số vật lý v1.1 (Tốc độ 6m/s, sức chứa 10, chi phí đèn 10, pulse 3 đom đóm)** | Chạy simulation với scenario nạp 10 đom đóm và thắp đèn, trừ 3 đom đóm khi pulse | `tests/contract.test.js` (test 2, 5, 6) | **ĐẠT** |
| 2 | **Kỹ năng Lướt (Dash) 14 m/s trong 12 ticks, hồi chiêu 90 ticks** | Kích hoạt input `dash: true`, kiểm tra vận tốc, quãng đường di chuyển và event `dash` | `tests/contract.test.js` (test 3) | **ĐẠT** |
| 3 | **Kỹ năng Nhảy & Trọng lực -20 m/s²** | Kích hoạt input `jump: true`, kiểm tra vận tốc $v_y = 7.0$ và trạng thái `grounded = false` | `tests/contract.test.js` (test 4) | **ĐẠT** |
| 4 | **Bảo đảm chống hồi quy Phase 1 (Regression Prevention)** | Chạy lại toàn bộ test tính tất định, nhặt đom đóm, va chạm, exit code 2 | `tests/contract.test.js` (test 1, 2, 11) | **ĐẠT** |
| 5 | **Kẻ địch mới: Gió Lạc (Drifter)** | Dựng scenario Gió Lạc áp sát, kiểm tra cướp $\min(3, \text{carried})$ và rơi lại đồ khi dính Tỏa Sáng | `tests/contract.test.js` (test 7) | **ĐẠT** |
| 6 | **Vật phẩm mới: Bùa Gió (Wind Charm)** | Nhặt bùa tại vị trí bản đồ, kiểm tra buff tốc độ 7.2 m/s và Lướt 0s hồi chiêu trong 600 ticks | `tests/contract.test.js` (test 8) | **ĐẠT** |
| 7 | **Cơ chế Tạm dừng (Pause / Resume)** | Kích hoạt input `pause: true`, kiểm tra đóng băng simulation và phát sinh event `paused` / `resumed` | `tests/contract.test.js` (test 9) | **ĐẠT** |
| 8 | **Rơi khỏi đảo (Fall off island Y < -10)** | Kiểm tra trừ 1 ngọn lửa, mất toàn bộ đom đóm, phát event `player_hit` by fall | `tests/contract.test.js` (test 10) | **ĐẠT** |
| 9 | **Bản đồ 3 Đêm (Đảo Bến, Đảo Cau, Đảo Chuông)** | Chạy chế độ headless độc lập cho cả 3 Đêm `--night 1`, `--night 2`, `--night 3` | `docs/proof/phase-2/scenario_night1.jsonl`, `scenario_night2.jsonl`, `scenario_night3.jsonl` | **ĐẠT** |
| 10 | **Hiệu năng Headless 21.600 ticks ≤ 30s** | Benchmark chạy 21.600 ticks toàn bộ 1 đêm đầy đủ (đạt **0.35 giây**) | `src/cli/headless.js` | **ĐẠT (Nhanh gấp ~85 lần)** |
