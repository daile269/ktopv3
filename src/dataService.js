// API Configuration
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5010";
const SITE_ID = import.meta.env.VITE_SITE_ID || "";

/**
 * Hàm bổ trợ để lấy ID thực tế trong DB dựa trên Site ID
 * @param {string} pageId - ID gốc truyền vào (vd: 'q1', 'master_draft')
 */
const getRealPageId = (pageId) => {
  // Những trang liệt kê ở đây sẽ DÙNG CHUNG cho tất cả các web clone
  const sharedPages = ["master_draft"];

  if (sharedPages.includes(pageId) || !SITE_ID) {
    return pageId; // Trả về nguyên bản
  }
  // Thêm tiền tố để tách biệt dữ liệu bảng tính
  return `${SITE_ID}_${pageId}`;
};

/**
 * Lưu dữ liệu trang lên MongoDB qua Backend API
 * @param {string} pageId - ID của trang (vd: 'q1', 'q2')
 * @param {Array} t1Values - Mảng giá trị T1
 * @param {Array} t2Values - Mảng giá trị T2
 * @param {Array} dateValues - Mảng giá trị ngày tháng
 * @param {Array} deletedRows - Mảng đánh dấu rows bị xóa
 * @param {number} purpleRangeFrom - Khoảng số bắt đầu tô tím
 * @param {number} purpleRangeTo - Khoảng số kết thúc tô tím
 * @param {number} keepLastNRows - Số dòng tồn tại
 */
export const savePageData = async (
  pageId,
  aValues,
  bValues,
  zValues,
  dateValues,
  deletedRows = [],
  sourceSTTValues = [],
  purpleRangeFrom = 0,
  purpleRangeTo = 0,
  keepLastNRows = 110,
  allQData = undefined,
  pageLabel = "",
  tapsData = undefined,
) => {
  try {
    const realId = getRealPageId(pageId);
    console.log(`💾 Saving data for REAL ID: ${realId}`);
    const response = await fetch(`${API_URL}/api/pages/${realId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        aValues,
        bValues,
        tapsData,
        zValues,
        dateValues,
        deletedRows,
        sourceSTTValues,
        purpleRangeFrom,
        purpleRangeTo,
        keepLastNRows,
        allQData,
        pageLabel,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to save data");
    }

    return { success: true };
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Tải dữ liệu trang từ MongoDB qua Backend API
 * @param {string} pageId - ID của trang
 */
export const loadPageData = async (pageId) => {
  try {
    const realId = getRealPageId(pageId);
    console.log(`📖 Loading data for REAL ID: ${realId}`);
    const response = await fetch(`${API_URL}/api/pages/${realId}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to load data");
    }

    if (result.success && result.data) {
      const data = result.data;

      // Pad data về 5000 rows (match với App.jsx)
      const ROWS = 5000;

      // Ensure data is always an array
      const a = Array.isArray(data.aValues) ? [...data.aValues].slice(0, ROWS) : [];
      const b = Array.isArray(data.bValues) ? [...data.bValues].slice(0, ROWS) : [];
      const z = Array.isArray(data.zValues) ? [...data.zValues].slice(0, ROWS) : [];
      const dates = Array.isArray(data.dateValues) ? [...data.dateValues].slice(0, ROWS) : [];
      const deleted = Array.isArray(data.deletedRows)
        ? [...data.deletedRows].slice(0, ROWS)
        : [];
      const sourceSTTs = Array.isArray(data.sourceSTTValues)
        ? [...data.sourceSTTValues].slice(0, ROWS)
        : [];

      // Pad với empty strings/false
      while (a.length < ROWS) a.push("");
      while (b.length < ROWS) b.push("");
      while (z.length < ROWS) z.push("");
      while (dates.length < ROWS) dates.push("");
      while (deleted.length < ROWS) deleted.push(false);
      while (sourceSTTs.length < ROWS) sourceSTTs.push("");

      // Pad và xử lý tapsData ở client
      let tapsData = data.tapsData;
      if (!tapsData || !Array.isArray(tapsData) || tapsData.length === 0) {
        tapsData = [];
      }
      while (tapsData.length < 10) {
        tapsData.push({ aValues: [], bValues: [] });
      }
      const processedTapsData = tapsData.slice(0, 10).map((tap) => {
        const tapA = Array.isArray(tap.aValues) ? [...tap.aValues].slice(0, ROWS) : [];
        const tapB = Array.isArray(tap.bValues) ? [...tap.bValues].slice(0, ROWS) : [];
        while (tapA.length < ROWS) tapA.push("");
        while (tapB.length < ROWS) tapB.push("");
        return { aValues: tapA, bValues: tapB };
      });

      // Pad và xử lý allQData lồng tapsData (nếu có)
      let allQData = data.allQData;
      if (allQData && Array.isArray(allQData)) {
        allQData = allQData.slice(0, 6).map((qItem) => {
          let qTaps = qItem.tapsData;
          if (!qTaps || !Array.isArray(qTaps) || qTaps.length === 0) {
            qTaps = [];
          }
          while (qTaps.length < 10) {
            qTaps.push({ aValues: [], bValues: [] });
          }
          const processedQTaps = qTaps.slice(0, 10).map((tap) => {
            const tapA = Array.isArray(tap.aValues) ? [...tap.aValues].slice(0, ROWS) : [];
            const tapB = Array.isArray(tap.bValues) ? [...tap.bValues].slice(0, ROWS) : [];
            while (tapA.length < ROWS) tapA.push("");
            while (tapB.length < ROWS) tapB.push("");
            return { aValues: tapA, bValues: tapB };
          });
          return {
            aValues: Array.isArray(qItem.aValues) ? [...qItem.aValues].slice(0, ROWS) : [],
            bValues: Array.isArray(qItem.bValues) ? [...qItem.bValues].slice(0, ROWS) : [],
            tapsData: processedQTaps,
          };
        });
      }

      return {
        success: true,
        data: {
          aValues: a,
          bValues: b,
          tapsData: processedTapsData,
          zValues: z,
          dateValues: dates,
          deletedRows: deleted,
          sourceSTTValues: sourceSTTs,
          purpleRangeFrom: data.purpleRangeFrom || 0,
          purpleRangeTo: data.purpleRangeTo || 0,
          keepLastNRows: data.keepLastNRows || 110,
          allQData: allQData,
          pageLabel: data.pageLabel || "",
        },
      };
    } else {
      console.log(`No data found for ${pageId}, returning null`);
      return { success: true, data: null };
    }
  } catch (error) {
    console.error("Lỗi khi tải dữ liệu:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Xóa dữ liệu trang từ MongoDB qua Backend API
 * @param {string} pageId - ID của trang
 */
export const deletePageData = async (pageId) => {
  try {
    const realId = getRealPageId(pageId);
    const response = await fetch(`${API_URL}/api/pages/${realId}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to delete data");
    }

    return { success: true };
  } catch (error) {
    console.error("Lỗi khi xóa dữ liệu:", error);
    return { success: false, error: error.message };
  }
};
