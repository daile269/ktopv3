import { useState, useEffect, useCallback, useMemo } from "react";
import "./App.css";
import "./InputPage.css";
import { loadPageData } from "./dataService";

const ROWS = 5000;
const TOTAL_TABLES = 2;

function ColorReportPage({ accessWarningContent = null }) {
  const [dateValues, setDateValues] = useState(Array(ROWS).fill(""));
  const [deletedRows, setDeletedRows] = useState(Array(ROWS).fill(false));
  const [allQData, setAllQData] = useState(
    Array(5)
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

  const handleScrollToCount = useCallback(() => {
    const num = parseInt(searchCount, 10);
    if (isNaN(num) || num < 22 || num > 85) {
      alert("Vui lòng nhập số đếm từ 22 đến 85!");
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
        element.style.backgroundColor = "#6f42c1";
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
          Array(5)
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
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Lỗi tải dữ liệu: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

      setTimeout(() => {
        const container = document.getElementById("report-table-container");
        if (container) {
          container.scrollTop = container.scrollHeight;
        }

        if (scrollToCount) {
          const num = parseInt(scrollToCount, 10);
          if (!isNaN(num) && num >= 22 && num <= 85) {
            let scrolled = false;

            if (qVal && xVal && yVal && gVal) {
              const cellElement = document.querySelector(
                `[id^="cell-report-${qVal}-${xVal}-${yVal}-${gVal}-"]`,
              );
              if (cellElement) {
                cellElement.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "center",
                });

                setOrangeCell({ qVal, xVal, yVal, gVal, c: num });
                scrolled = true;
              }
            }

            if (!scrolled) {
              const element = document.getElementById(`col-count-${num}`);
              if (element) {
                element.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "center",
                });
                element.style.transition = "background-color 0.3s ease";
                element.style.backgroundColor = "#fd7e14";
                setTimeout(() => {
                  element.style.backgroundColor = "#6f42c1";
                }, 1000);
              }
            }

            const newUrl = window.location.pathname;
            window.history.replaceState({}, "", newUrl);
          }
        }
      }, 600);
    }
  }, [isLoading]);

  // Mảng các cột số đếm set cứng từ 22 đến 85
  const cols = useMemo(() => {
    const arr = [];
    for (let c = 22; c <= 85; c++) {
      arr.push(c);
    }
    return arr;
  }, []);

  // Lấy giới hạn số lượng kết quả cho từng số đếm
  const getLimitForCount = useCallback((c) => {
    if (c >= 22 && c <= 29) return 5;
    if (c >= 30 && c <= 41) return 4;
    if (c >= 42 && c <= 58) return 3;
    if (c >= 59 && c <= 70) return 2;
    if (c >= 71 && c <= 85) return 2;
    return 0;
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

  // Tính toán dữ liệu báo màu tổng hợp chung cho toàn bộ 5 Q
  const reportRows = useMemo(() => {
    if (isLoading) return [];

    // 1. Tìm chỉ số dòng thực tế cuối cùng có dữ liệu (actualRows) trên cả 50 Tập
    let actualRows = 0;
    for (let i = ROWS - 1; i >= 0; i--) {
      let hasData =
        dateValues[i] !== "" &&
        dateValues[i] !== null &&
        dateValues[i] !== undefined;
      if (!hasData) {
        for (let qIdx = 0; qIdx < 5; qIdx++) {
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
        actualRows = i + 1;
        break;
      }
    }

    if (actualRows === 0) return [];

    // 2. Tính toán sẵn toàn bộ giá trị bảng T1 và T2 cho 50 Tập (100 bảng T)
    // tapsTValues[tapGlobalIdx][tableIdx][row]
    const tapsTValues = [];
    for (let qIdx = 0; qIdx < 5; qIdx++) {
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
        for (let c = 22; c <= 85; c++) {
          obj[c] = [];
        }
        return obj;
      });

    // historyCounts[tapGlobalIdx][tableIdx][col] = số đếm tương lai tích lũy hiện tại
    const historyCounts = Array(50)
      .fill(null)
      .map(() =>
        Array(TOTAL_TABLES)
          .fill(null)
          .map(() => Array(10).fill(1)),
      );

    const countsHistory = [];

    // 4. Quét qua từng dòng R từ 0 đến actualRows để tìm kết quả mới (R = actualRows đại diện cho dòng tương lai)
    for (let R = 0; R <= actualRows; R++) {
      // Lưu lại trạng thái số đếm tại dòng R từ lịch sử
      const currentCounts = historyCounts.map((taps) =>
        taps.map((tables) => [...tables]),
      );
      countsHistory.push(currentCounts);

      // a. Kiểm tra xem ở dòng R, có bảng T nào đạt số đếm báo màu c
      for (let c = 22; c <= 85; c++) {
        const limit = getLimitForCount(c);

        if (matchesData[R][c].length < limit) {
          // Quét từ trái qua phải trên toàn bộ 50 Tập (100 bảng T)
          for (let tapGlobalIdx = 0; tapGlobalIdx < 50; tapGlobalIdx++) {
            for (let tableIdx = 0; tableIdx < TOTAL_TABLES; tableIdx++) {
              const counts = historyCounts[tapGlobalIdx][tableIdx];
              for (let col = 0; col < 10; col++) {
                const valStr = tapsTValues[tapGlobalIdx]?.[tableIdx]?.[R];
                const isRedCellAtR =
                  valStr !== undefined && valStr !== "" && valStr !== null
                    ? col === parseInt(valStr, 10)
                    : false;

                if (counts[col] === c && !isRedCellAtR) {
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
        for (let tapGlobalIdx = 0; tapGlobalIdx < 50; tapGlobalIdx++) {
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

      for (let c = 22; c <= 85; c++) {
        const limit = getLimitForCount(c);

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

            // Lấy số đếm thực tế của ô này tại dòng R từ lịch sử
            const rawCellY =
              countsHistory[R]?.[tapGlobalIdx]?.[tableIdx]?.[col] || 1;
            const cellY = rawCellY;

            let matchCount = 0;
            for (let r = 0; r <= R; r++) {
              if (matchesData[r]?.[c]?.[k] && !deletedRows[r]) {
                matchCount++;
              }
            }
            const displayZ = matchCount;
            const displayValue = `${match.q}-${match.x}-${match.y}-${match.g}-${displayZ}`;

            rowData.cells[`${c}-${k}`] = {
              value: displayValue,
              globalTIndex: match.globalTIndex,
              row: match.row, // click quay lại dòng đạt mốc c
              col: match.g,
              isNew: true,
              isRedCell: isRedCellAtR,
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
  }, [isLoading, dateValues, allQData, getLimitForCount, formatDate, deletedRows]);

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
                  marginRight: "10px",
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
                }}
              >
                🔍 Về chọn dòng thông
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
                placeholder="22-85"
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
                      backgroundColor: "#6f42c1",
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
                        borderRight: "4px solid #333",
                        width: "240px",
                        backgroundColor: "#6f42c1",
                      }}
                      rowSpan="2"
                    >
                      N.T
                    </th>

                    {/* Headers cho các cột số đếm */}
                    {cols.map((c) => {
                      const limit = getLimitForCount(c);
                      return (
                        <th
                          id={`col-count-${c}`}
                          key={c}
                          colSpan={limit}
                          style={{
                            padding: "12px",
                            border: "2px solid #333",
                            borderRight: "4px solid #333",
                            minWidth: `${limit * 250}px`,
                            backgroundColor: "#6f42c1",
                          }}
                        >
                          {c}
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
                      const limit = getLimitForCount(c);
                      const subHeaders = [];
                      for (let k = 1; k <= limit; k++) {
                        subHeaders.push(
                          <th
                            key={`${c}-${k}`}
                            style={{
                              padding: "8px 6px",
                              border: "2px solid #333",
                              borderRight:
                                k === limit
                                  ? "4px solid #333"
                                  : "2px solid #333",
                              width: "250px",
                              backgroundColor: "#f2edf8",
                            }}
                          >
                            ({k})
                          </th>,
                        );
                      }
                      return subHeaders;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((row, index) => {
                    return (
                      <tr
                        key={row.rowIdx}
                        style={{
                          backgroundColor:
                            index % 2 === 0 ? "#ffffff" : "#fcfcff",
                          borderBottom: "2px solid #333",
                          textAlign: "center",
                        }}
                      >
                        <td
                          style={{
                            padding: "10px",
                            border: "2px solid #333",
                            borderRight: "4px solid #333",
                            fontWeight: "bold",
                            color: "#6f42c1",
                            fontSize: "35px",
                          }}
                        >
                          {row.date}
                        </td>

                        {cols.flatMap((c) => {
                          const limit = getLimitForCount(c);
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
                              cell.value &&
                              (() => {
                                const parts = cell.value.split("-");
                                return (
                                  parts[0] === orangeCell.qVal &&
                                  parts[1] === orangeCell.xVal &&
                                  parts[2] === orangeCell.yVal &&
                                  parts[3] === orangeCell.gVal &&
                                  c === orangeCell.c
                                );
                              })();

                            cellsArr.push(
                              <td
                                key={`${c}-${k}`}
                                id={
                                  isNew
                                    ? `cell-report-${cell.value}`
                                    : undefined
                                }
                                className={hasValue ? "cell-new" : ""}
                                style={{
                                  padding: "8px",
                                  border: "2px solid #333",
                                  borderRight:
                                    k === limit - 1
                                      ? "4px solid #333"
                                      : "2px solid #333",
                                  fontWeight: isOrange
                                    ? "bold"
                                    : cell.isRedCell
                                      ? "700"
                                      : hasValue
                                        ? "600"
                                        : "500",
                                  fontStyle: row.isFuture ? "italic" : "normal",
                                  backgroundColor: isOrange
                                    ? "#fd7e14"
                                    : hasValue
                                      ? "#f8c507bd"
                                      : "transparent",
                                  color: isOrange
                                    ? "white"
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
                                  hasValue ? "Click để cuộn xem bảng tính" : ""
                                }
                              >
                                {cell.value}
                              </td>,
                            );
                          }
                          return cellsArr;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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
          background-color: #f2edf8 !important;
          color: #6f42c1 !important;
        }
      `}</style>
    </div>
  );
}

export default ColorReportPage;
