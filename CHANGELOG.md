# CHANGELOG: Phase 3 (Ticket-03 — Đèn Cạn Dầu)

## [Phase 3 / v1.2.0] — 2026-11-20

### ⚠ Breaking Changes (Thay đổi phá vỡ tương thích)
1. **Luật Thắng Mới:**
   - **BỎ:** Không còn kết thúc game sớm khi thắp đủ đèn (`all_lit`).
   - **MỚI:** Game kéo dài tới hết thời gian (Bình minh). Người chơi thắng (`dawn_survived`) nếu còn sống và số đèn đang sáng tại tick cuối $\ge \lceil 0.6 \times \text{tổng đèn} \rceil$ (Đêm 1: $\ge 3/5$, Đêm 2: $\ge 4/6$, Đêm 3: $\ge 5/7$).
2. **Cơ chế Dầu Đèn:**
   - **BỎ:** Đèn đã sáng không còn vĩnh cửu.
   - **MỚI:** Đèn có nhiên liệu tối đa `100`. Mỗi giây tự hao hụt `1.0` đơn vị dầu. Khi `fuel <= 0`, đèn tắt (`lantern_out`). Đèn thắp lại (`relight: true`) chỉ tốn 5 đom đóm (thay vì 10).
   - Đèn đang sáng nhận đom đóm để châm dầu (`refuel`), hồi 10 fuel / đom đóm.
3. **Bóng Mực Hút Dầu:**
   - **BỎ:** Đèn sáng không còn bảo vệ an toàn vĩnh viễn.
   - **MỚI:** Khi `fuel < 30`, đèn mất vùng an toàn. Bóng Mực `wander` sẽ tiếp cận đèn yếu và chuyển sang trạng thái `drain`, hút 5 fuel/giây liên tục.
4. **Hệ thống Điểm:**
   - Nạp đom đóm: +5đ (thay vì +10đ).
   - Thắp lần đầu: +100đ, Thắp lại: +40đ.
   - Pulse trúng bóng mực: +5đ (trúng con đang `drain`: +15đ).
   - Bỏ điểm thưởng thời gian thừa.
   - Thưởng bình minh: mỗi đèn sáng $+50 + \lfloor \text{fuel} \rfloor$, mỗi ngọn lửa $+50$.
5. **Sức chứa Đom đóm Tăng dần:**
   - Sức chứa $= \min(20, 10 + 2 \times \text{successful\_lights})$.
6. **Thời lượng các Đêm:**
   - Đêm 1: 240s, Đêm 2: 270s, Đêm 3: 300s.
