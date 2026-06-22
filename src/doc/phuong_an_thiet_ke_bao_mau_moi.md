# Phương án thiết kế: Cải tiến Bảng báo màu mới (x-y-g-z) tích hợp cột Ngày Tháng (N.T)

Tài liệu này trình bày phương án nâng cấp trang Báo màu (`ColorReportPage.jsx`) với việc bổ sung cột Ngày Tháng (N.T) và tổ chức các hàng theo dòng dữ liệu thực tế của bảng tính.

---

## 1. Cấu trúc Bảng Báo Màu Mới

### A. Các Cột (Headers)
* **Cột đầu tiên (Cột dọc ngoài cùng bên trái):** Cột **N.T** (Ngày Tháng), hiển thị ngày tháng tương ứng của dòng dữ liệu trong bảng tính chính (ví dụ: `1/1`, `2/1`, `3/1`, ...).
* **Các cột số đếm (Tiêu đề chính - Hàng 1):** Các **Số đếm** báo màu được set cứng chạy từ `22` đến `85` (ví dụ: `22, 23, 24, ..., 85`).
* **Các cột con (Tiêu đề phụ - Hàng 2):** Dưới mỗi cột Số đếm $C$, chia làm 2 cột con:
  * **Cột (1):** Quét và hiển thị kết quả của **Thông 1** (bảng T lẻ).
  * **Cột (2):** Quét và hiển thị kết quả của **Thông 2** (bảng T chẵn).

### B. Các Hàng (Rows) và Ký hiệu nối tiếp (`||`)
Mỗi hàng trong bảng báo màu tương ứng với một **Ngày (một dòng dữ liệu đã nhập trong bảng tính chính)**.
* **Cột N.T:** Hiển thị ngày tháng lấy từ `dateValues[R]` của bảng tính (ví dụ: ngày `1/1`, `2/1`...).
* **Quy tắc hiển thị ô kết quả:**
  * Tại mỗi Ngày/Hàng $R$: Hệ thống tính toán số đếm ở dòng tương lai tương ứng (dòng $R+1$) của cả 50 Tập (100 bảng T).
  * Quét từ trái qua phải (Tập 1 đến Tập 50):
    * Đối với cột con **(1)** (Thông 1): Tập đầu tiên tìm thấy có số đếm tương lai bằng $C$ sẽ hiển thị dạng **`x-y-g-z`**.
    * Đối với cột con **(2)** (Thông 2): Tập đầu tiên tìm thấy có số đếm tương lai bằng $C$ sẽ hiển thị dạng **`x-y-g-z`**.
  * **Quy tắc nối tiếp (`||`):** Nếu tại Ngày $R$ hiện tại, không có Tập nào mới đạt số đếm $C$, ô đó sẽ hiển thị ký hiệu **`||`** (hoặc `|| - || - ||`) để biểu thị việc tiếp tục kế thừa kết quả của ngày hôm trước.
  * **Quy tắc dừng quét khi đủ số:** Khi số lượng kết quả mới tìm được trên cột đó qua các ngày đạt đủ giới hạn của khoảng số đếm:
    * Số đếm 22 ➔ 29: Lấy tối đa **5 kết quả**.
    * Số đếm 30 ➔ 41: Lấy tối đa **4 kết quả**.
    * Số đếm 42 ➔ 58: Lấy tối đa **3 kết quả**.
    * Số đếm 59 ➔ 70: Lấy tối đa **2 kết quả**.
    * Số đếm 71 ➔ 85: Lấy tối đa **2 kết quả**.
    * *Sau khi đã đạt đủ giới hạn số lượng kết quả trên cột đó, các ngày tiếp theo sẽ để trống hoàn toàn (hoặc giữ nguyên `||` tùy anh chọn).*

---

## 2. Định dạng ô kết quả (`x - y - g - z`)

Khi tìm thấy Tập đạt số đếm báo màu, ô kết quả sẽ hiển thị: **`x - y - g - z`**
Trong đó:
* **`x`**: Số thứ tự Tập trong Q (chạy từ `1` đến `10`).
* **`y`**: Số thứ tự bảng T (Thông) trong Tập đó (`1` cho bảng T1, `2` cho bảng T2).
* **`g`**: Tham số cột (chạy từ `0` đến `9`) có báo màu ở dòng tương lai.
* **`z`**: Số thứ tự lần xuất hiện kết quả đếm của tham số cột đó (lần đầu tìm thấy là `1`, lần tiếp theo là `2`, `3`...).

*Ví dụ:* Ô hiển thị `5 - 1 - 3 - 1` nghĩa là kết quả thuộc Tập 5, Thông 1, Tham số 3, xuất hiện lần thứ 1.

---

## 3. Các Phương án Triển khai để Anh Confirm

### 🔹 Phương án A (Theo dòng lịch sử bảng tính - Khuyên dùng):
* **Giao diện:** Bảng hiển thị đầy đủ tất cả các Ngày có dữ liệu từ trước đến nay (ví dụ: hiển thị từ ngày `1/1` đến ngày hiện tại).
* **Ưu điểm:** Giống 100% bản vẽ tay của anh, cho thấy quá trình phát triển và kế thừa kết quả qua từng ngày của toàn bộ bảng tính.

### 🔹 Phương án B (Chỉ hiển thị dòng kết quả rút gọn):
* **Giao diện:** Bảng chỉ hiển thị tối đa 5 hàng (STT từ 1 đến 5). Khi có kết quả mới thì ghi nhận vào hàng tiếp theo.
* **Nhược điểm:** Không hiển thị được cột Ngày Tháng (N.T) tương ứng và không có ký hiệu nối tiếp `||` qua các ngày.

---

## 4. Tính năng liên kết chéo (Link chéo)

* Mỗi ô kết quả `x-y-g-z` hiển thị trên bảng báo màu sẽ là một liên kết có thể click được.
* Khi người dùng click vào ô kết quả:
  * Hệ thống tự động chuyển hướng về trang bảng tính chính `/` kèm tham số query: `?scrollToT=globalTIndex`.
  * Trang tính chính `App.jsx` sẽ tự động cuộn (smooth scroll) đến cột bảng T tương ứng (từ T1 đến T100) giúp người dùng kiểm tra nhanh vị trí báo màu.
