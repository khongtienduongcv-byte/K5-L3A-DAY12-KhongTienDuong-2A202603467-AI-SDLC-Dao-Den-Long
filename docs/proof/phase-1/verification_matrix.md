# Ma trận Truy vết Yêu cầu & Bằng chứng Kiểm chứng: Phase 1 (PRD-0)

| STT | Yêu cầu PRD-0 & Contract v1.0 | Cách kiểm chứng | File / Vị trí Bằng chứng | Kết quả |
|:---:|---|---|---|:---:|
| 1 | **Nhân vật Mây xuất phát tại (0,0,0) và di chuyển theo vector góc nhìn** | Chạy simulation với input frame có `move` và `cam_yaw_deg`, kiểm tra tọa độ trong snapshot | `tests/contract.test.js` (test 1) & `docs/proof/phase-1/scenario_default.jsonl` | **ĐẠT** |
| 2 | **5 Đèn Lồng Lớn ở Đêm 1 bố trí tại bán kính 25m** | Kiểm tra danh sách `lanterns` ở snapshot tick 0 có đúng 5 đèn `L1`...`L5` | `docs/proof/phase-1/scenario_default.jsonl` (tick 0) | **ĐẠT** |
| 3 | **Nhặt đom đóm trong bán kính `pickup_radius = 1.5m`** | Dựng scenario có mote tại `(0, 0, 0.5)`, chạy 1 tick, kiểm tra event `mote_picked` và `carried` tăng | `tests/contract.test.js` (test 2) | **ĐẠT** |
| 4 | **Nạp ánh sáng vào đèn và thắp sáng (`deposit` & `lantern_lit`)** | Dựng scenario Mây đứng gần `L1`, bấm `interact`, kiểm tra event `deposit` và đèn chuyển `lit: true` | `tests/contract.test.js` (test 3) | **ĐẠT** |
| 5 | **Cơ chế Tỏa Sáng (`pulse`) làm choáng và đẩy lùi Bóng Mực** | Dựng scenario Mây có đom đóm, Bóng Mực đứng gần trong bán kính 3m, bấm `pulse`, kiểm tra `stunned_ids` và trừ 1 đom đóm | `tests/contract.test.js` (test 4) | **ĐẠT** |
| 6 | **Điều kiện Thắng khi thắp đủ 5 đèn** | Dựng scenario 4 đèn đã thắp, nạp đèn thứ 5, kiểm tra event `game_over` (`result: "won"`, `reason: "all_lit"`) | `tests/contract.test.js` (test 5) | **ĐẠT** |
| 7 | **Xử lý file JSON sai định dạng (Exit code 2)** | Chạy CLI với file scenario JSON bị lỗi cú pháp, kiểm tra tiến trình trả về exit code 2 | `tests/contract.test.js` (test 6) | **ĐẠT** |
| 8 | **Tính tất định (Determinism)** | Chạy 2 lần độc lập cùng `--seed 12345` và cùng chuỗi input, so sánh hash snapshot | `tests/contract.test.js` (test 1) | **ĐẠT** |
| 9 | **Giao diện Web 3D chạy mượt mà, chơi được đầy đủ** | Build production với Vite và chạy dev server, kiểm tra rendering Three.js | `dist/` & `src/render/game3d.js` | **ĐẠT** |
