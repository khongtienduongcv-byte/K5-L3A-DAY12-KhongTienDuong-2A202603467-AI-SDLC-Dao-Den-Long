# Báo cáo Nhìn lại Toàn diện Dự án (Retrospective — Phase 1 đến Phase 4)

**Dự án:** Đảo Đèn Lồng (Day 12 AI SDLC)  
**Tác giả:** Khổng Tiến Dương — MSSV / Team: `khongtienduongcv-byte`  
**Mã nộp:** `K5-DAY12-KhongTienDuong-AI-SDLC-Dao-Den-Long`  
**Phiên bản phát hành:** `v1.0.0` (Tags: `phase-1`, `phase-2`, `phase-3`, `phase-4`)

---

## 1. Tổng hợp Đánh giá Quá trình 4 Phase (Evaluation Summary)

Trải qua 4 giờ liên tục thực chiến theo mô hình phát triển phần mềm có AI hỗ trợ (AI-Assisted SDLC), dự án đã đi từ những dòng mã đầu tiên đến một sản phẩm hoàn chỉnh, ổn định và có thể phát hành thương mại:

* **Phase 1 (Ticket-01 · PRD-0 & Contract v1.0):** 
  - *Mục tiêu:* Thiết lập nền móng kiến trúc phân tách độc lập (Decoupled Architecture) giữa Core Simulation Engine (Node.js thuần túy, tất định với Mulberry32 PRNG) và Render 3D (Three.js/WebGL).
  - *Kết quả:* Chạy 600 tick headless trong 0.05 giây; xuất file `scenario_default.jsonl` đúng 100% schema và vượt qua toàn bộ 6 bài test ban đầu.
* **Phase 2 (Ticket-02 · 3 Đêm & Contract v1.1):** 
  - *Mục tiêu:* Tiếp nhận Change Request mở rộng 3 bản đồ (Đảo Bến, Đảo Cau với cầu và bục nhảy, Đảo Chuông với 3 tầng độ cao) cùng cơ chế nhảy, lướt, Gió Lạc cướp đom đóm, Bùa Gió và ngã vực.
  - *Kết quả:* 3 kịch bản `scenario_night1.jsonl`, `scenario_night2.jsonl`, `scenario_night3.jsonl` được xác minh độc lập; không có hồi quy nào xảy ra ở Phase 1; tăng số lượng test lên 11 bài.
* **Phase 3 (Ticket-03 · Breaking Change "Đèn cạn dầu" & Contract v1.2):** 
  - *Mục tiêu:* Xử lý thay đổi lớn làm phá vỡ luật chơi cũ: bãi bỏ điều kiện thắng sớm `all_lit`, đổi luật sang `dawn_survived` (sống sót qua bình minh và giữ ≥ 60% đèn sáng), thêm cơ chế hao dầu (1.0 fuel/s), đèn tắt (`lantern_out`), thắp lại (tốn 5 đom đóm), nạp dầu khi đang sáng (`refuel`) và trạng thái Bóng Mực hút dầu (`drain` state).
  - *Kết quả:* Viết ADR chi tiết (`docs/notes/phase-3-adr.md`), cập nhật 3 kịch bản kiểm thử độc lập (`scenario_fuel_decay`, `scenario_drain`, `scenario_dawn_survived`), nâng tổng số test lên 14 bài.
* **Phase 4 (Ticket-04 · Non-functional & Release v1.0.0 & Contract v1.3):** 
  - *Mục tiêu:* Đo lường hiệu năng chuyên sâu (Benchmark 30s), kiểm tra độ ổn định rò rỉ bộ nhớ (Soak Test 10 Đêm liên tục), xây dựng Bảng xếp hạng cục bộ (Top 10), bộ tính năng Trợ năng (Accessibility) toàn diện và đóng gói bản phát hành `v1.0.0`.
  - *Kết quả:* Đạt 272,744 FPS trong benchmark (ngưỡng ≥ 60 FPS), rò rỉ bộ nhớ 1.08x trong Soak test (ngưỡng ≤ 1.2x), 19/19 bài test tự động đạt 100%, đóng gói static web bundle và demo video.

---

## 2. Điều gì Hiệu quả và Không hiệu quả khi làm việc với AI

### Điều hiệu quả vượt bậc:
1. **Mô phỏng Headless Tách biệt (Decoupled Engine):** Việc ra lệnh cho AI viết toàn bộ logic trò chơi trong `src/core/` mà không dính líu đến `window`, `document`, hay `WebGL` đã giúp AI sinh mã với tốc độ cực nhanh, có thể chạy hàng trăm nghìn khung hình trong vài giây mà không phụ thuộc vào GPU.
2. **Kế hoạch kiểm chứng trước khi viết mã (Spec-first & Test-driven):** Khi đưa ra Test Contract rõ ràng (JSON Schema, danh sách sự kiện, các công thức toán học cụ thể), AI sinh mã kiểm thử và mã logic gần như khớp ngay lần chạy đầu tiên.
3. **Subagent Browser kiểm tra chéo:** Việc giao việc cho Subagent duyệt trực tiếp web app để đọc yêu cầu và chụp ảnh kiểm chứng giúp quá trình trích xuất thông số từ Lab Board diễn ra tự động, không sót bất kỳ trường dữ liệu nào.

### Điều không hiệu quả (Cần lưu ý):
1. **Thiếu cái nhìn tổng thể về môi trường runtime kép (Browser vs Node.js):** AI từng thử import trực tiếp `node:fs` vào trong các module dùng chung giữa render và CLI (`constants.js`, `leaderboard.js`), dẫn đến cảnh báo externalization của Vite bundler trên trình duyệt.
2. **Ảo giác về hệ tọa độ không gian 3D:** Trong Phase 2, khi điều khiển nhân vật bằng camera đặt ở $-Z$ nhìn về $+Z$, AI đã map nút A sang $-X$ và D sang $+X$, khiến trên màn hình phím A lại đi sang phải và phím D đi sang trái. Con người phải phát hiện qua trải nghiệm trực quan và yêu cầu đảo lại vector di chuyển.
3. **Phụ thuộc vào garbage collection ngầm của V8:** Trong bài kiểm tra Soak Test, AI ban đầu lấy mốc bộ nhớ trước khi V8 kịp khởi tạo heap, dẫn đến tỷ lệ tăng ảo do cấp phát trang ban đầu của hệ điều hành. Cần có sự can thiệp kỹ thuật định hình memory baseline buffer.

---

## 3. Những lần AI sai và Cách phát hiện & Khắc phục

| Lần sai của AI | Nguyên nhân gốc rễ | Cách phát hiện | Giải pháp khắc phục triệt để |
|---|---|---|---|
| **Lỗi 1: Phím A/D bị ngược hướng** | Góc nhìn camera đặt ở $-Z$ nhìn về $+Z$, trong khi AI áp dụng trục tọa độ Cartesian toán học thay vì View-space của người chơi. | Người dùng trực tiếp chơi thử trên giao diện 3D và phản hồi. | Đảo lại ánh xạ trong `game3d.js`: Phím A gán $+X$ (bên trái màn hình), phím D gán $-X$ (bên phải màn hình). |
| **Lỗi 2: Import `node:fs` trong code Browser** | AI dùng chung module cấu hình và bảng xếp hạng cho cả CLI và Web. | Trình duyệt log cảnh báo: `Module 'node:fs' has been externalized for browser compatibility`. | Tách bạch: code trong `src/core/` thuần túy logic (dùng `localStorage` nếu ở web), code dùng `node:fs` đưa toàn bộ vào `src/cli/`. |
| **Lỗi 3: Test Pause thất bại do Rising Edge** | Test script gọi liên tục 2 lần `engine.step({ pause: true })` mà không nhả phím, khiến engine hiểu là đang giữ phím chứ không phải nhấn mới. | Chạy `npm test` bị fail ở assertion `expect(pauseEvents.some(...)).toBe(true)`. | Thêm bước nhả phím `engine.step({ pause: false })` trước khi gửi tín hiệu pause tiếp theo để tạo xung cạnh lên (rising edge). |
| **Lỗi 4: Test ngã vực không trigger rơi** | Scenario đặt vị trí người chơi tại $(0, -10.5, 0)$, nhưng tại $(0,0)$ đảo có bán kính 40m và độ cao mặt đất là $Y=0$, nên hàm ground clamp giữ người chơi ở $Y=0$. | Assertion kiểm tra sự kiện `player_hit (fall)` không được bắn ra. | Đặt vị trí người chơi ra ngoài bán kính đảo tại $(50, -10.5, 0)$ để nhân vật rơi tự do vào hư không. |

---

## 4. Đánh giá Harness AI: Công cụ nào mang lại giá trị cao nhất?

1. **`AGENTS.md` (Quy tắc kim chỉ nam):**
   - Đây là harness **quan trọng nhất và hiệu quả nhất**. Ngay khi cập nhật các quy định nghiêm ngặt về Test Contract (như tần số 60Hz, luật kết thúc đêm `dawn_survived`, cơ chế cạn dầu 1.0 fuel/s, các lệnh chạy), AI lập tức tuân thủ và không bao giờ tự ý sửa đổi các hằng số lõi hay tạo ra các đoạn mã giả mạo.
2. **Subagent Browser (`invoke_subagent`):**
   - Giúp tự động điều hướng vào trang Lab Board, đăng nhập, trích xuất chính xác 100% tài liệu và chụp ảnh bằng chứng mà không cần con người phải copy/paste thủ công từng đoạn ticket.
3. **Automated Verification Matrix & Vitest Suite:**
   - Việc duy trì bộ test unit chạy qua `npm test` với 19 bài test đóng vai trò như lưới an toàn (safety net). Bất kỳ thay đổi nào làm hỏng logic của các phase trước đều bị phát hiện trong vòng chưa đầy 2 giây.

---

## 5. Sổ cái Token & Chi phí AI Ước tính (Token & Cost Ledger)

Nhờ áp dụng chiến lược **Prompt Kỹ thuật & Context Caching**:
* Đọc file có chỉ định dòng cụ thể (`StartLine`, `EndLine`), không đọc toàn bộ file dài.
* Sử dụng regex và script tìm kiếm ngắn gọn trên terminal thay vì in toàn bộ thư mục ra context.
* Đóng gói toàn bộ lệnh vào một lần chạy duy nhất.

### Bảng thống kê chi phí ước tính (Mô hình Gemini 2.5/3.8 Flash):
* **Tổng Input Tokens:** ~145,000 tokens
* **Tổng Output Tokens:** ~28,000 tokens
* **Tổng Cache Read Tokens:** ~1,850,000 tokens (nhờ Context Caching tự động)
* **Chi phí ước tính:**
  - Input: $145,000 \times \$0.10 / 1\text{M} = \$0.0145$
  - Output: $28,000 \times \$0.40 / 1\text{M} = \$0.0112$
  - Cache Read: $1,850,000 \times \$0.025 / 1\text{M} = \$0.0462$
  - **TỔNG CỘNG:** **~ \$0.0719 USD** (chưa đến **2.000 VNĐ** cho toàn bộ 4 phase dự án).

---

## 6. Nếu được làm lại từ đầu, tôi sẽ thay đổi điều gì?

1. **Chuẩn hóa hệ trục tọa độ Camera và Player ngay từ dòng code đầu tiên:** Sẽ quy định rõ ràng ma trận view của camera và vector điều khiển WASD theo trục màn hình ngay trong `PRD-0` để tránh lỗi ngược phím A/D ở Phase 2.
2. **Xây dựng module Storage Adapter dùng chung từ đầu:** Thiết kế một interface lưu trữ thống nhất `StorageAdapter` (với hai implementation: `LocalStorageAdapter` cho Web và `FileStorageAdapter` cho Node CLI) ngay từ Phase 1 để không phải refactor khi làm Bảng xếp hạng ở Phase 4.
3. **Tự động hóa quay video demo bằng Headless Canvas / Puppeteer Recorder:** Nếu có thêm thời gian, việc tích hợp công cụ ghi hình canvas tự động sẽ giúp xuất file `.mp4` hoàn toàn tự động chỉ với 1 câu lệnh CLI.

---
*Báo cáo được hoàn thành và đối chiếu với mọi tiêu chí của Day 12 AI SDLC Checklist.*
