# AGENTS.md — Quy tắc và Chỉ dẫn dành cho AI Agent

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
  - `src/render/`: Three.js hiển thị giao diện 3D trong trình duyệt.
  - `src/cli/`: Headless CLI runner giao tiếp theo `Test Contract v1.0`.
- Mọi logic va chạm, nhặt đom đóm, thắp đèn, di chuyển, đuổi bắt của quái mực **PHẢI** nằm ở `src/core/`.

## 3. Quy chuẩn Test Contract v1.0 (Nghiêm ngặt)
- Tần số mô phỏng: Cố định 60 tick/giây ($1 \text{ tick} = 1/60 \text{ s}$).
- Tọa độ: Mét (m), $Y$ hướng lên, mặt đất đảo ở $Y = 0$.
- Khoảng cách đo trên mặt phẳng ngang XZ: $\le r$ là nằm trong bán kính $r$.
- Chuyển đổi camera yaw ($\theta = \text{cam\_yaw\_deg}$ sang radian):
  $$x' = x \cdot \cos\theta + z \cdot \sin\theta$$
  $$z' = -x \cdot \sin\theta + z \cdot \cos\theta$$
- Đầu ra JSONL: Bắt buộc gồm các dòng `snapshot` (mỗi `--snapshot-every` ticks), `event` (ngay khi sự kiện xảy ra), và kết thúc bằng `end`.
- Tọa độ trong JSON snapshot làm tròn đúng 3 chữ số thập phân.
- Tính tất định (Determinism): Cùng `--seed` và cùng scenario/inputs phải sinh ra output giống hệt 100%.

## 4. Quy ước Code & Git
- Commit nhỏ, rõ nghĩa, không gộp nhiều tính năng vào một commit.
- Không sửa file cấu hình `game.contract.json` nếu không có yêu cầu từ ticket mới.
- Không bao giờ commit `.env` hoặc API key.
