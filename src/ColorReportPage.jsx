import { useState, useEffect, useCallback, useMemo } from "react";
import "./App.css";
import "./InputPage.css";
import { loadPageData, savePageData } from "./dataService";

const ROWS = 5000;
const TOTAL_TABLES = 2;

function ColorReportPage({ accessWarningContent = null }) {
  const [selectedQ, setSelectedQ] = useState(1);
  const [purpleRangeFrom, setPurpleRangeFrom] = useState(30);
  const [purpleRangeTo, setPurpleRangeTo] = useState(40);
  const [requiredCount, setRequiredCount] = useState(() => {
    const saved = localStorage.getItem("ktop_bao_mau_required_count");
    return saved ? parseInt(saved, 10) : 5;
  });

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
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [error, setError] = useState("");

  const tapsData = useMemo(() => {
    return allQData[selectedQ - 1]?.tapsData || Array(10).fill(null).map(() => ({
      aValues: Array(ROWS).fill(""),
      bValues: Array(ROWS).fill(""),
    }));
  }, [allQData, selectedQ]);

  // Load data for the selected Q
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await loadPageData("q_all");
      if (result.success && result.data) {
        setDateValues(result.data.dateValues || Array(ROWS).fill(""));
        setDeletedRows(result.data.deletedRows || Array(ROWS).fill(false));
        const loadedAllQData = result.data.allQData || Array(5).fill(null).map(() => ({
          tapsData: Array(10).fill(null).map(() => ({
            aValues: Array(ROWS).fill(""),
            bValues: Array(ROWS).fill(""),
          })),
        }));
        setAllQData(loadedAllQData);
        
        // Load purple range settings
        setPurpleRangeFrom(result.data.purpleRangeFrom || 0);
        setPurpleRangeTo(result.data.purpleRangeTo || 0);
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

  // Save configurations
  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveStatus("⏳ Đang lưu cài đặt...");
    
    // Save required count to localStorage
    localStorage.setItem("ktop_bao_mau_required_count", String(requiredCount));

    try {
      const currentData = await loadPageData("q_all");
      
      if (currentData.success && currentData.data) {
        const result = await savePageData(
          "q_all",
          null,
          null,
          currentData.data.zValues || Array(ROWS).fill(""),
          dateValues,
          deletedRows,
          currentData.data.sourceSTTValues || Array(ROWS).fill(""),
          purpleRangeFrom,
          purpleRangeTo,
          currentData.data.keepLastNRows || 110,
          allQData,
          currentData.data.pageLabel || "",
          undefined,
        );

        if (result.success) {
          setSaveStatus("✅ Đã lưu cài đặt!");
        } else {
          setSaveStatus("⚠️ Lỗi: " + result.error);
        }
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      setSaveStatus("⚠️ Lỗi lưu cấu hình");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(""), 2000);
    }
  };

  // Perform report generation calculation
  const reportRows = (() => {
    if (isLoading) return [];

    // Find actual active rows
    let actualRows = 0;
    for (let i = ROWS - 1; i >= 0; i--) {
      let hasData = dateValues[i] !== "" && dateValues[i] !== null && dateValues[i] !== undefined;
      if (!hasData) {
        for (let tapIdx = 0; tapIdx < 10; tapIdx++) {
          const tap = tapsData[tapIdx];
          if (tap && (tap.aValues[i] || tap.bValues[i])) {
            hasData = true;
            break;
          }
        }
      }
      if (hasData) {
        actualRows = i + 1;
        break;
      }
    }

    const rows = [];
    const qIndex = selectedQ - 1;

    for (let tapIdx = 0; tapIdx < 10; tapIdx++) {
      const tap = tapsData[tapIdx] || { aValues: Array(ROWS).fill(""), bValues: Array(ROWS).fill("") };
      const tapA = tap.aValues;
      const tapB = tap.bValues;

      // Calculate the 3 tables (T1, T2, T3) for this Tap
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
        } else {
          v1 = newTValuesArr[i - 2];
          v2 = newTValuesArr[i - 1];
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

      // For each table, compute future row counts and find warnings
      for (let tableIndex = 0; tableIndex < TOTAL_TABLES; tableIndex++) {
        const tValues = newTValuesArr[tableIndex];
        
        // 1. Calculate future row counts for columns 0-9
        const futureCounts = Array(10).fill(1);
        for (let col = 0; col < 10; col++) {
          let y = 1;
          for (let row = 0; row < actualRows; row++) {
            if (tValues[row] === "" || tValues[row] === null || tValues[row] === undefined) {
              continue;
            }
            const tVal = parseInt(tValues[row], 10);
            const isRed = col === tVal;
            
            y++;
            if (isRed) y = 1;
          }
          futureCounts[col] = y;
        }

        // 2. Scan left-to-right to find matches in the purple range
        const matches = [];
        for (let col = 0; col < 10; col++) {
          const val = futureCounts[col];
          if (val >= purpleRangeFrom && val <= purpleRangeTo) {
            matches.push(col);
          }
        }

        // 3. Put into slots sequentially up to requiredCount
        const slots = [];
        for (let k = 0; k < requiredCount; k++) {
          if (k < matches.length) {
            slots.push(matches[k]);
          } else {
            slots.push(""); // empty slot
          }
        }

        // 4. Determine status
        let status = "Không số";
        let statusClass = "status-grey";
        if (matches.length >= requiredCount) {
          status = "Đủ số";
          statusClass = "status-green";
        } else if (matches.length > 0) {
          status = `Thiếu số (${matches.length}/${requiredCount})`;
          statusClass = "status-orange";
        }

        const globalTIndex = qIndex * 20 + tapIdx * 2 + tableIndex + 1;

        rows.push({
          globalTIndex,
          tapLabel: `Tập ${tapIdx + 1}`,
          tableLabel: `T${globalTIndex}`,
          futureCounts,
          slots,
          status,
          statusClass,
        });
      }
    }

    return rows;
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#fdfdfd" }}>
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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Navigation Toolbar & Configuration Area */}
        <div style={{ flexShrink: 0, padding: "20px" }}>
          
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
            
            {/* Quick Links */}
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
                onClick={() => (window.location.href = "/")}
                style={{ fontSize: "30px", background: "#28a745", color: "white", border: "none" }}
              >
                🔍 Về bảng tính
              </button>
              <button
                className="toolbar-btn"
                onClick={() => (window.location.href = "/input")}
                style={{ fontSize: "30px", background: "#17a2b8", color: "white", border: "none" }}
              >
                🔍 Về bảng thông
              </button>
              <button
                className="toolbar-btn"
                onClick={() => (window.location.href = "/chon-dong-thong")}
                style={{ fontSize: "30px", background: "#6f42c1", color: "white", border: "none" }}
              >
                🔍 Về chọn dòng thông
              </button>
              {accessWarningContent}
              {saveStatus && (
                <span style={{ color: "#28a745", fontSize: "20px", fontWeight: "bold", marginLeft: "10px" }}>
                  {saveStatus}
                </span>
              )}
            </div>

            {/* Q selector */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {Array.from({ length: 5 }, (_, i) => {
                const num = i + 1;
                const isSelected = selectedQ === num;
                return (
                  <button
                    key={num}
                    onClick={() => setSelectedQ(num)}
                    style={{
                      padding: "8px 16px",
                      fontSize: "24px",
                      fontWeight: "bold",
                      borderRadius: "6px",
                      border: "2px solid #007bff",
                      cursor: "pointer",
                      background: isSelected ? "#007bff" : "white",
                      color: isSelected ? "white" : "#007bff",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Q{num}
                  </button>
                );
              })}
            </div>

          </div>

          {/* Config form */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "24px",
              padding: "16px 24px",
              border: "2px dashed #ffc107",
              borderRadius: "8px",
              backgroundColor: "#fffdf5",
              maxWidth: "1000px",
              margin: "0 auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "24px", fontWeight: "bold" }}>Khoảng báo màu:</span>
              <input
                type="number"
                value={purpleRangeFrom}
                onChange={(e) => setPurpleRangeFrom(parseInt(e.target.value) || 0)}
                style={{ width: "80px", padding: "6px", fontSize: "22px", textAlign: "center" }}
              />
              <span style={{ fontSize: "24px" }}>đến</span>
              <input
                type="number"
                value={purpleRangeTo}
                onChange={(e) => setPurpleRangeTo(parseInt(e.target.value) || 0)}
                style={{ width: "80px", padding: "6px", fontSize: "22px", textAlign: "center" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "24px", fontWeight: "bold" }}>Số lượng ô số toán:</span>
              <input
                type="number"
                min="1"
                max="10"
                value={requiredCount}
                onChange={(e) => setRequiredCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                style={{ width: "60px", padding: "6px", fontSize: "22px", textAlign: "center" }}
              />
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              style={{
                padding: "8px 24px",
                fontSize: "24px",
                fontWeight: "bold",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              💾 Lưu Cài Đặt
            </button>
          </div>

        </div>

        {/* Report Table Grid Area */}
        <div style={{ flex: 1, padding: "0 20px 20px 20px", overflowY: "auto", minHeight: 0 }}>
          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px" }}>
              <div className="spinner"></div>
              <p style={{ fontSize: "28px", marginTop: "20px" }}>Đang tải và tính toán...</p>
            </div>
          ) : error ? (
            <div style={{ color: "red", fontSize: "28px", textAlign: "center", padding: "50px" }}>
              {error}
            </div>
          ) : (
            <div
              style={{
                border: "2px solid #6f42c1",
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                backgroundColor: "white",
              }}
            >
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "24px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#6f42c1", color: "white" }}>
                    <th style={{ padding: "12px", border: "1px solid #ddd", width: "80px" }}>STT</th>
                    <th style={{ padding: "12px", border: "1px solid #ddd", width: "120px" }}>Tập</th>
                    <th style={{ padding: "12px", border: "1px solid #ddd", width: "120px" }}>Bảng T</th>
                    
                    {/* Spanned Header for warning results */}
                    <th colSpan={requiredCount} style={{ padding: "12px", border: "1px solid #ddd" }}>
                      Các ô số toán (quét trái ➔ phải trong khoảng {purpleRangeFrom}-{purpleRangeTo})
                    </th>

                    {/* Spanned Header for future counts */}
                    <th colSpan="10" style={{ padding: "12px", border: "1px solid #ddd" }}>
                      Số đếm gốc tại 10 cột (0 - 9)
                    </th>
                    
                    <th style={{ padding: "12px", border: "1px solid #ddd", width: "180px" }}>Trạng thái</th>
                  </tr>
                  <tr style={{ backgroundColor: "#f2edf8", fontSize: "18px" }}>
                    <th style={{ padding: "6px", border: "1px solid #ddd" }}></th>
                    <th style={{ padding: "6px", border: "1px solid #ddd" }}></th>
                    <th style={{ padding: "6px", border: "1px solid #ddd" }}></th>
                    
                    {/* Dynamic subheaders for slots */}
                    {Array.from({ length: requiredCount }).map((_, idx) => (
                      <th key={idx} style={{ padding: "6px", border: "1px solid #ddd", width: "80px" }}>
                        Ô {idx + 1}
                      </th>
                    ))}

                    {/* Subheaders for digits 0-9 */}
                    {Array.from({ length: 10 }).map((_, idx) => (
                      <th key={idx} style={{ padding: "6px", border: "1px solid #ddd", width: "70px" }}>
                        {idx}
                      </th>
                    ))}
                    
                    <th style={{ padding: "6px", border: "1px solid #ddd" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((row, index) => {
                    return (
                      <tr
                        key={row.globalTIndex}
                        style={{
                          backgroundColor: index % 2 === 0 ? "#ffffff" : "#fcfcff",
                          borderBottom: "1px solid #eee",
                          textAlign: "center",
                        }}
                      >
                        <td style={{ padding: "12px", border: "1px solid #ddd", fontWeight: "bold" }}>
                          {String(index + 1).padStart(2, "0")}
                        </td>
                        <td style={{ padding: "12px", border: "1px solid #ddd", fontWeight: "600" }}>
                          {row.tapLabel}
                        </td>
                        <td style={{ padding: "12px", border: "1px solid #ddd", fontWeight: "bold", color: "#6f42c1" }}>
                          {row.tableLabel}
                        </td>
                        
                        {/* Dynamic slots output */}
                        {row.slots.map((val, idx) => {
                          const hasVal = val !== "";
                          return (
                            <td
                              key={idx}
                              style={{
                                padding: "12px",
                                border: "1px solid #ddd",
                                fontWeight: "bold",
                                backgroundColor: hasVal ? "#fd7e14" : "transparent",
                                color: hasVal ? "white" : "#777",
                                fontSize: "28px",
                              }}
                            >
                              {val}
                            </td>
                          );
                        })}

                        {/* Counts 0-9 output */}
                        {row.futureCounts.map((val, idx) => {
                          const isWarning = val >= purpleRangeFrom && val <= purpleRangeTo;
                          return (
                            <td
                              key={idx}
                              style={{
                                padding: "12px",
                                border: "1px solid #ddd",
                                fontSize: "20px",
                                color: isWarning ? "#d91e18" : "#333",
                                backgroundColor: isWarning ? "#fff3cd" : "transparent",
                                fontWeight: isWarning ? "bold" : "normal",
                              }}
                            >
                              {val}
                            </td>
                          );
                        })}

                        {/* Status Label */}
                        <td style={{ padding: "12px", border: "1px solid #ddd", fontWeight: "bold" }}>
                          <span className={`status-badge ${row.statusClass}`}>
                            {row.status}
                          </span>
                        </td>
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
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          color: white;
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          min-width: 100px;
        }
        .status-green {
          background-color: #28a745;
        }
        .status-orange {
          background-color: #fd7e14;
        }
        .status-grey {
          background-color: #6c757d;
        }
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
      `}</style>
    </div>
  );
}

export default ColorReportPage;
