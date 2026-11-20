# Đảo Đèn Lồng — Day 12 AI SDLC (Phase 2: Ba hòn đảo)

> **Video Demo:** [Xem Demo Game](docs/demo/demo.mp4)  
> **Mã nộp bài:** `K5-DAY12-KhongTienDuong-AI-SDLC-Dao-Den-Long`  
> **Thành viên:** Khổng Tiến Dương  
> **Hợp đồng kiểm thử:** Test Contract v1.1  

---

## 1. Giới thiệu Dự án
**Đảo Đèn Lồng** là game 3D góc nhìn thứ ba phát triển theo quy trình AI SDLC. Người chơi hóa thân thành **Mây**, người giữ đèn nhỏ tuổi đội nón lá tre mang theo chiếc đèn ấm áp, thu thập những đốm sáng đom đóm rải rác trên 3 hòn đảo (Đảo Bến, Đảo Cau, Đảo Chuông) để thắp sáng lại các Cột Đèn Lồng Lớn, né tránh Bóng Mực và Gió Lạc trong màn sương đêm.

---

## 2. Cài đặt & Khởi chạy (Tối đa 2 lệnh)

### Chạy giao diện 3D trên Web (Hỗ trợ chọn 3 Đêm):
```bash
npm install
npm run dev
```
*(Mở trình duyệt tại đường dẫn hiển thị, ví dụ: `http://localhost:5173`)*

### Chạy chế độ Headless (Test Contract v1.1):
```bash
# Đêm 1 (Đảo Bến)
node src/cli/headless.js --seed 42 --night 1 --ticks 300 --out docs/proof/phase-2/scenario_night1.jsonl

# Đêm 2 (Đảo Cau)
node src/cli/headless.js --seed 42 --night 2 --ticks 300 --out docs/proof/phase-2/scenario_night2.jsonl

# Đêm 3 (Đảo Chuông)
node src/cli/headless.js --seed 42 --night 3 --ticks 300 --out docs/proof/phase-2/scenario_night3.jsonl
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
| `E` | Nạp đom đóm vào Đèn Lồng Lớn khi đứng gần ($< 2.0\text{ m}$) |
| `Q` | Tỏa sáng (Pulse) — đẩy lùi và làm choáng Bóng Mực (cần 3 đom đóm) |
| `Esc` hoặc `P` | Tạm dừng (Pause / Resume) |
| `R` | Chơi lại khi Thắng hoặc Thua |

---

## 4. Cơ chế Tính điểm (Scoring Chuẩn hóa v1.1)

- **Nạp đom đóm vào đèn:** `+10` điểm / đom đóm.
- **Thắp sáng 1 Đèn Lồng Lớn:** `+100` điểm / đèn (cần 10 đom đóm).
- **Làm choáng Bóng Mực bằng Tỏa sáng:** `+5` điểm / con.
- **Phần thưởng khi Thắng Đêm:**
  - `+2` điểm cho mỗi giây còn lại trước bình minh (`floor(time_left_s) * 2`).
  - `+50` điểm cho mỗi ngọn lửa sinh mệnh còn giữ được (`flames * 50`).

---

## 5. Bằng chứng & Kiến trúc Hệ thống

- **Kiến trúc tách biệt (Decoupled Architecture):**
  - `src/core/`: Logic game mô phỏng 60Hz thuần túy theo 12 bước nghiêm ngặt, tính toán tất định theo `--seed` bằng PRNG Mulberry32.
  - `src/render/`: Three.js hiển thị 3D trên nền Web theo đúng bảng màu chuẩn Ticket-02.
  - `src/cli/`: Headless runner xử lý theo Test Contract v1.1 (hỗ trợ cả 3 Đêm, dash, drifter, charm, pause, fall).
- **Bằng chứng kiểm chứng Phase 2:**
  - Ma trận truy vết: [verification_matrix.md](docs/proof/phase-2/verification_matrix.md)
  - Đặc tả yêu cầu & AC: [phase-2-spec.md](docs/notes/phase-2-spec.md)
  - Log kịch bản headless 3 Đêm: [scenario_night1.jsonl](docs/proof/phase-2/scenario_night1.jsonl), [scenario_night2.jsonl](docs/proof/phase-2/scenario_night2.jsonl), [scenario_night3.jsonl](docs/proof/phase-2/scenario_night3.jsonl)
  - Báo cáo kiểm thử tự động: [test_report.txt](docs/proof/phase-2/test_report.txt)
  - Đánh giá & nhật ký AI: [phase-2-evaluation.md](docs/notes/phase-2-evaluation.md)

---

## 6. Sáng tạo của tôi (My Creative Touch)

1. **Tạo hình Nhân vật Mây mang Nón Lá Việt Nam:** Thiết kế low-poly cách điệu với nón lá chóp tre vàng và chiếc đèn lồng nhỏ cầm tay phát ra ánh sáng vàng ấm áp.
2. **Cầu tre nối hai đảo Đêm 2 & Bục nhảy ánh sáng:** Cầu tre mộc mạc không lan can và các bục nhảy phát sáng xanh lơ phóng người chơi qua lại giữa hai đảo.
3. **Tháp Chuông Đảo Chuông Đêm 3:** Tháp đá cổ kính giữa đảo tròn 3 tầng cao thấp, mang đến chiều sâu không gian vượt trội.
4. **Hiệu ứng Vùng An Toàn & Sóng Tỏa Sáng:** Vòng tròn ánh sáng bảo vệ quanh đèn lồng và sóng xung kích đẩy lùi kẻ địch trực quan.
5. **Không phụ thuộc asset bên ngoài:** 100% hình khối Three.js nguyên bản, chạy tức thì, đạt trên 60 FPS mượt mà.
