# Architecture Decision Record (ADR-001): Thay đổi Mô hình Trạng thái Đèn và Luật Thắng

## 1. Bối cảnh (Context)
Ở Phase 1 và 2, mục tiêu của trò chơi là "thắp sáng toàn bộ đèn lồng". Khi đèn cuối cùng được thắp sáng, game ngay lập tức kết thúc thắng cuộc (`result: "won", reason: "all_lit"`). 
Playtest cho thấy người chơi kinh nghiệm có thể gom đủ đom đóm và hoàn thành Đêm chỉ trong chưa đầy 2 phút, khiến giai đoạn cuối đêm bị mất đi tính kịch tính và căng thẳng sinh tồn.

## 2. Quyết định Thiết kế (Decision)
Theo yêu cầu từ Ticket-03 (Change Request), nhóm quyết định tái cấu trúc cốt lõi:
1. **Chuyển đổi Mục tiêu:** Từ "thắp hết đèn để thắng sớm" sang **"giữ ánh sáng trên đảo cho tới bình minh"**.
2. **Mô hình Vòng đời Đèn (Lantern Lifecycle):**
   - Đèn không còn là trạng thái nhị phân tĩnh (`lit: true/false`).
   - Đèn có thuộc tính `fuel` từ $0 \dots 100$.
   - Khi đang sáng, đèn liên tục tiêu hao $1.0\text{ fuel/giây}$.
   - Khi `fuel <= 0`, đèn tắt (`lantern_out`), ghi nhớ `ever_lit = true`.
   - Chi phí thắp lại (`relight`) giảm còn 5 đom đóm (thay vì 10 đom đóm khi thắp lần đầu).
   - Đèn có thể nhận thêm đom đóm để nạp dầu (`refuel`, mỗi đom đóm $+10\text{ fuel}$).
3. **Mô hình Vùng an toàn Động & AI Bóng Mực:**
   - Khi `fuel < 30`, đèn mất vùng an toàn $6\text{m}$.
   - Bóng Mực trạng thái `wander` sẽ săn tìm các đèn yếu này để chuyển sang trạng thái `drain`, hút $5\text{ fuel/s}$.
4. **Quy tắc Thắng Mới:**
   - Thắng cuộc khi sống sót tới hết giờ (`time_left_s <= 0`) với lý do `dawn_survived`, điều kiện là số đèn còn sáng $\ge \lceil 0.6 \times \text{tổng đèn} \rceil$.

## 3. Hệ quả & Giải pháp Kỹ thuật (Consequences & Implementation)
- **Hệ quả đối với Test Cũ:**
  - Test kịch bản "thắng ngay khi thắp 5 đèn" (`all_lit`) bị phá vỡ vì game không còn kết thúc sớm. Kịch bản được cập nhật sang kiểm tra sống sót tới bình minh với $\ge 3$ đèn sáng.
  - Snapshot JSONL được bổ sung trường `fuel`, `ever_lit`, `relit_count` ở đèn và `capacity` ở người chơi.
- **Tính toán số học:**
  - Để tránh sai số dấu phẩy động (float precision drift), dầu được tính theo đơn vị tick nguyên (trừ $1/60$ mỗi tick) và chỉ làm tròn 1 chữ số thập phân khi xuất snapshot.
