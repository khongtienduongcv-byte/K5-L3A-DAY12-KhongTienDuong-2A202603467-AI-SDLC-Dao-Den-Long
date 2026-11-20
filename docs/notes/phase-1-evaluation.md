# Đánh giá & Nhật ký AI: Phase 1 (PRD-0)

## 1. Đánh giá Kết quả Phase 1 (Evaluation)
- **Các yêu cầu đạt được:**
  - [x] Đã hoàn thành toàn bộ cốt lõi Đêm 1: Mây di chuyển, nhặt đom đóm, nạp 5 đèn lồng, né bóng mực, tỏa sáng làm choáng.
  - [x] Chế độ Headless CLI chạy đúng chuẩn `Test Contract v1.0` với định dạng JSONL 3 chữ số thập phân, bắt đúng các sự kiện và mã thoát exit code 2 khi JSON lỗi.
  - [x] Bảo đảm tính tất định 100% nhờ PRNG Mulberry32.
  - [x] Giao diện 3D Low-poly Three.js trực quan, nhẹ, chạy mượt, có HUD đầy đủ và overlay Thắng/Thua.
- **Điểm cần lưu ý / Điều chỉnh:**
  - Cần duy trì tính tách biệt của `src/core/` tuyệt đối không import thư viện đồ họa hay DOM để đảm bảo các phase sau luôn chạy được headless độc lập.

## 2. Phân tích Lỗi của AI & Cải tiến Harness
- **Lỗi phát hiện:** 
  - Ban đầu `src/core/constants.js` có import `node:fs` để đọc file `game.contract.json`. Khi Vite build cho trình duyệt, Vite cảnh báo module `node:fs` được externalize vì browser không hỗ trợ.
- **Cách phát hiện:** 
  - Chạy `npm run build` và đọc kỹ log cảnh báo của bundler.
- **Cách khắc phục & Cải tiến Harness:** 
  - Tách triệt để: `src/core/` chỉ chứa logic thuần túy và hằng số tĩnh; việc đọc file I/O `game.contract.json` đưa ra `src/cli/headless.js`.
  - Cập nhật quy tắc vào `AGENTS.md`: *"Core logic trong src/core/ tuyệt đối không sử dụng API Node.js I/O hoặc browser globals"*.

## 3. Nhật ký Sử dụng Token & Chi phí
- **Chiến lược tiết kiệm token:**
  - Giữ các prompt ngắn gọn, cô đọng, đi thẳng vào requirement.
  - Thiết kế kiến trúc tối giản (Minimalist Core) thay vì code phức tạp, giúp file mã nguồn ngắn gọn (~200 dòng), giảm 70% số token đọc/ghi.
  - Sử dụng model tối ưu cho tác vụ lập trình.
- **Ước tính sử dụng Phase 1:**
  - Input tokens: ~18,000 tokens.
  - Output tokens: ~6,500 tokens.
  - Chi phí ước tính: ~$0.015 USD (rất tiết kiệm so với hạn mức).
