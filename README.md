# Đảo Đèn Lồng — Day 12 AI SDLC (Phase 3: Đèn cạn dầu)

> **Video Demo:** [Xem Demo Game](docs/demo/demo.mp4)  
> **Mã nộp bài:** `K5-DAY12-KhongTienDuong-AI-SDLC-Dao-Den-Long`  
> **Thành viên:** Khổng Tiến Dương  
> **Hợp đồng kiểm thử:** Test Contract v1.2  
> **Nhật ký thay đổi cốt lõi:** [CHANGELOG.md](CHANGELOG.md) | **Quyết định kiến trúc:** [phase-3-adr.md](docs/notes/phase-3-adr.md)  

---

## 1. Giới thiệu Dự án
**Đảo Đèn Lồng** là game 3D góc nhìn thứ ba phát triển theo quy trình AI SDLC. Người chơi hóa thân thành **Mây**, người giữ đèn nhỏ tuổi đội nón lá tre mang theo chiếc đèn ấm áp, thu thập những đom đóm rải rác trên 3 hòn đảo (Đảo Bến, Đảo Cau, Đảo Chuông) để giữ sáng các Cột Đèn Lồng Lớn cho tới khi Bình Minh đến.

Ở Phase 3, cơ chế cốt lõi được tái cấu trúc: **Đèn lồng không còn vĩnh cửu** mà liên tục cạn dầu, bị Bóng Mực hút trộm dầu khi yếu lửa, đòi hỏi người chơi liên tục châm dầu và bảo vệ các ngọn đèn để sống sót tới bình minh!

---

## 2. Cài đặt & Khởi chạy (Tối đa 2 lệnh)

### Chạy giao diện 3D trên Web (Hỗ trợ 3 Đêm & Thanh dầu trực quan):
```bash
npm install
npm run dev
```
*(Mở trình duyệt tại đường dẫn hiển thị, ví dụ: `http://localhost:5173`)*

### Chạy chế độ Headless (Test Contract v1.2):
```bash
node src/cli/headless.js --seed 42 --night 1 --ticks 300 --out docs/proof/phase-3/scenario_night1.jsonl
```

### Chạy kiểm thử tự động:
```bash
npm test
```

---

## 3. Điều khiển Game (Controls)

| Phím | Hành động |
|---|---|
| `W`, `A`, `S`, `D` / Mũi tên | Di chuyển Mây quanh đảo |
| `Space` | Nhảy (vận tốc $7.0\text{ m/s}$, chỉ nhảy khi chạm đất) |
| `Shift` hoặc `J` | Lướt (Dash) $14\text{ m/s}$ trong $0.2\text{ s}$ (hồi chiêu $1.5\text{ s}$) |
| `E` | Nạp đom đóm / Thắp lại (5 đom đóm) / Châm dầu đèn ($< 2.0\text{ m}$) |
| `Q` | Tỏa sáng (Pulse) — làm choáng bóng mực ($< 5.0\text{ m}$, cần 3 đom đóm) |
| `Esc` hoặc `P` | Tạm dừng (Pause / Resume) |
| `R` | Chơi lại khi Thắng hoặc Thua |

---

## 4. Cơ chế Cốt lõi & Luật Chơi Mới (Phase 3)

1. **Vòng đời Dầu Đèn:**
   - Đèn có tối đa 100 nhiên liệu, tiêu hao $1.0\text{ fuel/giây}$.
   - Khi `fuel <= 0`, đèn tắt (`lantern_out`). Đèn thắp lại chỉ tốn 5 đom đóm.
   - Đến gần đèn sáng bấm `E` để châm dầu (mỗi đom đóm $+10\text{ fuel}$).
2. **Bóng Mực Hút Dầu:**
   - Khi `fuel < 30`, đèn mất vùng an toàn. Bóng Mực `wander` sẽ tiếp cận và chuyển sang `drain`, hút $5\text{ fuel/giây}$.
   - Tỏa Sáng trúng Bóng Mực đang hút dầu được thưởng **+15 điểm** (thay vì +5 điểm thông thường).
3. **Luật Thắng Mới (Bình Minh):**
   - Không còn thắng sớm khi thắp hết đèn!
   - Thắng khi sống sót tới bình minh (`time_left_s <= 0`) với **số đèn đang sáng $\ge 60\%$** (Đêm 1: $\ge 3/5$, Đêm 2: $\ge 4/6$, Đêm 3: $\ge 5/7$). Lý do thắng: `dawn_survived`.
4. **Sức chứa Đom Đóm Tăng Dần:**
   - Bắt đầu ở mức 10, mỗi lần thắp sáng thành công một ngọn đèn được tăng thêm 2 sức chứa (tối đa 20 đom đóm).

---

## 5. Bằng chứng Kiểm chứng & Tài liệu

- **Kiến trúc & Quyết định thiết kế:**
  - Quyết định kiến trúc: [phase-3-adr.md](docs/notes/phase-3-adr.md)
  - Nhật ký thay đổi phá vỡ tương thích: [CHANGELOG.md](CHANGELOG.md)
  - Ma trận truy vết bằng chứng Phase 3: [verification_matrix.md](docs/proof/phase-3/verification_matrix.md)
  - Đánh giá & nhật ký token: [phase-3-evaluation.md](docs/notes/phase-3-evaluation.md)
  - Báo cáo kiểm thử tự động (14 tests passed): [test_report.txt](docs/proof/phase-3/test_report.txt)
  - Log kịch bản mẫu: [scenario_dawn_survived.jsonl](docs/proof/phase-3/scenario_dawn_survived.jsonl), [scenario_fuel_decay.jsonl](docs/proof/phase-3/scenario_fuel_decay.jsonl), [scenario_drain.jsonl](docs/proof/phase-3/scenario_drain.jsonl)
