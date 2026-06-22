# Kế hoạch nâng cấp hệ thống: 10 Q - 10 Tập - 3 Bảng T

## 1. Ý tưởng cốt lõi (Core Idea)
* **Trước đây**: Mỗi Q chỉ có một bộ dữ liệu đầu vào duy nhất (gồm A và B), từ đó sinh ra 5 bảng T (T1 đến T5) trên màn hình tính toán.
* **Sau khi nâng cấp**: 
  * Mỗi Q (Q1 - Q10) sẽ quản lý độc lập **10 Tập** dữ liệu (Tập 1 - Tập 10).
  * Mỗi Tập có một cặp dữ liệu **A và B** riêng biệt.
  * Mỗi Tập chỉ sinh ra **3 bảng T** (T1, T2, T3) thay vì 5 bảng như trước.
  * Trên giao diện tính toán chính (ví dụ `/q1`), người dùng sẽ có một dropdown/tab để chọn hiển thị Tập muốn xem (từ Tập 1 đến Tập 10). Khi chuyển Tập, giao diện tự động vẽ lại 3 bảng T tương ứng với dữ liệu A và B của Tập đó.

---

## 2. Phạm vi cập nhật (Scope of Updates)

### A. Database Schema (`server/models/Page.js`)
Để tránh lưu trữ phân mảnh và giữ tính tương thích ngược, chúng ta sẽ định nghĩa thêm mảng dữ liệu `tapsData` lồng vào cấu trúc Schema cũ.
* **Đối với các trang tính toán (`q1` đến `q10`)**: 
  Thêm trường `tapsData` là một mảng gồm 10 phần tử (tương ứng Tập 1 đến Tập 10), mỗi phần tử chứa hai mảng chuỗi số `aValues` và `bValues`.
* **Đối với trang nháp (`master_draft`)**:
  Cập nhật trường `allQData` (mảng 10 phần tử cho 10 Q). Trong mỗi Q, thay vì chứa một bộ `aValues`/`bValues` đơn lẻ, nay sẽ chứa mảng `tapsData` gồm 10 Tập để phục vụ cho giao diện nhập liệu.

*Chi tiết cấu trúc JSON lưu trữ*:
```json
{
  "pageId": "q1",
  "dateValues": ["2026-06-20", ...],
  "deletedRows": [false, ...],
  "sourceSTTValues": ["00", ...],
  "tapsData": [
    {
      "aValues": ["1", "5", ...], // A của Tập 1
      "bValues": ["2", "6", ...]  // B của Tập 1
    },
    {
      "aValues": ["3", "7", ...], // A của Tập 2
      "bValues": ["4", "8", ...]  // B của Tập 2
    },
    ... // Đến Tập 10
  ]
}
```

### B. Backend API (`server/server.js`)
* **GET `/api/pages/:pageId`**: Đọc dữ liệu từ DB. Nếu `tapsData` trống (đối với bản ghi cũ), tự động khởi tạo mảng 10 Tập rỗng để không gây lỗi. Thực hiện slice và pad các mảng A, B của từng Tập về đúng giới hạn dòng để gửi về Client.
* **POST `/api/pages/:pageId`**: Tiếp nhận dữ liệu lưu trữ mới, thực hiện trim các dòng trống ở cuối của cả 10 Tập và lưu xuống DB.

### C. Frontend API Service (`src/dataService.js`)
* Cập nhật `loadPageData` và `savePageData` để hỗ trợ gửi/nhận trường `tapsData` mới. Thực hiện pad dữ liệu từng Tập về 5000 dòng ở phía Client để đáp ứng render lưới.

### D. Trang Nhập Liệu (`src/InputPage.jsx`)
* **Cấu trúc lại state**: Thay đổi `allQData` thành mảng chứa 10 Q $\rightarrow$ mỗi Q chứa 10 Tập $\rightarrow$ mỗi Tập chứa $A$ và $B$.
* **Giao diện bảng nhập liệu**: 
  * Mở rộng bảng nhập liệu thành bảng rất rộng theo cấu trúc phân cấp: Cột Q lớn $\rightarrow$ 10 cột Tập $\rightarrow$ Mỗi tập có 2 cột con nhập $A$ và $B$.
  * Tích hợp thanh cuộn ngang mượt mà.
* **Logic Chuyển Dòng (`handleConfirmAddToApp`)**:
  * Khi người dùng nhấn nút chuyển dòng từ bảng nháp sang bảng tính thực tế, hệ thống sẽ thực hiện copy đồng thời dữ liệu của **cả 10 Tập** tương ứng từ Q nháp sang Q chính để đảm bảo toàn vẹn dữ liệu.

### E. Trang Chọn Dòng (`src/SelectRowsPage.jsx`)
* Cập nhật logic chuyển dòng tương tự như trên.

### F. Trang Bảng Tính & Hiển Thị Đồ Họa (`src/App.jsx`)
* **Bộ chọn Tập**: Thêm Dropdown hoặc hàng Tab tại thanh công cụ: `[ Chọn Tập: Tập 1 | Tập 2 | ... | Tập 10 ]`.
* **Chỉ sinh 3 bảng T**: Thay đổi thuật toán tính toán để chỉ sinh ra 3 bảng (T1, T2, T3) cho Tập đang chọn thay vì 5 bảng T.
* **Tối ưu hóa Layout**: Rút bớt số lượng bảng hiển thị từ 5 cột xuống còn 3 cột để mở rộng chiều rộng của mỗi bảng, giúp giao diện trực quan và dễ theo dõi hơn rất nhiều.
