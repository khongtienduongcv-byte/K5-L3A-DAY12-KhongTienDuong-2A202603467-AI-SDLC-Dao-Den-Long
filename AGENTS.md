# AGENTS.md — Quy tắc và Chỉ dẫn dành cho AI Agent (Cập nhật Phase 2)

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
    - `engine.js`: Vòng lặp mô phỏng 60 tick/giây theo 12 bước cố định.
  - `src/render/`: Three.js hiển thị giao diện 3D trong trình duyệt theo bảng màu chuẩn.
  - `src/cli/`: Headless CLI runner giao tiếp theo `Test Contract v1.1`.

## 3. Quy chuẩn Test Contract v1.1 (Nghiêm ngặt)
- Tần số mô phỏng: Cố định 60 tick/giây ($1 \text{ tick} = 1/60 \text{ s}$).
- Hỗ trợ tham số `--night <1|2|3>`.
- Trạng thái Bóng Mực: Bắt buộc dùng đúng 5 tên: `spawning`, `wander`, `chase`, `recoil`, `stunned`.
- Khi test cơ chế rơi khỏi đảo ($Y < -10$), tọa độ XZ của nhân vật phải nằm ngoài bán kính đất liền của hòn đảo tương ứng.
- Thứ tự xử lý 12 bước trong mỗi tick:
  1. Đọc input (xử lý `pause` trước).
  2. Giảm các bộ đếm (thời gian, hồi chiêu, bất tử, choáng, bùa, TTL đom đóm, hồi bùa).
  3. Di chuyển Mây (nhảy, lướt, bục nhảy, gió) và kiểm tra rơi khỏi đảo.
  4. Nhặt đom đóm và bùa.
  5. Tương tác với đèn.
  6. Cập nhật vùng an toàn.
  7. Tỏa Sáng.
  8. Di chuyển Bóng Mực và Gió Lạc.
  9. Chạm (Gió Lạc cướp trước, rồi Bóng Mực gây hit theo thứ tự id tăng dần).
  10. Sinh thực thể theo lịch.
  11. Xét thắng/thua.
  12. Ghi snapshot nếu tới lượt.

## 4. Quy ước Code & Git
- Commit nhỏ, rõ nghĩa, gắn tag chuẩn `phase-1`, `phase-2`, `phase-3`, `phase-4`.
- Không bao giờ commit `.env` hoặc API key.
