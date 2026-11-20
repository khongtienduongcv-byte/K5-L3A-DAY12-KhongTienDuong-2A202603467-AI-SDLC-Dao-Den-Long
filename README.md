# Đảo Đèn Lồng — Bản Phát Hành v1.0.0 (Day 12 AI SDLC)

> 🎬 **Video Demo Gameplay & Bằng Chứng:** [Xem Video Demo (.mp4)](docs/demo/demo.mp4) *(hoặc đính kèm tại GitHub Release v1.0.0)*  
> 🏷 **Bản phát hành chính thức:** `v1.0.0` (Tags: `phase-1`, `phase-2`, `phase-3`, `phase-4`)  
> 🏆 **Mã nộp bài:** `K5-DAY12-KhongTienDuong-AI-SDLC-Dao-Den-Long`  
> 👤 **Tác giả:** Khổng Tiến Dương — Team/MSSV: `khongtienduongcv-byte`  
> 📜 **Hợp đồng kiểm thử:** Test Contract v1.3  
> 📊 **Báo cáo Retrospective:** [docs/notes/retro.md](docs/notes/retro.md) | **Ma trận kiểm chứng:** [docs/proof/phase-4/verification_matrix.md](docs/proof/phase-4/verification_matrix.md)

---

## 1. Giới thiệu Dự án
**Đảo Đèn Lồng** là một tựa game 3D góc nhìn thứ ba mang phong cách văn hóa truyền thống Việt Nam, được phát triển toàn diện theo quy trình AI SDLC 4 pha. Người chơi vào vai **Mây**, một em nhỏ giữ đèn đội nón lá tre, mang theo chiếc lồng đèn ấm áp đi thu thập các đốm sáng đom đóm rải rác trên ba hòn đảo (Đảo Bến, Đảo Cau, Đảo Chuông) để giữ cho các Cột Đèn Lồng Lớn không bị tắt cho tới khi Bình Minh ló rạng.

Dự án tuân thủ nghiêm ngặt **Kiến trúc Phân tách Tuyệt đối (Decoupled Architecture)**: Toàn bộ quy tắc mô phỏng thế giới vật lý, AI thực thể và logic chấm điểm nằm trong `src/core/` (Node.js ESM thuần túy, tất định với thuật toán PRNG Mulberry32), độc lập hoàn toàn với lớp hiển thị 3D Three.js trong trình duyệt, cho phép chạy hàng triệu khung hình benchmark và kiểm thử tự động với tốc độ tính bằng mili-giây.

---

## 2. Cài đặt & Khởi chạy (Tối đa 2 lệnh từ Clean Clone)

### Yêu cầu hệ thống:
* **Node.js:** Phiên bản `>= 18.0.0` (Đã kiểm thử mượt mà trên Node v24.12.0)
* **Trình duyệt:** Bất kỳ trình duyệt hiện đại nào hỗ trợ WebGL (Chrome, Edge, Firefox, Safari)

### Chơi trực tiếp trên nền Web 3D:
```bash
npm install
npm run dev
```
*(Mở trình duyệt tại đường dẫn `http://localhost:5173` để trải nghiệm)*

### Chạy chế độ Headless CLI (Test Contract v1.3):
```bash
node src/cli/headless.js --seed 42 --night 1 --ticks 600 --out scenario_night1.jsonl
```

### Chạy chế độ Benchmark (Đo hiệu năng 30 giây):
```bash
node src/cli/bench.js --seed 42 --duration 30 --out bench.json
```
*(Kết quả đo thực tế: **272,744 FPS**, thời gian khởi động **2 ms**, RSS bộ nhớ **206 MB**)*

### Chạy Soak Test (10 Đêm liên tục kiểm tra rò rỉ bộ nhớ):
```bash
node src/cli/soak.js --seed 7 --nights 10 --out soak.json
```
*(Kết quả: **0 lỗi/crashes**, tỷ lệ tăng bộ nhớ **1.08x** $\le 1.2\times$)*

### Xuất Bảng Xếp Hạng Cục Bộ (Leaderboard):
```bash
npm run export-leaderboard -- out.json
```
*(Hoặc dùng lệnh: `node src/cli/headless.js --export-leaderboard out.json`)*

### Chạy toàn bộ 19 bài kiểm thử tự động (Unit Tests):
```bash
npm test
```

---

## 3. Hướng dẫn Điều khiển & Phím bấm

| Hành động | Phím mặc định | Mô tả |
|---|---|---|
| **Di chuyển** | `W`, `A`, `S`, `D` / Phím Mũi tên | Di chuyển Mây quanh các đảo (A: sang trái, D: sang phải) |
| **Nhảy** | `Space` | Bật cao với vận tốc $7.0\text{ m/s}$, gia tốc trọng trường $g = -20\text{ m/s}^2$ |
| **Lướt (Dash)** | `Shift` hoặc `J` | Lướt nhanh $14\text{ m/s}$ trong $0.2\text{ s}$ (hồi chiêu $1.5\text{ s}$) |
| **Tương tác** | `E` | Nạp đom đóm / Thắp lại đèn (5 đom đóm) / Châm thêm dầu ($< 2.0\text{ m}$) |
| **Tỏa sáng (Pulse)** | `Q` | Tỏa vòng sáng đẩy lùi và làm choáng Bóng Mực (bán kính $5.0\text{ m}$, tốn 3 đom đóm) |
| **Tạm dừng** | `Esc` hoặc `P` | Mở menu tạm dừng, chọn đêm chơi hoặc tiếp tục |
| **Cài đặt & BXH** | Nút `⚙️ Cài đặt & BXH` | Mở hộp thoại đổi phím điều khiển, tùy chọn trợ năng và xem BXH |
| **Chơi lại** | `R` | Khởi động lại màn chơi sau khi Thắng hoặc Thua |

---

## 4. Tính năng Trợ Năng (Accessibility) & Bảng Xếp Hạng

1. **Đổi phím điều khiển linh hoạt (Key Rebinding):**
   - Hỗ trợ đổi toàn bộ các phím: 4 hướng di chuyển, nhảy, lướt, tương tác, tỏa sáng, tạm dừng.
   - Cơ chế tự động phát hiện trùng lặp phím và báo động cho người chơi.
   - Nút "Khôi phục mặc định" và tự động lưu cấu hình vào `localStorage`.
2. **Chỉ báo hình ảnh & Mũi tên mép màn hình (Edge Pointers):**
   - Mũi tên định hướng màu đỏ xuất hiện ở rìa màn hình, chỉ thẳng về hướng các Bóng Mực đang tiếp cận bên ngoài tầm nhìn của camera.
3. **Banner Phụ đề & Cảnh báo âm thanh/hình ảnh:**
   - Cảnh báo xuất hiện tức thời khi có sự kiện: *"Bóng Mực xuất hiện!"*, *"Gió sắp thổi mạnh!"*, *"10 giây cuối! Bình minh sắp đến!"*, *"Cảnh báo: Đèn [Lx] cạn dầu (<30%)!"*.
4. **Tùy chọn Giảm chuyển động (Reduced Motion):**
   - Tắt hoàn toàn hiện tượng rung lắc camera khi bị quái đánh và tắt hiệu ứng chớp sáng màn hình, bảo vệ thị giác người chơi.
5. **Tùy chọn Cỡ chữ lớn (Large Font x1.25):**
   - Tăng cỡ chữ toàn bộ giao diện HUD, gợi ý và phụ đề lên tối thiểu 22.5px.
6. **Bảng xếp hạng Top 10 (Local Leaderboard):**
   - Cho phép nhập tên (3–12 ký tự `[A-Za-z0-9_]`) để lưu điểm sau mỗi trận thắng hoặc thua.
   - Tự động sắp xếp theo điểm giảm dần, bằng điểm ưu tiên người đạt trước.

---

## 5. Quy chuẩn Test Contract v1.3

Tệp định nghĩa `game.contract.json` được chuẩn hóa theo Test Contract v1.3:
```json
{
  "contract_version": "1.3",
  "team": "khongtienduongcv-byte",
  "build_cmd": "npm install && npm run build",
  "run_cmd": "npm run dev",
  "headless_cmd": "node src/cli/headless.js",
  "bench_cmd": "node src/cli/bench.js",
  "soak_cmd": "node src/cli/soak.js"
}
```

---

## 6. Cấu trúc Thư mục Dự án

```text
K5-DAY12-KhongTienDuong-AI-SDLC-Dao-Den-Long/
├── README.md                      # Tài liệu tổng quan dự án (File này)
├── LICENSE                        # Giấy phép nguồn mở MIT
├── CREDITS.md                     # Ghi nhận nguồn tài nguyên & AI
├── CHANGELOG.md                   # Lịch sử thay đổi qua 4 Phase
├── AGENTS.md                      # Quy tắc phát triển dành cho AI Agent
├── game.contract.json             # Test Contract v1.3
├── bench.json                     # Kết quả đo Benchmark chuẩn 30s
├── soak.json                      # Kết quả đo Soak Test 10 Đêm
├── package.json                   # Cấu hình scripts & dependencies
├── src/
│   ├── cli/
│   │   ├── headless.js            # Runner Headless CLI Contract v1.3
│   │   ├── bench.js               # Runner Benchmark hiệu năng 30s
│   │   ├── soak.js                # Runner Soak Test 10 Đêm
│   │   └── leaderboard.js         # Tiện ích xuất dữ liệu Leaderboard
│   ├── core/                      # Logic mô phỏng tất định (Node.js ESM thuần)
│   │   ├── engine.js              # Vòng lặp 60 tick/s, 12 bước cố định
│   │   ├── maps.js                # Địa hình & thực thể 3 Đêm
│   │   ├── prng.js                # Mulberry32 PRNG
│   │   ├── leaderboard.js         # Thuật toán lọc, sắp xếp BXH
│   │   ├── constants.js           # Tham số cân bằng game
│   │   └── math.js                # Hình học & vector 3D
│   └── render/
│       └── game3d.js              # Giao diện 3D Three.js & Trợ năng
├── tests/
│   └── contract.test.js           # 19 bài unit test tự động (Vitest)
└── docs/
    ├── demo/
    │   └── demo.mp4               # Video demo gameplay hoàn chỉnh
    ├── notes/                     # ADR kiến trúc, giả định & Retro
    └── proof/                     # Bằng chứng kiểm thử tự động Phase 1-4
```
