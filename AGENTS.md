# AGENTS.md — Quy tắc và Chỉ dẫn dành cho AI Agent (Cập nhật Phase 3)

Dự án: **Đảo Đèn Lồng** (Day 12 AI SDLC)
Mã nộp: `K5-DAY12-KhongTienDuong-AI-SDLC-Dao-Den-Long`

## 1. Lệnh cơ bản
- Cài đặt & Build: `npm install && npm run build`
- Chạy giao diện Web (3D): `npm run dev`
- Chạy Headless theo Contract: `node src/cli/headless.js [args]`
- Chạy bộ kiểm thử tự động: `npm test`

## 2. Kiến trúc & Phân tách trách nhiệm (Decoupled Architecture)
- **Tách biệt Core Logic và Render:**
  - `src/core/`: Mã nguồn logic thuần túy (Node.js ESM, không sử dụng `window`, `document`, WebGL).
    - `prng.js`: PRNG Mulberry32 bảo đảm tính tất định.
    - `math.js`: Chuyển đổi tọa độ, vector di chuyển, camera yaw.
    - `maps.js`: Định nghĩa địa hình, đèn, bục nhảy, bùa cho cả 3 Đêm.
    - `engine.js`: Vòng lặp mô phỏng 60 tick/giây theo 12 bước cố định (Contract v1.2).
  - `src/render/`: Three.js hiển thị giao diện 3D trong trình duyệt theo bảng màu chuẩn.
  - `src/cli/`: Headless CLI runner giao tiếp theo `Test Contract v1.2`.

## 3. Quy chuẩn Test Contract v1.2 (Nghiêm ngặt)
- Tần số mô phỏng: Cố định 60 tick/giây ($1 \text{ tick} = 1/60 \text{ s}$).
- **Luật kết thúc Đêm:** Tuyệt đối **KHÔNG** kết thúc game khi thắp đủ đèn (`all_lit` đã bị bãi bỏ). Game chỉ kết thúc khi:
  - Hết Ngọn Lửa (`reason: "no_flames"`).
  - Hết giờ (Bình minh): nếu số đèn đang sáng $\ge \lceil 0.6 \times \text{tổng đèn} \rceil$ thì thắng (`reason: "dawn_survived"`), ngược lại thì thua (`reason: "dawn"`).
- **Cơ chế Dầu Đèn:**
  - Tiêu hao tự nhiên 1.0 fuel/s.
  - Khi `fuel < 30`, đèn mất vùng an toàn; Bóng Mực `wander` tiếp cận và hút 5 fuel/s (`drain` state).
  - Khi `fuel <= 0`, đèn tắt (`lantern_out`). Đèn thắp lại (`ever_lit: true`) chỉ cần 5 đom đóm.
- Trạng thái Bóng Mực bắt buộc gồm: `spawning`, `wander`, `chase`, `drain`, `recoil`, `stunned`.

## 4. Quy ước Code & Git
- Commit nhỏ, rõ nghĩa, gắn tag chuẩn `phase-1`, `phase-2`, `phase-3`, `phase-4`.
- Không bao giờ commit `.env` hoặc API key.
