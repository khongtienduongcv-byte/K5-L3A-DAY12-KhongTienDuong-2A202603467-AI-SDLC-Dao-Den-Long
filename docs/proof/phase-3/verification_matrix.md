# Ma trận Truy vết Yêu cầu & Bằng chứng Kiểm chứng: Phase 3 (Ticket-03)

| STT | Yêu cầu Ticket-03 & Contract v1.2 | Cách kiểm chứng | File / Vị trí Bằng chứng | Kết quả |
|:---:|---|---|---|:---:|
| 1 | **Nhiên liệu đèn tối đa 100, tự hao hụt 1.0/s, tắt khi hết dầu (`lantern_out`)** | Scenario đèn có 2.0 fuel, chạy 180 ticks, kiểm tra fuel giảm và phát sinh event `lantern_out` | `tests/contract.test.js` (test 8) & `docs/proof/phase-3/scenario_fuel_decay.jsonl` | **ĐẠT** |
| 2 | **Châm dầu đèn đang sáng (`refuel`), tối đa 100 fuel** | Scenario Mây đứng gần đèn có 80 fuel mang 2 đom đóm, bấm interact, kiểm tra event `refuel` | `tests/contract.test.js` (test 7) | **ĐẠT** |
| 3 | **Thắp lại đèn từng sáng (`ever_lit: true`) chỉ cần 5 đom đóm** | Scenario đèn `ever_lit: true` cần 5 đom đóm, kiểm tra event `lantern_lit` với `relight: true` | `tests/contract.test.js` (test 6) | **ĐẠT** |
| 4 | **Sức chứa đom đóm tăng dần (10 + 2 * lights, max 20)** | Thắp đèn mới, kiểm tra `player.capacity` tăng từ 10 lên 12 trong snapshot | `tests/contract.test.js` (test 5) | **ĐẠT** |
| 5 | **Bóng Mực hút dầu (`drain`) khi đèn có `fuel < 30`** | Scenario bóng mực wander gần đèn 25 fuel, chuyển sang `drain`, phát event `fuel_drain` mỗi 60 ticks | `tests/contract.test.js` (test 9) & `docs/proof/phase-3/scenario_drain.jsonl` | **ĐẠT** |
| 6 | **Tỏa Sáng trúng Bóng Mực đang hút dầu được +15 điểm** | Bấm `pulse` khi bóng mực đang `drain`, kiểm tra cộng 15 điểm | `tests/contract.test.js` (test 10) | **ĐẠT** |
| 7 | **Luật Thắng Mới: Sống sót đến bình minh (`dawn_survived`)** | Chạy kịch bản tới bình minh (`time_left_s <= 0`) với $\ge 3/5$ đèn sáng, kiểm tra event `dawn_survived` | `tests/contract.test.js` (test 11) & `docs/proof/phase-3/scenario_dawn_survived.jsonl` | **ĐẠT** |
| 8 | **Chống hồi quy Phase 1 & 2** | Kiểm tra toàn bộ 14 test cases bao gồm di chuyển, nhảy, lướt, rơi, pause/resume | `tests/contract.test.js` (14/14 passed) | **ĐẠT** |
