import { useState, useEffect, useCallback, useMemo } from "react";
import "./App.css";
import "./InputPage.css";
import { loadPageData, saveColorReportSettings } from "./dataService";

const ROWS = 5000;
const TOTAL_TABLES = 2;

const NUM_QS = 4;

function ColorReportPage({ accessWarningContent = null }) {
  const [dateValues, setDateValues] = useState(Array(ROWS).fill(""));
  const [purpleRangeFrom, setPurpleRangeFrom] = useState(0);
  const [purpleRangeTo, setPurpleRangeTo] = useState(0);
  const [deletedRows, setDeletedRows] = useState(Array(ROWS).fill(false));
  const [allQData, setAllQData] = useState(
    Array(NUM_QS)
      .fill(null)
      .map(() => ({
        tapsData: Array(10)
          .fill(null)
          .map(() => ({
            aValues: Array(ROWS).fill(""),
            bValues: Array(ROWS).fill(""),
          })),
      })),
  );

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [orangeCell, setOrangeCell] = useState(null);
  const [searchCount, setSearchCount] = useState("");
  const [highlightedRows, setHighlightedRows] = useState({});
  const [highlightedCols, setHighlightedCols] = useState({});

  const [colorReportRanges, setColorReportRanges] = useState({});
  const [selectedCountNum, setSelectedCountNum] = useState(16);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempRangeFrom, setTempRangeFrom] = useState("");
  const [tempRangeTo, setTempRangeTo] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const handleScrollToCount = useCallback(() => {
    const num = parseInt(searchCount, 10);
    if (isNaN(num) || num < 16 || num > 55) {
      alert("Vui lòng nhập số đếm từ 16 đến 55!");
      return;
    }
    const element = document.getElementById(`col-count-${num}`);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      // Highlight transiently
      element.style.transition = "background-color 0.3s ease";
      element.style.backgroundColor = "#fd7e14";
      setTimeout(() => {
        element.style.backgroundColor = "#3f51b5";
      }, 1000);
    } else {
      alert(`Không tìm thấy cột số đếm ${num}`);
    }
  }, [searchCount]);

  // Load data from q_all
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await loadPageData("q_all");
      if (result.success && result.data) {
        setDateValues(result.data.dateValues || Array(ROWS).fill(""));
        setDeletedRows(result.data.deletedRows || Array(ROWS).fill(false));
        const loadedAllQData =
          result.data.allQData ||
          Array(NUM_QS)
            .fill(null)
            .map(() => ({
              tapsData: Array(10)
                .fill(null)
                .map(() => ({
                  aValues: Array(ROWS).fill(""),
                  bValues: Array(ROWS).fill(""),
                })),
            }));
        setAllQData(loadedAllQData);
        setPurpleRangeFrom(result.data.purpleRangeFrom || 0);
        setPurpleRangeTo(result.data.purpleRangeTo || 0);
        setColorReportRanges(result.data.colorReportRanges || {});
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Lỗi tải dữ liệu: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSaveSettings = useCallback(async () => {
    setIsSavingSettings(true);
    try {
      const fromVal = tempRangeFrom === "" ? 0 : parseInt(tempRangeFrom, 10);
      const toVal = tempRangeTo === "" ? 0 : parseInt(tempRangeTo, 10);
      if (isNaN(fromVal) || isNaN(toVal) || fromVal < 0 || toVal < 0) {
        alert("Vui lòng nhập khoảng giá trị số hợp lệ!");
        setIsSavingSettings(false);
        return;
      }
      if (fromVal > 0 && toVal > 0 && fromVal > toVal) {
        alert("Giá trị 'Từ' không được lớn hơn 'Đến'!");
        setIsSavingSettings(false);
        return;
      }

      const updatedRanges = {
        ...colorReportRanges,
        [selectedCountNum]: { from: fromVal, to: toVal },
      };

      const result = await saveColorReportSettings("q_all", updatedRanges);

      if (result.success) {
        setColorReportRanges(updatedRanges);
        setIsSettingsOpen(false);
        alert(`Lưu cài đặt báo màu cho số đếm ${selectedCountNum} thành công!`);
      } else {
        alert("Lỗi khi lưu cài đặt: " + result.error);
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("Lỗi khi lưu cài đặt: " + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  }, [tempRangeFrom, tempRangeTo, colorReportRanges, selectedCountNum]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const clearOrange = () => setOrangeCell(null);
    window.addEventListener("click", clearOrange);
    return () => window.removeEventListener("click", clearOrange);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const params = new URLSearchParams(window.location.search);
      const scrollToCount = params.get("scrollToCount");
      const qVal = params.get("q");
      const xVal = params.get("x");
      const yVal = params.get("y");
      const gVal = params.get("g");
      const rowVal = params.get("row");

      const container = document.getElementById("report-table-container");

      if (scrollToCount) {
        const num = parseInt(scrollToCount, 10);
        if (!isNaN(num) && num >= 16 && num <= 55) {
          let attempts = 0;
          const maxAttempts = 30; // 1.5 seconds maximum

          const tryScroll = () => {
            let scrolled = false;

            console.log(
              `[SCROLL CHECK] Attempt ${attempts}: qVal=${qVal}, xVal=${xVal}, yVal=${yVal}, gVal=${gVal}, count=${num}, rowVal=${rowVal}`,
            );

            if (qVal && xVal && yVal && gVal) {
              const selector =
                rowVal !== null
                  ? `[id^="cell-report-${qVal}-${xVal}-${yVal}-${gVal}-${num}-"][id$="-${rowVal}"]`
                  : `[id^="cell-report-${qVal}-${xVal}-${yVal}-${gVal}-${num}-"]`;
              const cellElement = document.querySelector(selector);
              console.log(
                `[SCROLL CHECK] Cell selector: "${selector}", Found:`,
                !!cellElement,
              );
              if (cellElement) {
                cellElement.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                  inline: "center",
                });

                setOrangeCell({
                  qVal,
                  xVal,
                  yVal,
                  gVal,
                  c: num,
                  row: rowVal !== null ? parseInt(rowVal, 10) : null,
                });
                scrolled = true;
              }
            }

            if (!scrolled) {
              const headerId = `col-count-${num}`;
              const element = document.getElementById(headerId);
              console.log(
                `[SCROLL CHECK] Header ID: "${headerId}", Found:`,
                !!element,
              );
              if (element) {
                element.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                  inline: "center",
                });
                element.style.transition = "background-color 0.3s ease";
                element.style.backgroundColor = "#91d5ff";
                setTimeout(() => {
                  element.style.backgroundColor = "#3f51b5";
                }, 1000);
                scrolled = true;
              }
            }

            if (scrolled) {
              console.log("[SCROLL CHECK] Successfully scrolled!");
              const newUrl = window.location.pathname;
              window.history.replaceState({}, "", newUrl);
            } else if (attempts < maxAttempts) {
              attempts++;
              setTimeout(tryScroll, 50);
            } else {
              console.log(
                "[SCROLL CHECK] Reached max attempts, scrolling failed.",
              );
            }
          };

          tryScroll();
        }
      } else {
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }
    }
  }, [isLoading]);

  // Mảng các cột số đếm luôn hiển thị từ 16 đến 55
  const cols = useMemo(() => {
    const arr = [];
    for (let c = 16; c <= 55; c++) {
      arr.push(c);
    }
    return arr;
  }, []);

  // Lấy giới hạn số lượng kết quả cho từng số đếm để dựng layout (không phụ thuộc khoảng báo màu)
  const getLayoutLimitForCount = useCallback((c) => {
    if (c >= 16 && c <= 22) return 16;
    if (c >= 23 && c <= 30) return 15;
    if (c >= 31 && c <= 40) return 12;
    if (c >= 41 && c <= 55) return 8;
    if (c >= 56 && c <= 75) return 8;
    if (c >= 76 && c <= 85) return 4;
    if (c >= 86 && c <= 95) return 3;
    return 0;
  }, []);

  // Lấy giới hạn số lượng kết quả cho từng số đếm để quét cảnh báo (nếu ngoài khoảng báo màu thì trả về 0)
  const getLimitForCount = useCallback(
    (c) => {
      const from = Number(purpleRangeFrom);
      const to = Number(purpleRangeTo);
      if (from > 0 && to > 0 && (c < from || c > to)) return 0;

      return getLayoutLimitForCount(c);
    },
    [purpleRangeFrom, purpleRangeTo, getLayoutLimitForCount],
  );

  const handleRowClick = useCallback((rowIdx) => {
    setHighlightedRows((prev) => ({
      ...prev,
      [rowIdx]: !prev[rowIdx],
    }));
  }, []);

  const handleColClick = useCallback((c, kIndex) => {
    const colKey = `${c}-${kIndex}`;
    setHighlightedCols((prev) => ({
      ...prev,
      [colKey]: !prev[colKey],
    }));
  }, []);

  const handleMainColClick = useCallback(
    (c) => {
      const limit = getLayoutLimitForCount(c);
      setHighlightedCols((prev) => {
        const next = { ...prev };
        let anyHighlighted = false;
        for (let k = 0; k < limit; k++) {
          if (prev[`${c}-${k}`]) {
            anyHighlighted = true;
            break;
          }
        }
        for (let k = 0; k < limit; k++) {
          next[`${c}-${k}`] = !anyHighlighted;
        }
        return next;
      });
    },
    [getLayoutLimitForCount],
  );

  const clearHighlights = useCallback(() => {
    setHighlightedRows({});
    setHighlightedCols({});
  }, []);

  // Định dạng ngày tháng về dạng chuẩn DD/MM/YYYY
  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return "";
    const trimmed = String(dateStr).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  }, []);

  // 1. Tìm chỉ số dòng thực tế cuối cùng có dữ liệu (actualRows) trên cả 50 Tập
  const actualRows = useMemo(() => {
    if (isLoading) return 0;
    let maxRow = 0;
    for (let i = ROWS - 1; i >= 0; i--) {
      let hasData =
        dateValues[i] !== "" &&
        dateValues[i] !== null &&
        dateValues[i] !== undefined;
      if (!hasData) {
        for (let qIdx = 0; qIdx < NUM_QS; qIdx++) {
          const qData = allQData[qIdx];
          if (qData && qData.tapsData) {
            for (let tapIdx = 0; tapIdx < 10; tapIdx++) {
              const tap = qData.tapsData[tapIdx];
              if (tap && (tap.aValues[i] || tap.bValues[i])) {
                hasData = true;
                break;
              }
            }
          }
          if (hasData) break;
        }
      }
      if (hasData) {
        maxRow = i + 1;
        break;
      }
    }
    return maxRow;
  }, [isLoading, dateValues, allQData]);

  const activeRowCount = useMemo(() => {
    let count = 0;
    for (let r = 0; r < actualRows; r++) {
      if (!deletedRows[r]) {
        count++;
      }
    }
    return count;
  }, [actualRows, deletedRows]);

  // Tính toán dữ liệu báo màu tổng hợp chung cho toàn bộ NUM_QS Q
  const reportRows = useMemo(() => {
    if (isLoading) return [];
    if (actualRows === 0) return [];

    // 2. Tính toán sẵn toàn bộ giá trị bảng T1 và T2 cho 50 Tập (100 bảng T)
    // tapsTValues[tapGlobalIdx][tableIdx][row]
    const tapsTValues = [];
    for (let qIdx = 0; qIdx < NUM_QS; qIdx++) {
      const qData = allQData[qIdx] || { tapsData: [] };
      for (let tapIdx = 0; tapIdx < 10; tapIdx++) {
        const tap = qData.tapsData?.[tapIdx] || {
          aValues: Array(ROWS).fill(""),
          bValues: Array(ROWS).fill(""),
        };
        const tapA = tap.aValues;
        const tapB = tap.bValues;

        const newTValuesArr = Array(TOTAL_TABLES)
          .fill(null)
          .map(() => Array(ROWS).fill(""));

        for (let i = 0; i < TOTAL_TABLES; i++) {
          let v1, v2;
          if (i === 0) {
            v1 = tapA;
            v2 = tapB;
          } else if (i === 1) {
            v1 = tapB;
            v2 = newTValuesArr[0];
          }

          for (let r = 0; r < actualRows; r++) {
            if (v1[r] === "" && v2[r] === "") {
              newTValuesArr[i][r] = "";
              continue;
            }
            const n1 = parseInt(v1[r]) || 0;
            const n2 = parseInt(v2[r]) || 0;
            newTValuesArr[i][r] = String((n1 + n2) % 10);
          }
        }
        tapsTValues.push(newTValuesArr);
      }
    }

    // 3. Khởi tạo mảng lưu trữ kết quả quét lũy kế cho các Số đếm từ 22 đến 85
    // matchesData[c] là danh sách kết quả tìm được cho số đếm c (tối đa N kết quả)
    // thamCountsData[c][col] là số lần xuất hiện của tham số col cho số đếm c
    // matchesData[R][c] là danh sách kết quả tìm được cho số đếm c tại dòng R (tối đa N kết quả)
    // matchesData[R][c] là danh sách kết quả tìm được cho số đếm c tại dòng R (tối đa N kết quả)
    const matchesData = Array(actualRows + 1)
      .fill(null)
      .map(() => {
        const obj = {};
        for (let c = 16; c <= 95; c++) {
          obj[c] = [];
        }
        return obj;
      });

    // historyCounts[tapGlobalIdx][tableIdx][col] = số đếm tương lai tích lũy hiện tại
    const historyCounts = Array(NUM_QS * 10)
      .fill(null)
      .map(() =>
        Array(TOTAL_TABLES)
          .fill(null)
          .map(() => Array(10).fill(1)),
      );

    const countsHistory = [];

    // 4. Quét qua từng dòng R từ 0 đến actualRows để tìm kết quả mới (R = actualRows đại diện cho dòng tương lai)
    for (let R = 0; R <= actualRows; R++) {
      if (R < actualRows && deletedRows[R]) {
        continue;
      }

      // Lưu lại trạng thái số đếm tại dòng R từ lịch sử
      const currentCounts = historyCounts.map((taps) =>
        taps.map((tables) => [...tables]),
      );
      countsHistory.push(currentCounts);

      // a. Kiểm tra xem ở dòng R, có bảng T nào đạt số đếm báo màu c
      for (let c = 16; c <= 95; c++) {
        const limit = getLimitForCount(c);

        if (matchesData[R][c].length < limit) {
          // Quét từ trái qua phải trên toàn bộ 50 Tập (100 bảng T)
          for (
            let tapGlobalIdx = 0;
            tapGlobalIdx < NUM_QS * 10;
            tapGlobalIdx++
          ) {
            for (let tableIdx = 0; tableIdx < TOTAL_TABLES; tableIdx++) {
              const counts = historyCounts[tapGlobalIdx][tableIdx];
              for (let col = 0; col < 10; col++) {
                if (counts[col] === c) {
                  if (matchesData[R][c].length < limit) {
                    const q = Math.floor(tapGlobalIdx / 10) + 1; // Q (1-5)
                    const x = (tapGlobalIdx % 10) + 1; // Tập trong Q (1-10)
                    const y = tableIdx + 1; // Thông (1-2)
                    const g = col; // Tham số (0-9)
                    const globalTIndex = tapGlobalIdx * 2 + tableIdx + 1;

                    matchesData[R][c].push({
                      row: R,
                      q,
                      x,
                      y,
                      g,
                      globalTIndex,
                    });
                  }
                }
              }
            }
          }
        }
      }

      // b. Cập nhật số đếm tương lai của tất cả bảng T tại dòng R (cho dòng R + 1)
      if (R < actualRows) {
        for (let tapGlobalIdx = 0; tapGlobalIdx < NUM_QS * 10; tapGlobalIdx++) {
          for (let tableIdx = 0; tableIdx < TOTAL_TABLES; tableIdx++) {
            const valStr = tapsTValues[tapGlobalIdx][tableIdx][R];
            if (valStr !== "") {
              const val = parseInt(valStr, 10);
              for (let col = 0; col < 10; col++) {
                const isRed = col === val;
                historyCounts[tapGlobalIdx][tableIdx][col] = isRed
                  ? 1
                  : historyCounts[tapGlobalIdx][tableIdx][col] + 1;
              }
            }
          }
        }
      }
    }

    // 5. Build cấu trúc dữ liệu hiển thị cho các hàng (bao gồm cả dòng tương lai ở cuối)
    const rows = [];
    for (let R = 0; R <= actualRows; R++) {
      const isFutureRow = R === actualRows;
      const rowData = {
        rowIdx: R,
        date: isFutureRow ? "" : formatDate(dateValues[R]) || `Dòng ${R + 1}`,
        isFuture: isFutureRow,
        cells: {},
      };

      for (let c = 16; c <= 95; c++) {
        const limit = getLayoutLimitForCount(c);

        for (let k = 0; k < limit; k++) {
          const match = matchesData[R]?.[c]?.[k];
          if (!match) {
            rowData.cells[`${c}-${k}`] = { value: "||", isPlaceholder: true };
          } else {
            const tapGlobalIdx = (match.q - 1) * 10 + (match.x - 1);
            const tableIdx = match.y - 1;
            const col = match.g;

            // Xác định xem tại dòng R ô này có màu đỏ hay không
            const tValAtR = tapsTValues[tapGlobalIdx]?.[tableIdx]?.[R];
            const isRedCellAtR =
              tValAtR !== undefined && tValAtR !== "" && tValAtR !== null
                ? col === parseInt(tValAtR, 10)
                : false;

            let matchCount = 0;
            let resetOnNext = false;

            for (let r = 0; r <= R; r++) {
              if (matchesData[r]?.[c]?.[k]) {
                const matchAtR = matchesData[r][c][k];
                const tapGlobalIdxAtR =
                  (matchAtR.q - 1) * 10 + (matchAtR.x - 1);
                const tableIdxAtR = matchAtR.y - 1;
                const colAtR = matchAtR.g;
                const tValAtR =
                  tapsTValues[tapGlobalIdxAtR]?.[tableIdxAtR]?.[r];
                const isRedCellAtRow =
                  tValAtR !== undefined && tValAtR !== "" && tValAtR !== null
                    ? colAtR === parseInt(tValAtR, 10)
                    : false;

                if (resetOnNext) {
                  matchCount = 1;
                  resetOnNext = false;
                } else {
                  matchCount++;
                }

                if (isRedCellAtRow) {
                  resetOnNext = true;
                }
              }
            }
            const displayValue = `${k + 1}/${match.q}-${match.x}-${match.y}-${match.g}/${matchCount}`;

            rowData.cells[`${c}-${k}`] = {
              value: displayValue,
              globalTIndex: match.globalTIndex,
              row: R, // click quay lại dòng đạt mốc c
              col: match.g,
              isNew: true,
              isRedCell: isRedCellAtR,
              qVal: String(match.q),
              xVal: String(match.x),
              yVal: String(match.y),
              gVal: String(match.g),
              cellId: `cell-report-${match.q}-${match.x}-${match.y}-${match.g}-${c}-${k}-${match.row}`,
              matchDate: formatDate(dateValues[match.row]),
            };
          }
        }
      }
      if (!isFutureRow && deletedRows[R]) {
        continue;
      }
      rows.push(rowData);
    }

    return rows;
  }, [
    isLoading,
    actualRows,
    dateValues,
    allQData,
    getLimitForCount,
    getLayoutLimitForCount,
    formatDate,
    deletedRows,
    colorReportRanges,
  ]);

  // Quét dòng tương lai để xem số đếm nào có ô báo màu vàng
  const futureWarningCols = useMemo(() => {
    const warningSet = new Set();
    const fRow = reportRows.find((r) => r.isFuture);
    if (!fRow) return warningSet;

    for (let c = 16; c <= 75; c++) {
      const rangeForCol = colorReportRanges[c];
      if (!rangeForCol || rangeForCol.from <= 0 || rangeForCol.to <= 0)
        continue;

      const limit = getLayoutLimitForCount(c);
      for (let k = 0; k < limit; k++) {
        const cell = fRow.cells[`${c}-${k}`];
        if (
          cell &&
          !cell.isPlaceholder &&
          cell.value &&
          cell.value !== "||" &&
          cell.value !== ""
        ) {
          const parts = cell.value.split("/");
          if (parts.length === 3) {
            const zNum = parseInt(parts[2], 10);
            if (
              !isNaN(zNum) &&
              zNum >= rangeForCol.from &&
              zNum <= rangeForCol.to
            ) {
              warningSet.add(c);
              break; // chỉ cần 1 ô trong cột c báo vàng là đủ
            }
          }
        }
      }
    }
    return warningSet;
  }, [reportRows, colorReportRanges, getLayoutLimitForCount]);

  const handleScrollToCol = useCallback((c) => {
    const el = document.getElementById(`col-count-${c}`);
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "#fdfdfd",
      }}
    >
      {/* Top Banner Header */}
      <div
        style={{
          flexShrink: 0,
          width: "100%",
          textAlign: "center",
          backgroundColor: "#f8f9fa",
          borderBottom: "2px solid #dee2e6",
          padding: "10px 0",
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            fontWeight: "bold",
            fontStyle: "italic",
            margin: 0,
            color: "#cf3535ff",
          }}
        >
          Dự án cải tạo môi trường thềm lục địa biển Việt Nam -
          <span style={{ fontSize: "18px", marginLeft: "8px" }}>
            Mai Kiên - SĐT: 0964636709, email: maikien06091966@gmail.com
          </span>
        </h1>
      </div>

      {/* Main Container */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Navigation Toolbar */}
        <div style={{ flexShrink: 0, padding: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            {/* Quick Links & Search Count */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                border: "3px solid #007bff",
                padding: "10px 15px",
                borderRadius: "8px",
                backgroundColor: "#e7f3ff",
              }}
            >
              <button
                className="toolbar-btn"
                disabled
                style={{
                  fontSize: "30px",
                  fontWeight: "bold",
                  backgroundColor: "#ffc107",
                  color: "#000",
                  cursor: "default",
                  opacity: 1,
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  marginLeft: "5px",
                  marginRight: "5px",
                }}
              >
                Bảng màu - APP {import.meta.env.VITE_APP_STT || ""}
                {import.meta.env.VITE_SITE_ID === "site_a" ? "A" : "B"}
              </button>
              <button
                className="toolbar-btn"
                onClick={() => (window.location.href = "/")}
                style={{
                  fontSize: "30px",
                  background: "#28a745",
                  color: "white",
                  border: "none",
                  marginLeft: "5px",
                  marginRight: "5px",
                }}
              >
                🔍 Về bảng tính
              </button>
              <button
                className="toolbar-btn"
                onClick={() => (window.location.href = "/input")}
                style={{
                  fontSize: "30px",
                  background: "#17a2b8",
                  color: "white",
                  border: "none",
                  marginLeft: "5px",
                  marginRight: "5px",
                }}
              >
                🔍 Về bảng thông
              </button>
              <button
                className="toolbar-btn"
                onClick={() => (window.location.href = "/chon-dong-thong")}
                style={{
                  fontSize: "30px",
                  background: "#6f42c1",
                  color: "white",
                  border: "none",
                  marginLeft: "5px",
                  marginRight: "5px",
                }}
              >
                🔍 Về chọn dòng thông
              </button>
              <button
                className="toolbar-btn"
                disabled
                style={{
                  fontSize: "30px",
                  padding: "6px 12px",
                  backgroundColor: "#17a2b8",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "default",
                  marginLeft: "5px",
                  marginRight: "5px",
                  fontWeight: "bold",
                  opacity: 1,
                }}
              >
                📊 Số dòng hiện tại: {activeRowCount}
              </button>
              <button
                className="toolbar-btn"
                onClick={clearHighlights}
                style={{
                  fontSize: "30px",
                  padding: "6px 12px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  marginLeft: "5px",
                  marginRight: "5px",
                  fontWeight: "bold",
                }}
              >
                🔄 X màu d.c
              </button>

              {/* Ô Nhập Số & Nút Xem */}
              <input
                type="number"
                value={searchCount}
                onChange={(e) => setSearchCount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleScrollToCount();
                  }
                }}
                placeholder="16-55"
                style={{
                  width: "140px",
                  fontSize: "30px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "2px solid #007bff",
                  textAlign: "center",
                  outline: "none",
                  marginLeft: "15px",
                }}
              />
              <button
                className="toolbar-btn"
                onClick={handleScrollToCount}
                style={{
                  fontSize: "30px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  marginLeft: "5px",
                  marginRight: "5px",
                }}
              >
                Xem 🔍
              </button>

              {accessWarningContent}
            </div>
          </div>
        </div>

        {/* Report Table Grid Area */}
        <div
          style={{
            flex: 1,
            padding: "0 20px 20px 20px",
            overflow: "hidden",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {isLoading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
              }}
            >
              <div className="spinner"></div>
              <p style={{ fontSize: "28px", marginTop: "20px" }}>
                Đang tải và tính toán...
              </p>
            </div>
          ) : error ? (
            <div
              style={{
                color: "red",
                fontSize: "28px",
                textAlign: "center",
                padding: "50px",
                flex: 1,
              }}
            >
              {error}
            </div>
          ) : (
            <>
              {/* Hàng nút cuộn nhanh từ 16 đến 95 */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "14px",
                  marginBottom: "15px",
                  padding: "12px",
                  backgroundColor: "#f3f0f7",
                  borderRadius: "8px",
                  border: "2px solid #3f51b5",
                  maxHeight: "260px",
                  overflowY: "auto",
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                {cols.map((c) => {
                  const isWarning = futureWarningCols.has(c);
                  return (
                    <button
                      key={c}
                      onClick={() => handleScrollToCol(c)}
                      style={{
                        minWidth: "85px",
                        height: "78px",
                        fontSize: "36px",
                        fontWeight: "bold",
                        border: isWarning
                          ? "2px solid #ff9800"
                          : "1.5px solid #ccc",
                        borderRadius: "10px",
                        cursor: "pointer",
                        backgroundColor: isWarning ? "#f8c507bd" : "#ffffff",
                        color: "#333",
                        transition: "all 0.15s ease",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                      }}
                      title={
                        isWarning
                          ? `Số đếm ${c} có cảnh báo vàng ở dòng tương lai`
                          : `Cuộn tới cột số đếm ${c}`
                      }
                    >
                      {c}
                    </button>
                  );
                })}
              </div>

              <div
                id="report-table-container"
                style={{
                  flex: 1,
                  border: "2px solid #6f42c1",
                  borderRadius: "8px",
                  overflowX: "auto",
                  overflowY: "auto",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                  backgroundColor: "white",
                }}
              >
                <table
                  style={{
                    borderCollapse: "collapse",
                    width: "max-content",
                    minWidth: "100%",
                    fontSize: "35px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: "#3f51b5",
                        color: "white",
                        position: "sticky",
                        top: 0,
                        zIndex: 3,
                        fontSize: "35px",
                      }}
                    >
                      <th
                        style={{
                          padding: "12px",
                          border: "2px solid #333",
                          borderRight: "6px solid #fd7e14",
                          width: "240px",
                          backgroundColor: "#3f51b5",
                        }}
                        rowSpan="2"
                      >
                        N.T
                      </th>

                      {/* Headers cho các cột số đếm */}
                      {cols.map((c) => {
                        const limit = getLayoutLimitForCount(c);
                        const isMainHL = (() => {
                          let allHL = true;
                          for (let subK = 0; subK < limit; subK++) {
                            if (!highlightedCols[`${c}-${subK}`]) {
                              allHL = false;
                              break;
                            }
                          }
                          return allHL;
                        })();
                        return (
                          <th
                            id={`col-count-${c}`}
                            key={c}
                            colSpan={limit + 1}
                            style={{
                              padding: "8px 12px",
                              border: "2px solid #333",
                              borderRight: "6px solid #fd7e14",
                              minWidth: `${limit * 250 + 150}px`,
                              backgroundColor: "#3f51b5",
                              cursor: "default",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "10px",
                              }}
                            >
                              <span
                                style={{ fontSize: "35px", fontWeight: "bold" }}
                              >
                                {c}
                              </span>
                              {c <= 75 && (
                                <div
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "2px 6px",
                                    backgroundColor: "#fff",
                                    border: "1px solid #ffc107",
                                    borderRadius: "4px",
                                    color: "#333",
                                    fontSize: "20px",
                                    fontWeight: "normal",
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span>
                                    Báo màu:{" "}
                                    {colorReportRanges[c]
                                      ? `${colorReportRanges[c].from}-${colorReportRanges[c].to}`
                                      : "0-0"}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCountNum(c);
                                      const currentRange = colorReportRanges[
                                        c
                                      ] || { from: 0, to: 0 };
                                      setTempRangeFrom(
                                        currentRange.from === 0
                                          ? ""
                                          : String(currentRange.from),
                                      );
                                      setTempRangeTo(
                                        currentRange.to === 0
                                          ? ""
                                          : String(currentRange.to),
                                      );
                                      setIsSettingsOpen(true);
                                    }}
                                    className="toolbar-button"
                                    style={{
                                      fontSize: "18px",
                                      padding: "2px 4px",
                                      backgroundColor: "#6c757d",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                      marginLeft: "2px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    ⚙️
                                  </button>
                                </div>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                    <tr
                      style={{
                        backgroundColor: "#f2edf8",
                        fontSize: "30px",
                        position: "sticky",
                        top: "60px",
                        zIndex: 3,
                      }}
                    >
                      {/* Subheaders chạy từ (1) đến (N) tương ứng với giới hạn kết quả */}
                      {cols.flatMap((c) => {
                        const limit = getLayoutLimitForCount(c);
                        const subHeaders = [];
                        const isAnySubHL = Array.from({ length: limit }, (_, idx) => highlightedCols[`${c}-${idx}`]).some(Boolean);
                        for (let k = 1; k <= limit; k++) {
                          const isSubHL = !!highlightedCols[`${c}-${k - 1}`];
                          subHeaders.push(
                            <th
                              key={`${c}-${k}`}
                              onClick={() => {
                                handleColClick(c, k - 1);
                                setSelectedCountNum(c);
                              }}
                              style={{
                                padding: "8px 6px",
                                border: "2px solid #333",
                                borderRight: "2px solid #333",
                                width: "250px",
                                backgroundColor: isSubHL
                                  ? "#d3f0ff"
                                  : "#f2edf8",
                                cursor: "pointer",
                              }}
                            >
                              ({k}/{c})
                            </th>,
                          );
                        }
                        subHeaders.push(
                          <th
                            key={`${c}-date`}
                            style={{
                              padding: "8px 6px",
                              border: "2px solid #333",
                              borderRight: "6px solid #fd7e14",
                              width: "150px",
                              backgroundColor: isAnySubHL
                                ? "#d3f0ff"
                                : "#e2ddf0",
                              cursor: "default",
                              fontSize: "25px",
                              color: "#555",
                            }}
                          >
                            Ngày
                          </th>
                        );
                        return subHeaders;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.map((row, index) => {
                      const isRowHL = !!highlightedRows[row.rowIdx];
                      return (
                        <tr
                          key={row.rowIdx}
                          style={{
                            backgroundColor: isRowHL
                              ? "#ffe0b2"
                              : row.isFuture
                                ? "#ffe3e8"
                                : index % 2 === 0
                                  ? "#ffffff"
                                  : "#fcfcff",
                            borderBottom: "2px solid #333",
                            textAlign: "center",
                          }}
                        >
                          <td
                            onClick={() => handleRowClick(row.rowIdx)}
                            style={{
                              padding: "10px",
                              border: "2px solid #333",
                              borderRight: "6px solid #fd7e14",
                              fontWeight: "bold",
                              color: "#6f42c1",
                              fontSize: "35px",
                              cursor: "pointer",
                              fontStyle: row.isFuture ? "italic" : "normal",
                            }}
                          >
                            {row.date}
                          </td>

                          {cols.flatMap((c) => {
                            const limit = getLayoutLimitForCount(c);
                            const cellsArr = [];
                            for (let k = 0; k < limit; k++) {
                              const cell = row.cells[`${c}-${k}`] || {
                                value: "",
                              };
                              const isNew = cell.isNew;
                              const hasValue =
                                !cell.isPlaceholder &&
                                cell.value &&
                                cell.value !== "||" &&
                                cell.value !== "";
                              const isOrange =
                                orangeCell &&
                                hasValue &&
                                cell.qVal === orangeCell.qVal &&
                                cell.xVal === orangeCell.xVal &&
                                cell.yVal === orangeCell.yVal &&
                                cell.gVal === orangeCell.gVal &&
                                c === orangeCell.c &&
                                (orangeCell.row === undefined ||
                                  orangeCell.row === null ||
                                  String(row.rowIdx) ===
                                    String(orangeCell.row));

                              const rangeForCol = colorReportRanges[c] || {
                                from: 0,
                                to: 0,
                              };
                              const inColorReportRange =
                                hasValue &&
                                rangeForCol.from > 0 &&
                                rangeForCol.to > 0 &&
                                (() => {
                                  const parts = cell.value.split("/");
                                  if (parts.length === 3) {
                                    const zNum = parseInt(parts[2], 10);
                                    return (
                                      !isNaN(zNum) &&
                                      zNum >= rangeForCol.from &&
                                      zNum <= rangeForCol.to
                                    );
                                  }
                                  return false;
                                })();

                              const isColHL = !!highlightedCols[`${c}-${k}`];

                              cellsArr.push(
                                <td
                                  key={`${c}-${k}`}
                                  id={isNew ? cell.cellId : undefined}
                                  className={
                                    hasValue
                                      ? cell.isRedCell
                                        ? inColorReportRange
                                          ? "cell-new cell-red-warning cell-warning-yellow"
                                          : "cell-new cell-red-warning"
                                        : inColorReportRange
                                          ? "cell-new cell-warning-yellow"
                                          : "cell-new"
                                      : ""
                                  }
                                  style={{
                                    padding: "8px",
                                    border: "2px solid #333",
                                    borderRight: "2px solid #333",
                                    fontWeight: isOrange
                                      ? "bold"
                                      : cell.isRedCell
                                        ? "700"
                                        : hasValue
                                          ? "600"
                                          : "500",
                                    fontStyle: row.isFuture
                                      ? "italic"
                                      : "normal",
                                    backgroundColor: isOrange
                                      ? cell.isRedCell
                                        ? "#cf3535"
                                        : "#91d5ff"
                                      : inColorReportRange
                                        ? "#f8c507bd"
                                        : isColHL
                                          ? "#b3d7ff"
                                          : isRowHL
                                            ? "#ffe0b2"
                                            : row.isFuture
                                              ? "#ffe3e8"
                                              : "transparent",
                                    backgroundClip: "padding-box",
                                    color: isOrange
                                      ? cell.isRedCell
                                        ? "white"
                                        : "#333"
                                      : cell.isRedCell
                                        ? "#cf3535"
                                        : row.isFuture
                                          ? hasValue
                                            ? "#333"
                                            : "#888"
                                          : "#333",
                                    cursor: hasValue ? "pointer" : "default",
                                    fontSize: "35px",
                                    minWidth: "250px",
                                    whiteSpace: "nowrap",
                                    transition: "all 0.15s ease",
                                  }}
                                  onClick={() => {
                                    if (hasValue && cell.globalTIndex) {
                                      window.location.href = `/?scrollToT=${cell.globalTIndex}&row=${cell.row}&col=${cell.col}`;
                                    }
                                  }}
                                  onDoubleClick={() => {
                                    if (hasValue && cell.globalTIndex) {
                                      window.location.href = `/?scrollToT=${cell.globalTIndex}&row=${cell.row}&col=${cell.col}`;
                                    }
                                  }}
                                  title={
                                    hasValue
                                      ? "Click để cuộn xem bảng tính"
                                      : ""
                                  }
                                >
                                  {cell.value}
                                </td>,
                              );
                            }

                            // 2. Render a single Date cell for group c
                            let groupDate = "";
                            let groupCellForClick = null;
                            let hasActiveWarning = false;
                            let isGroupRedCell = false;
                            let isGroupWarningYellow = false;

                            for (let k = 0; k < limit; k++) {
                              const cell = row.cells[`${c}-${k}`];
                              if (cell && cell.value && cell.value !== "||" && cell.value !== "") {
                                groupDate = cell.matchDate;
                                groupCellForClick = cell;
                                hasActiveWarning = true;
                                if (cell.isRedCell) isGroupRedCell = true;

                                const rangeForCol = colorReportRanges[c] || { from: 0, to: 0 };
                                const parts = cell.value.split("/");
                                if (parts.length === 3) {
                                  const zNum = parseInt(parts[2], 10);
                                  if (!isNaN(zNum) && zNum >= rangeForCol.from && zNum <= rangeForCol.to) {
                                    isGroupWarningYellow = true;
                                  }
                                }
                              }
                            }

                            const isGroupOrange = orangeCell && orangeCell.c === c &&
                              (orangeCell.row === undefined || orangeCell.row === null || String(row.rowIdx) === String(orangeCell.row));

                            const isAnySubHL = Array.from({ length: limit }, (_, idx) => highlightedCols[`${c}-${idx}`]).some(Boolean);

                            cellsArr.push(
                              <td
                                key={`${c}-date`}
                                className={
                                  hasActiveWarning
                                    ? isGroupRedCell
                                      ? isGroupWarningYellow
                                        ? "cell-new cell-red-warning cell-warning-yellow"
                                        : "cell-new cell-red-warning"
                                      : isGroupWarningYellow
                                        ? "cell-new cell-warning-yellow"
                                        : "cell-new"
                                    : ""
                                }
                                style={{
                                  padding: "8px",
                                  border: "2px solid #333",
                                  borderRight: "6px solid #fd7e14", // thick orange border separating groups
                                  fontWeight: "bold",
                                  fontStyle: row.isFuture ? "italic" : "normal",
                                  backgroundColor: isGroupOrange
                                    ? isGroupRedCell
                                      ? "#cf3535"
                                      : "#91d5ff"
                                    : isGroupWarningYellow
                                      ? "#f8c507bd"
                                      : isAnySubHL
                                        ? "#b3d7ff"
                                        : isRowHL
                                          ? "#ffe0b2"
                                          : row.isFuture
                                            ? "#ffe3e8"
                                            : "transparent",
                                  backgroundClip: "padding-box",
                                  color: isGroupOrange
                                    ? isGroupRedCell
                                      ? "white"
                                      : "#6f42c1"
                                    : isGroupRedCell
                                      ? "#cf3535"
                                      : "#6f42c1", // purple/blue text like main date column!
                                  cursor: hasActiveWarning ? "pointer" : "default",
                                  fontSize: "30px",
                                  minWidth: "150px",
                                  whiteSpace: "nowrap",
                                  transition: "all 0.15s ease",
                                }}
                                onClick={() => {
                                  if (hasActiveWarning && groupCellForClick && groupCellForClick.globalTIndex) {
                                    window.location.href = `/?scrollToT=${groupCellForClick.globalTIndex}&row=${groupCellForClick.row}&col=${groupCellForClick.col}`;
                                  }
                                }}
                                onDoubleClick={() => {
                                  if (hasActiveWarning && groupCellForClick && groupCellForClick.globalTIndex) {
                                    window.location.href = `/?scrollToT=${groupCellForClick.globalTIndex}&row=${groupCellForClick.row}&col=${groupCellForClick.col}`;
                                  }
                                }}
                                title={
                                  hasActiveWarning
                                    ? "Click để cuộn xem bảng tính"
                                    : ""
                                }
                              >
                                {groupDate || ""}
                              </td>,
                            );

                            return cellsArr;
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Cài đặt khoảng báo màu cho Bảng báo màu */}
      {isSettingsOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsSettingsOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "8px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
              maxWidth: "500px",
              width: "90%",
            }}
          >
            <div className="modal-header" style={{ marginBottom: "20px" }}>
              <h3
                style={{
                  fontSize: "35px",
                  margin: 0,
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                ⚙️ Cài đặt báo màu Z cho số {selectedCountNum}
              </h3>
            </div>

            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    fontSize: "30px",
                    fontWeight: "bold",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  Từ:
                </label>
                <input
                  type="number"
                  value={tempRangeFrom}
                  onChange={(e) => setTempRangeFrom(e.target.value)}
                  placeholder="Nhập giá trị từ"
                  min="0"
                  disabled={isSavingSettings}
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "30px",
                    border: "2px solid #ffc107",
                    borderRadius: "6px",
                    textAlign: "center",
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "25px" }}>
                <label
                  style={{
                    fontSize: "30px",
                    fontWeight: "bold",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  Đến:
                </label>
                <input
                  type="number"
                  value={tempRangeTo}
                  onChange={(e) => setTempRangeTo(e.target.value)}
                  placeholder="Nhập giá trị đến"
                  min="0"
                  disabled={isSavingSettings}
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "30px",
                    border: "2px solid #ffc107",
                    borderRadius: "6px",
                    textAlign: "center",
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: "20px",
                  padding: "12px",
                  backgroundColor: "#fff3cd",
                  border: "1px solid #ffc107",
                  borderRadius: "6px",
                  fontSize: "25px",
                  color: "#856404",
                }}
              >
                💡 <strong>Lưu ý:</strong> Các ô có giá trị Z trong khoảng này
                sẽ được tô màu vàng báo hiệu.
              </div>
            </div>

            <div
              className="modal-footer"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                className="btn-cancel"
                onClick={() => setIsSettingsOpen(false)}
                disabled={isSavingSettings}
                style={{
                  padding: "10px 20px",
                  fontSize: "25px",
                  fontWeight: "bold",
                  border: "2px solid #ccc",
                  backgroundColor: "#f5f5f5",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Hủy
              </button>
              <button
                className="btn-save"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                style={{
                  padding: "10px 20px",
                  fontSize: "25px",
                  fontWeight: "bold",
                  color: "white",
                  backgroundColor: "#28a745",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                {isSavingSettings ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styles inline fallback / local definition */}
      <style>{`
        .toolbar-btn {
          padding: 6px 16px;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .toolbar-btn:active {
          transform: scale(0.95);
        }
        .cell-new:hover {
          background-color: #f8c507 !important;
          color: #333 !important;
        }
        .cell-new.cell-warning-yellow:hover {
          background-color: #ccbc7a !important;
          color: #333 !important;
        }
        .cell-new.cell-red-warning:hover {
          background-color: #cf3535 !important;
          color: white !important;
        }
        .cell-new.cell-red-warning.cell-warning-yellow:hover {
          background-color: #ccbc7a !important;
          color: #cf3535 !important;
        }
      `}</style>
    </div>
  );
}

export default ColorReportPage;
