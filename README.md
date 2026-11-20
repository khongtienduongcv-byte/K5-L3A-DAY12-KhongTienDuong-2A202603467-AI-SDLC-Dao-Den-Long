# Đảo Đèn Lồng — Day 12 AI SDLC (Phase 1)

> **Video Demo:** [Xem Demo Game](docs/demo/demo.mp4)  
> **Mã nộp bài:** `K5-DAY12-KhongTienDuong-AI-SDLC-Dao-Den-Long`  
> **Thành viên:** Khổng Tiến Dương  

---

## 1. Giới thiệu Dự án
**Đảo Đèn Lồng** là game 3D góc nhìn thứ ba phát triển theo quy trình AI SDLC. Người chơi hóa thân thành **Mây**, người giữ đèn nhỏ tuổi đội nón lá tre mang theo chiếc đèn ấm áp, thu thập những đốm sáng đom đóm rải rác trên Đảo Bến để thắp sáng lại 5 Cột Đèn Lồng Lớn và né tránh các Bóng Mực trong màn sương đêm.

---

## 2. Cài đặt & Khởi chạy (Tối đa 2 lệnh)

### Chạy giao diện 3D trên Web:
```bash
npm install
npm run dev
```
*(Mở trình duyệt tại đường dẫn hiển thị, ví dụ: `http://localhost:5173`)*

### Chạy chế độ Headless (Test Contract v1.0):
```bash
node src/cli/headless.js --seed 42 --night 1 --ticks 300 --out docs/proof/phase-1/scenario_default.jsonl
```

### Chạy kiểm thử tự động:
```bash
npm test
```

---

## 3. Điều khiển Game (Controls)

| Phím | Hành động |
|---|---|
| `W`, `A`, `S`, `D` / Phím mũi tên | Di chuyển Mây quanh đảo |
| `E` | Nạp đom đóm vào Đèn Lồng Lớn khi đứng gần ($< 2.5\text{m}$) |
| `Space` hoặc `Q` | Tỏa sáng (Pulse) — đẩy lùi và làm choáng Bóng Mực ($< 6.0\text{m}$) |
| `R` | Chơi lại khi Thắng hoặc Thua |

---

## 4. Cơ chế Tính điểm (Scoring)

- **Nhặt đom đóm:** `+10` điểm / đom đóm.
- **Thắp sáng 1 Đèn Lồng Lớn:** `+100` điểm / đèn (cần 3 đom đóm).
- **Làm choáng Bóng Mực bằng Tỏa sáng:** `+25` điểm / con.
- **Phần thưởng khi Thắng (thắp đủ 5 đèn):**
  - `+5` điểm cho mỗi giây còn lại trước bình minh.
  - `+50` điểm cho mỗi ngọn lửa sinh mệnh còn giữ được.

---

## 5. Bằng chứng & Kiến trúc Hệ thống

- **Kiến trúc tách biệt (Decoupled Architecture):**
  - `src/core/`: Logic game mô phỏng 60Hz thuần túy, tính toán tất định theo `--seed` bằng PRNG Mulberry32.
  - `src/render/`: Three.js hiển thị 3D trên nền Web.
  - `src/cli/`: Headless runner xử lý theo Test Contract v1.0.
- **Bằng chứng kiểm chứng Phase 1:**
  - Ma trận truy vết: [verification_matrix.md](docs/proof/phase-1/verification_matrix.md)
  - Log kịch bản headless: [scenario_default.jsonl](docs/proof/phase-1/scenario_default.jsonl)
  - Báo cáo kiểm thử tự động: [test_report.txt](docs/proof/phase-1/test_report.txt)
  - Giả định thiết kế: [phase-1-assumptions.md](docs/notes/phase-1-assumptions.md)
  - Đánh giá & nhật ký AI: [phase-1-evaluation.md](docs/notes/phase-1-evaluation.md)

---

## 6. Sáng tạo của tôi (My Creative Touch)

1. **Tạo hình Nhân vật Mây mang Nón Lá Việt Nam:** Thiết kế low-poly cách điệu với nón lá chóp tre vàng và chiếc đèn lồng nhỏ cầm tay phát ra ánh sáng vàng ấm áp.
2. **Hiệu ứng Vùng An Toàn (Safe Zone Auras):** Khi một đèn lồng được thắp sáng, một vòng tròn ánh sáng vàng bán kính 5m hiện lên mặt đất để biểu thị vùng an toàn xua đuổi bóng mực.
3. **Hiệu ứng Sóng Tỏa Sáng (Pulse Wave):** Khi Mây kích hoạt Tỏa Sáng, một vòng sóng xung kích ánh sáng lan tỏa từ chân Mây, tạo cảm giác trực quan khi làm choáng bóng mực.
4. **Không phụ thuộc asset bên ngoài:** 100% hình khối dựng bằng Three.js Primitive Geometries, dung lượng siêu nhẹ, tải tức thì, chạy mượt mà trên mọi thiết bị.
