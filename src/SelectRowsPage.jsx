import { useCallback, useEffect, useState } from "react";
import "./App.css";
import "./InputPage.css";
import { loadPageData, savePageData } from "./dataService";

const ROWS = 5000;
const COLS = 11;
const GRID_ROWS = 10;
const MAX_PER_ROW = 4;
const LAST_SELECTED_ROW_KEY = "ktop_select_last_row";

function SelectRowsPage({ accessWarningContent = null }) {
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
  const [dateValues, setDateValues] = useState(Array(ROWS).fill(""));
  const [zValues, setZValues] = useState(Array(ROWS).fill(""));
  const [deletedRows, setDeletedRows] = useState(Array(ROWS).fill(false));
  const [purpleRangeFrom, setPurpleRangeFrom] = useState(0);
  const [purpleRangeTo, setPurpleRangeTo] = useState(0);
  const [keepLastNRows, setKeepLastNRows] = useState(110);
  const [queue, setQueue] = useState([]);
  const [highlightedRows, setHighlightedRows] = useState(() => {
    const savedRow = parseInt(localStorage.getItem(LAST_SELECTED_ROW_KEY), 10);
    return !Number.isNaN(savedRow) && savedRow >= 0 && savedRow < ROWS
      ? { [savedRow]: true }
      : {};
  });
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isAddingToCalc, setIsAddingToCalc] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showDeleteFirstRowModal, setShowDeleteFirstRowModal] = useState(false);
  const [showDeleteLastRowModal, setShowDeleteLastRowModal] = useState(false);
  const [showDeleteByRowsModal, setShowDeleteByRowsModal] = useState(false);
  const [deleteOption, setDeleteOption] = useState("all");
  const [deleteRowFrom, setDeleteRowFrom] = useState("");
  const [deleteRowTo, setDeleteRowTo] = useState("");
  const [transferDate, setTransferDate] = useState(
    () =>
      localStorage.getItem("lastTransferDate") ||
      new Date().toISOString().split("T")[0],
  );
  const [lastBatch, setLastBatch] = useState(() => {
    const saved = localStorage.getItem("lastBatchInfo");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const result = await loadPageData("master_draft");

      if (result.success && result.data) {
        const data = result.data;
        setAllQData(
          data.allQData ||
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
        setDateValues(data.dateValues || Array(ROWS).fill(""));
        setZValues(data.zValues || Array(ROWS).fill(""));
        setDeletedRows(data.deletedRows || Array(ROWS).fill(false));
        setPurpleRangeFrom(data.purpleRangeFrom || 0);
        setPurpleRangeTo(data.purpleRangeTo || 0);
        setKeepLastNRows(Math.min(data.keepLastNRows || 110, ROWS));
      }

      setIsLoading(false);
    };

    loadData();
  }, []);

  const saveDraft = useCallback(
    async (nextDeletedRows = deletedRows, nextKeepLastNRows = keepLastNRows) => {
      return savePageData(
        "master_draft",
        null,
        null,
        zValues,
        dateValues,
        nextDeletedRows,
        null,
        purpleRangeFrom,
        purpleRangeTo,
        nextKeepLastNRows,
        allQData,
      );
    },
    [
      allQData,
      dateValues,
      deletedRows,
      keepLastNRows,
      purpleRangeFrom,
      purpleRangeTo,
      zValues,
    ],
  );

  const hasRowData = useCallback(
    (rowIndex) => {
      if (dateValues[rowIndex] || zValues[rowIndex]) return true;
      return allQData.some((qData) => {
        if (qData && qData.tapsData) {
          return qData.tapsData.some(
            (tap) => tap?.aValues[rowIndex] || tap?.bValues[rowIndex]
          );
        }
        return false;
      });
    },
    [allQData, dateValues, zValues],
  );



  const formatStt = (value) => String(value).padStart(2, "0");

  const formatDisplayDate = (value) => {
    if (!value) return "";
    const text = String(value);
    if (text.includes("/")) return text;
    const parts = text.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return text;
  };

  const handleSelectRow = useCallback(
    (rowIndex) => {
      if (deletedRows[rowIndex]) {
        alert(`Dòng ${formatStt(rowIndex)} đã bị xóa, không thể chọn!`);
        return;
      }

      const count = queue.filter((item) => item.rowIndex === rowIndex).length;
      if (count >= MAX_PER_ROW) {
        alert(
          `Dòng ${formatStt(rowIndex)} đã đạt tối đa ${MAX_PER_ROW} lần trong dòng đợi!`,
        );
        return;
      }

      setQueue((prev) => [...prev, { rowIndex, displaySTT: rowIndex }]);
      localStorage.setItem(LAST_SELECTED_ROW_KEY, String(rowIndex));
      setHighlightedRows({ [rowIndex]: true });
    },
    [deletedRows, queue],
  );

  const handleRemoveFromQueue = useCallback((queueIndex) => {
    setQueue((prev) => prev.filter((_, index) => index !== queueIndex));
  }, []);

  const handleClearQueue = useCallback(() => {
    setQueue([]);
  }, []);





  const confirmDeleteAll = async () => {
    const nextDeletedRows = Array(ROWS).fill(true);
    const emptyAllQData = Array(5)
      .fill(null)
      .map(() => ({
        tapsData: Array(10)
          .fill(null)
          .map(() => ({
            aValues: Array(ROWS).fill(""),
            bValues: Array(ROWS).fill(""),
          })),
      }));

    setDeletedRows(nextDeletedRows);
    setAllQData(emptyAllQData);
    setZValues(Array(ROWS).fill(""));
    setDateValues(Array(ROWS).fill(""));
    setQueue([]);

    await savePageData(
      "master_draft",
      null,
      null,
      Array(ROWS).fill(""),
      Array(ROWS).fill(""),
      nextDeletedRows,
      null,
      purpleRangeFrom,
      purpleRangeTo,
      keepLastNRows,
      emptyAllQData,
    );

    setShowDeleteAllModal(false);
    alert("Đã xóa tất cả dữ liệu Bảng chọn dòng thông!");
  };

  const handleDeleteFirstRow = async () => {
    const firstRowIndex = Array.from({ length: ROWS }, (_, i) => i).find(
      (rowIndex) => !deletedRows[rowIndex] && hasRowData(rowIndex),
    );

    if (firstRowIndex === undefined) {
      alert("Không có dòng nào để xóa!");
      setShowDeleteFirstRowModal(false);
      return;
    }

    const nextDeletedRows = [...deletedRows];
    nextDeletedRows[firstRowIndex] = true;
    setDeletedRows(nextDeletedRows);
    await saveDraft(nextDeletedRows);
    setShowDeleteFirstRowModal(false);
    alert("Đã xóa dòng cũ nhất!");
  };

  const handleDeleteLastRow = async () => {
    let lastRowIndex = -1;
    for (let i = ROWS - 1; i >= 0; i--) {
      if (!deletedRows[i] && hasRowData(i)) {
        lastRowIndex = i;
        break;
      }
    }

    if (lastRowIndex === -1) {
      alert("Không có dòng nào để xóa!");
      setShowDeleteLastRowModal(false);
      return;
    }

    const nextDeletedRows = [...deletedRows];
    nextDeletedRows[lastRowIndex] = true;
    setDeletedRows(nextDeletedRows);
    await saveDraft(nextDeletedRows);
    setShowDeleteLastRowModal(false);
    alert("Đã xóa dòng mới nhất!");
  };

  const confirmDeleteByRows = async () => {
    const from = parseInt(deleteRowFrom);
    const to = parseInt(deleteRowTo);

    if (isNaN(from) || isNaN(to) || from < 0 || to < from || to >= ROWS) {
      alert("Dãy STT không hợp lệ!");
      return;
    }

    const nextDeletedRows = [...deletedRows];
    let count = 0;
    for (let rowIndex = from; rowIndex <= to; rowIndex++) {
      if (!nextDeletedRows[rowIndex]) {
        nextDeletedRows[rowIndex] = true;
        count++;
      }
    }

    setDeletedRows(nextDeletedRows);
    setQueue((prev) =>
      prev.filter(
        (item) => item.rowIndex < from || item.rowIndex > to,
      ),
    );
    await saveDraft(nextDeletedRows);
    setShowDeleteByRowsModal(false);
    alert(`Đã xóa ${count} dòng theo STT!`);
  };

  const handleDelete = () => {
    if (deleteOption === "all") {
      setShowDeleteModal(false);
      setShowDeleteAllModal(true);
      return;
    }

    if (deleteOption === "firstRow") {
      setShowDeleteModal(false);
      setShowDeleteFirstRowModal(true);
      return;
    }

    if (deleteOption === "lastRow") {
      setShowDeleteModal(false);
      setShowDeleteLastRowModal(true);
      return;
    }

    if (deleteOption === "rows") {
      if (!deleteRowFrom || !deleteRowTo) {
        alert("Vui lòng nhập STT!");
        return;
      }
      setShowDeleteModal(false);
      setShowDeleteByRowsModal(true);
    }
  };

  const handleConfirmAddToApp = async () => {
    const selectedIndices = queue.map((item) => item.rowIndex);
    if (selectedIndices.length === 0) {
      alert("Vui lòng chọn ít nhất một dòng!");
      return;
    }

    setIsAddingToCalc(true);
    setSaveStatus("Đang thêm dòng vào bảng tính...");

    try {
      for (const rowIndex of [...new Set(selectedIndices)]) {
        let hasValueInAnyQ = false;
        for (let q = 0; q < 5; q++) {
          const qData = allQData[q];
          if (qData && qData.tapsData) {
            for (let tap = 0; tap < 10; tap++) {
              if (
                String(qData.tapsData[tap]?.aValues[rowIndex] || "").trim() !== "" ||
                String(qData.tapsData[tap]?.bValues[rowIndex] || "").trim() !== ""
              ) {
                hasValueInAnyQ = true;
                break;
              }
            }
          }
          if (hasValueInAnyQ) break;
        }

        if (!hasValueInAnyQ) {
          alert(`Dòng thông ${formatStt(rowIndex)} đang trống A và B!`);
          setIsAddingToCalc(false);
          setSaveStatus("");
          return;
        }
      }

      const currentData = await loadPageData("q_all");
      const existingPurpleFrom =
        currentData.success && currentData.data
          ? currentData.data.purpleRangeFrom
          : 0;
      const existingPurpleTo =
        currentData.success && currentData.data
          ? currentData.data.purpleRangeTo
          : 0;
      const existingKeepN =
        currentData.success && currentData.data
          ? currentData.data.keepLastNRows || 110
          : 110;
      const existingPageLabel =
        currentData.success && currentData.data
          ? currentData.data.pageLabel || ""
          : "";

      let activeAllQData = currentData.success && currentData.data?.allQData
        ? JSON.parse(JSON.stringify(currentData.data.allQData))
        : Array(5).fill(null).map(() => ({
            tapsData: Array(10).fill(null).map(() => ({
              aValues: Array(ROWS).fill(""),
              bValues: Array(ROWS).fill(""),
            })),
          }));

      let activeZ = [];
      let activeD = [];
      let activeDel = [];
      let activeSourceSTT = [];

      let newAllQData = Array(5).fill(null).map(() => ({
        tapsData: Array(10).fill(null).map(() => ({
          aValues: [],
          bValues: [],
        })),
      }));

      if (currentData.success && currentData.data) {
        const data = currentData.data;
        const zVals = data.zValues || [];
        const dVals = data.dateValues || [];
        const delFlags = data.deletedRows || [];
        const sourceVals = data.sourceSTTValues || [];

        for (let rowIndex = 0; rowIndex < zVals.length; rowIndex++) {
          let hasAnyData =
            String(zVals[rowIndex] || "").trim() !== "" ||
            String(dVals[rowIndex] || "").trim() !== "";

          if (!hasAnyData) {
            for (let q = 0; q < 5; q++) {
              const taps = activeAllQData[q]?.tapsData || [];
              for (let tapIdx = 0; tapIdx < 10; tapIdx++) {
                if (
                  String(taps[tapIdx]?.aValues[rowIndex] || "").trim() !== "" ||
                  String(taps[tapIdx]?.bValues[rowIndex] || "").trim() !== ""
                ) {
                  hasAnyData = true;
                  break;
                }
              }
              if (hasAnyData) break;
            }
          }

          if (hasAnyData) {
            activeZ.push(zVals[rowIndex] || "");
            activeD.push(dVals[rowIndex] || "");
            activeDel.push(delFlags[rowIndex] === undefined ? false : delFlags[rowIndex]);
            activeSourceSTT.push(sourceVals[rowIndex] || "");
            for (let q = 0; q < 5; q++) {
              for (let tapIdx = 0; tapIdx < 10; tapIdx++) {
                newAllQData[q].tapsData[tapIdx].aValues.push(activeAllQData[q]?.tapsData?.[tapIdx]?.aValues[rowIndex] || "");
                newAllQData[q].tapsData[tapIdx].bValues.push(activeAllQData[q]?.tapsData?.[tapIdx]?.bValues[rowIndex] || "");
              }
            }
          }
        }
      }

      selectedIndices.forEach((rowIndex) => {
        activeZ.push("");
        activeD.push(transferDate);
        activeDel.push(false);
        activeSourceSTT.push(formatStt(rowIndex));

        for (let q = 0; q < 5; q++) {
          for (let tapIdx = 0; tapIdx < 10; tapIdx++) {
            const draftTap = allQData[q]?.tapsData?.[tapIdx];
            newAllQData[q].tapsData[tapIdx].aValues.push(draftTap?.aValues[rowIndex] || "");
            newAllQData[q].tapsData[tapIdx].bValues.push(draftTap?.bValues[rowIndex] || "");
          }
        }
      });

      let activeCount = activeDel.filter(val => !val).length;
      if (activeCount > existingKeepN) {
        const excess = activeCount - existingKeepN;
        let marked = 0;
        for (let k = 0; k < activeDel.length; k++) {
          if (!activeDel[k]) {
            activeDel[k] = true;
            marked++;
            if (marked === excess) break;
          }
        }
      }

      while (activeZ.length < ROWS) {
        activeZ.push("");
        activeD.push("");
        activeDel.push(true);
        activeSourceSTT.push("");
        for (let q = 0; q < 5; q++) {
          for (let tapIdx = 0; tapIdx < 10; tapIdx++) {
            newAllQData[q].tapsData[tapIdx].aValues.push("");
            newAllQData[q].tapsData[tapIdx].bValues.push("");
          }
        }
      }

      await savePageData(
        "q_all",
        null,
        null,
        activeZ,
        activeD,
        activeDel,
        activeSourceSTT,
        existingPurpleFrom,
        existingPurpleTo,
        existingKeepN,
        newAllQData,
        existingPageLabel,
        undefined,
      );

      const batchInfo = {
        stts: selectedIndices.map(formatStt),
        zValues: selectedIndices.map((rowIndex) => zValues[rowIndex] || ""),
        date: transferDate,
      };
      localStorage.setItem("lastBatchInfo", JSON.stringify(batchInfo));
      localStorage.setItem("lastTransferDate", transferDate);
      setLastBatch(batchInfo);
      setQueue([]);
      setShowAddModal(false);
      setShowSuccessModal(true);
      setSaveStatus("Đã thêm mới vào bảng tính!");
    } catch (error) {
      console.error("Error adding rows:", error);
      alert("Lỗi trong quá trình thêm!");
    } finally {
      setIsAddingToCalc(false);
      setTimeout(() => setSaveStatus(""), 2000);
    }
  };

  const renderQueue = () => {
    if (queue.length === 0) return null;

    return (
      <div
        style={{
          margin: "10px 0",
          padding: "10px 15px",
          background: "#fff3e0",
          border: "2px solid #fd7e14",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "6px",
        }}
      >
        <span style={{ fontSize: "36px", fontWeight: 500, marginRight: "6px", color: "#222" }}>
          Dòng đợi:
        </span>
        {queue.map((item, index) => (
          <span key={`${item.rowIndex}-${index}`} style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
            {index > 0 && <span style={{ fontSize: "36px", color: "#888" }}>→</span>}
            <span
              style={{
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                background: "#a8d5a2",
                color: "#222",
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "44px",
                fontWeight: 500,
                position: "relative",
              }}
            >
              <span>{formatStt(item.displaySTT)}</span>
              <span style={{ fontSize: "44px", fontWeight: 500, opacity: 0.9 }}>L{index + 1}</span>
              <button
                onClick={() => handleRemoveFromQueue(index)}
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  background: "#dc3545",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "14px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  lineHeight: 1,
                  padding: 0,
                }}
                title="Xóa khỏi dòng đợi"
              >
                ×
              </button>
            </span>
          </span>
        ))}
        <button
          onClick={handleClearQueue}
          style={{
            marginLeft: "10px",
            background: "#dc3545",
            color: "#222",
            border: "none",
            borderRadius: "6px",
            padding: "6px 16px",
            fontSize: "36px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Xóa hết
        </button>
      </div>
    );
  };

  const renderCell = (rowIndex) => {
    const isDeleted = deletedRows[rowIndex];
    const isHighlighted = !!highlightedRows[rowIndex];

    return (
      <td key={rowIndex} style={{ padding: "4px" }}>
        <button
          type="button"
          onClick={() => handleSelectRow(rowIndex)}
          disabled={isDeleted}
          style={{
            width: "100%",
            minWidth: "70px",
            height: "60px",
            borderRadius: "6px",
            border: isHighlighted ? "3px solid #dc3545" : "1px solid #cfcfcf",
            background: isHighlighted ? "#ffeb3b" : "#f4f5f5",
            color: "#222",
            cursor: isDeleted ? "not-allowed" : "pointer",
            fontSize: "44px",
            fontWeight: 500,
            position: "relative",
          }}
          title={`Chọn dòng thông ${formatStt(rowIndex)}`}
        >
          {formatStt(rowIndex)}
        </button>
      </td>
    );
  };

  if (isLoading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <div className="spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <div
        style={{
          flexShrink: 0,
          width: "100%",
          textAlign: "center",
          backgroundColor: "#f8f9fa",
          borderBottom: "2px solid #dee2e6",
          zIndex: 100,
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

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#ffffff" }}>
        <div style={{ flexShrink: 0, padding: "20px 20px 0 20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              marginTop: "10px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                justifyContent: "center",
                border: "3px solid #007bff",
                padding: "10px 15px",
                borderRadius: "8px",
                backgroundColor: "#e7f3ff",
                flexWrap: "wrap",
              }}
            >
              <button
                className="toolbar-btn"
                onClick={() => setShowAddModal(true)}
                style={{ fontSize: "30px", background: "#6f42c1", color: "white", border: "none" }}
              >
                ➕ Chọn dòng thông và nhập ngày tháng năm
              </button>
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
                onClick={() => (window.location.href = "/bao-mau")}
                style={{ fontSize: "30px", background: "#ffc107", color: "#212529", border: "none", fontWeight: "bold" }}
              >
                🎨 Về bảng màu
              </button>
              {accessWarningContent}
              {saveStatus && (
                <span style={{ color: "#28a745", fontSize: "18px", marginLeft: "10px" }}>
                  {saveStatus}
                </span>
              )}
            </div>
          </div>

          {renderQueue()}
        </div>

        <div style={{ flex: 1, padding: "10px 20px 20px 20px", overflowY: "auto", minHeight: 0 }}>
          <div
            style={{
              border: "2px solid #198754",
              borderRadius: "8px",
              padding: "14px",
              background: "#f8fff9",
              overflowX: "auto",
            }}
          >
            <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%" }}>
              <tbody>
                {Array.from({ length: GRID_ROWS }).map((_, row) => (
                  <tr key={row}>
                    {Array.from({ length: COLS }).map((__, col) => {
                      const rowIndex = col * GRID_ROWS + row;
                      return renderCell(rowIndex);
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "1100px", width: "95%" }}>
            <h2 style={{ fontSize: "56px", marginBottom: "28px", fontWeight: "bold" }}>
              Thông báo
            </h2>

            <div
              style={{
                marginBottom: "20px",
                padding: "15px",
                background: "#e3f2fd",
                borderRadius: "8px",
                border: "1px solid #90caf9",
                fontSize: "40px",
              }}
            >
              <strong>Lần chọn trước:</strong>
              <div style={{ marginTop: "10px" }}>
                {!lastBatch ? (
                  "Chưa có lịch sử chuyển dòng trong phiên làm việc này."
                ) : (
                  <div>
                    Ngày chuyển:{" "}
                    <span style={{ color: "#1976d2", fontWeight: "bold" }}>
                      {formatDisplayDate(lastBatch.date)}
                    </span>
                    <div style={{ marginTop: "10px", color: "#1976d2", fontWeight: "bold", fontSize: "42px" }}>
                      STT: {lastBatch.stts?.join(", ")}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                maxHeight: "150px",
                overflowY: "auto",
                border: "1px solid #ddd",
                padding: "10px",
                marginBottom: "20px",
                fontSize: "40px",
              }}
            >
              <p>Lần chọn mới:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
                {queue.length > 0 ? (
                  queue.map((item, index) => (
                    <span key={`${item.rowIndex}-${index}`} style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
                      {index > 0 && <span style={{ fontSize: "32px", color: "#888" }}>→</span>}
                      <span
                        style={{
                          background: "#fd7e14",
                          color: "white",
                          borderRadius: "6px",
                          padding: "3px 10px",
                          fontSize: "36px",
                          fontWeight: "bold",
                        }}
                      >
                        {formatStt(item.rowIndex)}
                      </span>
                    </span>
                  ))
                ) : (
                  <span style={{ color: "#999" }}>Chưa chọn dòng nào!</span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: "20px", padding: "15px", background: "#f0f0f0", borderRadius: "8px" }}>
              <label style={{ fontSize: "40px", fontWeight: "bold", display: "block", marginBottom: "10px" }}>
                Chọn ngày để lưu vào bảng tính:
              </label>
              <input
                type="date"
                value={transferDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setTransferDate(value);
                  localStorage.setItem("lastTransferDate", value);
                }}
                style={{
                  width: "100%",
                  padding: "10px",
                  fontSize: "36px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "space-between" }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ padding: "14px 28px", borderRadius: "8px", border: "1px solid #ccc", background: "white", fontSize: "36px" }}
              >
                Chọn lại
              </button>
              <button
                onClick={handleConfirmAddToApp}
                disabled={isAddingToCalc || queue.length === 0}
                style={{
                  padding: "14px 28px",
                  borderRadius: "8px",
                  background: "#6f42c1",
                  color: "white",
                  border: "none",
                  fontSize: "36px",
                  cursor: isAddingToCalc ? "not-allowed" : "pointer",
                  opacity: isAddingToCalc ? 0.7 : 1,
                }}
              >
                {isAddingToCalc ? "Đang thêm..." : "OK chọn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px", width: "90%", textAlign: "center", padding: "40px 20px" }}>
            <h2 style={{ fontSize: "40px", fontWeight: "bold", marginBottom: "20px", color: "#000" }}>
              THÀNH CÔNG!
            </h2>
            <p style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "40px", color: "#000" }}>
              Đã thêm dữ liệu vào bảng tính thành công.
            </p>
            <button
              onClick={() => (window.location.href = "/q1")}
              style={{
                width: "100%",
                padding: "20px",
                borderRadius: "15px",
                background: "#000",
                color: "white",
                fontSize: "32px",
                fontWeight: "bold",
                border: "none",
                cursor: "pointer",
              }}
            >
              OK TOÁN VỀ BẢNG TÍNH
            </button>
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                marginTop: "20px",
                background: "none",
                border: "none",
                color: "#333",
                fontSize: "22px",
                fontWeight: "bold",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Ở lại trang này
            </button>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()} style={{ maxWidth: "600px", width: "95%" }}>
            <h3 style={{ fontSize: "24px", marginBottom: "20px" }}>
              Xóa dữ liệu Bảng chọn dòng thông
            </h3>
            <div className="modal-body">
              <div className="radio-group" style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                {[
                  ["all", "Xóa tất cả dữ liệu"],
                  ["firstRow", "Xóa dòng cũ nhất"],
                  ["lastRow", "Xóa dòng mới nhất"],
                  ["rows", "Xóa theo khoảng STT dòng"],
                ].map(([value, label]) => (
                  <label key={value} style={{ fontSize: "22px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <input
                      type="radio"
                      value={value}
                      checked={deleteOption === value}
                      onChange={(event) => setDeleteOption(event.target.value)}
                      style={{ width: "22px", height: "22px" }}
                    />
                    {label}
                  </label>
                ))}

                {deleteOption === "rows" && (
                  <div style={{ paddingLeft: "35px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="number"
                      min="0"
                      max="109"
                      placeholder="Từ STT"
                      value={deleteRowFrom}
                      onChange={(event) => setDeleteRowFrom(event.target.value)}
                      style={{ width: "100px", fontSize: "18px", padding: "5px" }}
                    />
                    <span>đến</span>
                    <input
                      type="number"
                      min="0"
                      max="109"
                      placeholder="Đến STT"
                      value={deleteRowTo}
                      onChange={(event) => setDeleteRowTo(event.target.value)}
                      style={{ width: "100px", fontSize: "18px", padding: "5px" }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ padding: "8px 16px", fontSize: "18px" }}>
                Hủy
              </button>
              <button
                onClick={handleDelete}
                style={{ padding: "8px 16px", fontSize: "18px", background: "#dc3545", color: "white", border: "none", borderRadius: "4px" }}
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAllModal && (
        <ConfirmModal
          title="Xác nhận xóa tất cả dữ liệu Bảng chọn dòng thông?"
          onCancel={() => setShowDeleteAllModal(false)}
          onConfirm={confirmDeleteAll}
        />
      )}
      {showDeleteFirstRowModal && (
        <ConfirmModal
          title="Xác nhận xóa dòng cũ nhất?"
          onCancel={() => setShowDeleteFirstRowModal(false)}
          onConfirm={handleDeleteFirstRow}
        />
      )}
      {showDeleteLastRowModal && (
        <ConfirmModal
          title="Xác nhận xóa dòng mới nhất?"
          onCancel={() => setShowDeleteLastRowModal(false)}
          onConfirm={handleDeleteLastRow}
        />
      )}
      {showDeleteByRowsModal && (
        <ConfirmModal
          title={`Xác nhận xóa dữ liệu từ STT ${deleteRowFrom} đến ${deleteRowTo}?`}
          onCancel={() => setShowDeleteByRowsModal(false)}
          onConfirm={confirmDeleteByRows}
        />
      )}
    </div>
  );
}

function ConfirmModal({ title, onCancel, onConfirm }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ textAlign: "center" }}>
        <h3 style={{ fontSize: "22px" }}>{title}</h3>
        <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "10px" }}>
          <button onClick={onCancel} style={{ padding: "8px 16px", fontSize: "18px" }}>
            Hủy
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: "8px 16px", fontSize: "18px", background: "#dc3545", color: "white", border: "none" }}
          >
            Xác nhận Xóa
          </button>
        </div>
      </div>
    </div>
  );
}

export default SelectRowsPage;
