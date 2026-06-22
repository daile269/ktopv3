# Phương án thiết kế: Cải tiến giao diện Bảng báo màu mới (x-y-g-z)

Tài liệu này trình bày phương án nâng cấp trang Báo màu (`ColorReportPage.jsx`) sang giao diện báo cáo mới, hỗ trợ quét dòng tương lai trên 100 bảng T và hiển thị kết quả theo định dạng chi tiết 4 chỉ số `x-y-g-z` kèm tương tác liên kết chéo.

---

## 1. Yêu cầu Giao diện & Cấu trúc bảng

### A. Các cột (Hàng ngang đầu tiên)
* Tiêu đề các cột là các **Số đếm** (ví dụ: `50`, `51`, `52`...) được thiết lập tĩnh hoặc động tùy thuộc vào khoảng số đếm cần báo màu.

### B. Các hàng (Cột dọc đầu tiên)
* Là Số thứ tự lấy kết quả (STT), hiển thị dưới dạng `1/1`, `2/1`, `3/1`, `4/1`, `5/1`...
* Số lượng hàng kết quả tối đa được xác định linh hoạt dựa trên Số đếm của cột đó:
  * Số đếm từ **22 ➔ 29**: Lấy **5 kết quả** (hiển thị các dòng từ `1/1` đến `5/1`).
  * Số đếm từ **30 ➔ 41**: Lấy **4 kết quả** (hiển thị các dòng từ `1/1` đến `4/1`).
  * Số đếm từ **42 ➔ 58**: Lấy **3 kết quả** (hiển thị các dòng từ `1/1` đến `3/1`).
  * Số đếm từ **59 ➔ 70**: Lấy **2 kết quả** (hiển thị các dòng từ `1/1` đến `2/1`).
  * Số đếm từ **71 ➔ 85**: Lấy **2 kết quả** (hiển thị các dòng từ `1/1` đến `2/1`).

---

## 2. Định dạng ô kết quả (`x - y - g - z`)

Mỗi ô kết quả thỏa mãn điều kiện quét sẽ hiển thị chuỗi thông tin định dạng: **`x - y - g - z`**
Trong đó:
* **`x`**: Số thứ tự Tập trong Q (chạy từ `1` đến `10`).
* **`y`**: Số thứ tự bảng T (Thông) trong Tập đó (`1` cho bảng T1, `2` cho bảng T2).
* **`g`**: Tham số cột (chạy từ `0` đến `9`) có báo màu ở dòng tương lai.
* **`z`**: Số thứ tự lần xuất hiện kết quả đếm của tham số cột đó (lần đầu tìm thấy là `1`, lần tiếp theo là `2`, `3`...).

### Quy tắc hiển thị nối tiếp (`//`):
* Theo chiều toán từ trái qua phải (từ T1 đến T100): Khi tìm thấy một kết quả thỏa mãn, nó sẽ điền vào dòng kết quả hiện tại.
* Các dòng kết quả tiếp theo (nếu chưa tìm thấy kết quả mới) sẽ hiển thị ký hiệu `"// - // - //"` (nghĩa là giống ô đợt trước) cho đến khi tìm thấy kết quả mới thì mới cập nhật giá trị mới.

---

## 3. Thuật toán quét và tìm kiếm kết quả

Với mỗi cột Số đếm $C$ (ví dụ $C = 50$):
1. Xác định số lượng kết quả cần lấy $N$ (ví dụ với $50$ thì $N = 3$).
2. Khởi tạo danh sách kết quả `matches = []` và bản đồ đếm lần xuất hiện của các tham số `thamCounts = {}`.
3. Quét tuần tự qua 5 Q ($q = 1 \dots 5$) và 10 Tập của mỗi Q ($tap = 1 \dots 10$):
   * Với mỗi bảng T ($table = 1 \dots 2$):
     * Tính toán giá trị bảng T ở dòng tương lai (future row).
     * Duyệt qua 10 cột từ $0$ đến $9$:
       * Nếu số đếm (y) của cột $col$ ở dòng tương lai bằng đúng Số đếm $C$:
         * Tăng số lần xuất hiện của cột này: `thamCounts[col] = (thamCounts[col] || 0) + 1`.
         * Thêm kết quả mới vào `matches`:
           ```javascript
           matches.push({
             x: tap,              // Tập (1 - 10)
             y: table,            // Thông (1 - 2)
             g: col,              // Tham (0 - 9)
             z: thamCounts[col],  // Số thứ tự lần xuất hiện
             globalTIndex: (q - 1) * 20 + (tap - 1) * 2 + table
           });
           ```
         * Nếu `matches.length` đạt đủ số lượng kết quả yêu cầu $N$ ➔ Dừng quét cột $C$.
4. Điền dữ liệu từ `matches` vào các hàng dọc của cột $C$:
   * Hàng $k$ (từ $1$ đến $N$):
     * Nếu có kết quả mới tại hàng $k$, hiển thị dạng `x - y - g - z`.
     * Nếu không có kết quả mới nhưng đã có kết quả cũ trước đó, hiển thị `"// - // - //"`.
     * Nếu hoàn toàn không có kết quả nào, hiển thị ô trống.

---

## 4. Tính năng tương tác liên kết chéo (Link chéo)

* **Từ Bảng báo màu sang Bảng tính chính:** 
  * Mỗi ô kết quả `x-y-g-z` sẽ là một link hoặc phần tử clickable. 
  * Khi người dùng click, hệ thống sẽ chuyển hướng về trang chủ `/` kèm query parameter `?scrollToT=globalTIndex`.
  * Trang chủ `App.jsx` đã có sẵn logic tự động scroll đến bảng T tương ứng.
* **Từ Bảng tính chính sang Bảng báo màu:**
  * Có thể thiết kế nút nhảy nhanh từ cột T của bảng tính chính quay lại xem báo cáo màu của bảng đó bên trang Báo màu.
