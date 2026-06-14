import { useState, useEffect, useMemo, memo, useCallback, Fragment } from "react";
import "./App.css";
import "./InputPage.css";
import { savePageData, loadPageData } from "./dataService";

const TaskRow = memo(
  ({
    rowIndex,
    displayRowNumber,
    isDeleted,
    isSelected,
    zValue,
    allQData,
    onToggleSelect,
    onZChange,
    onAChange,
    onBChange,
    highlightedQCols,
    highlightedRows,
    highlightedCells,
    onColClick,
    onRowClick,
    onCellClick,
  }) => {
    const isRowHL = !!highlightedRows[rowIndex];
    return (
      <tr className={isSelected ? "selected-draft-row" : ""}>
        <td
          className={isRowHL ? "draft-row-highlighted" : ""}
          style={{
            textAlign: "center",
            width: "60px !important",
            minWidth: "60px !important",
            padding: 0,
          }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(rowIndex)}
            disabled={isDeleted}
            style={{ transform: "scale(4.2)", cursor: "pointer" }}
          />
        </td>
        <td
          onClick={() => onRowClick(rowIndex)}
          className={isRowHL ? "draft-row-highlighted" : ""}
          style={{ textAlign: "center", fontSize: "35px", fontWeight: "bold", cursor: "pointer", userSelect: "none" }}
        >
          {String(displayRowNumber).padStart(2, "0")}
        </td>
        <td
          style={{ width: "200px", minWidth: "200px" }}
          className={isRowHL ? "draft-row-highlighted" : ""}
        >
          <input
            type="text"
            className="cell-input"
            maxLength={10}
            value={isDeleted ? "" : zValue || ""}
            onChange={(e) => onZChange(rowIndex, e.target.value)}
            disabled={isDeleted}
            style={{ textAlign: "center", width: "100%", padding: "8px", fontSize: "35px", fontWeight: "500", color: "#222" }}
          />
        </td>
        {Array.from({ length: 10 }).map((_, qIndex) => {
          const qData = allQData[qIndex];
          const aV = isDeleted ? "" : qData?.aValues[rowIndex] || "";
          const bV = isDeleted ? "" : qData?.bValues[rowIndex] || "";
          const baseColor = qIndex % 2 === 0 ? "#fff" : "#f1f1f1";
          const isColAHL = !!highlightedQCols[qIndex + "-a"];
          const isColBHL = !!highlightedQCols[qIndex + "-b"];
          const isCellAHL = !!highlightedCells[rowIndex]?.[qIndex]?.a;
          const isCellBHL = !!highlightedCells[rowIndex]?.[qIndex]?.b;
          const tdAClass = isCellAHL ? "draft-cell-highlighted" : isColAHL ? "draft-col-highlighted" : isRowHL ? "draft-row-highlighted" : "";
          const tdBClass = isCellBHL ? "draft-cell-highlighted" : isColBHL ? "draft-col-highlighted" : isRowHL ? "draft-row-highlighted" : "";
          return (
            <span key={qIndex} style={{ display: "contents" }}>
              <td
                onClick={() => onCellClick(rowIndex, qIndex, "a")}
                className={tdAClass}
                style={{ backgroundColor: tdAClass ? undefined : baseColor, borderRight: "2px solid #999", cursor: "pointer" }}
              >
                <input type="text" className="cell-input small" value={aV} onChange={(e) => onAChange(qIndex, rowIndex, e.target.value)} disabled={isDeleted} />
              </td>
              <td
                onClick={() => onCellClick(rowIndex, qIndex, "b")}
                className={tdBClass}
                style={{ backgroundColor: tdBClass ? undefined : baseColor, borderRight: "2px solid red", cursor: "pointer" }}
              >
                <input type="text" className="cell-input small" value={bV} onChange={(e) => onBChange(qIndex, rowIndex, e.target.value)} disabled={isDeleted} />
              </td>
            </span>
          );
        })}
        <td
          onClick={() => onRowClick(rowIndex)}
          className={isRowHL ? "draft-row-highlighted" : ""}
          style={{ textAlign: "center", fontSize: "35px", fontWeight: "bold", cursor: "pointer", userSelect: "none" }}
        >
          {String(displayRowNumber).padStart(2, "0")}
        </td>
        <td
          className={isRowHL ? "draft-row-highlighted" : ""}
          style={{ textAlign: "center", width: "80px !important", minWidth: "80px !important", padding: 0 }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(rowIndex)}
            disabled={isDeleted}
            style={{ transform: "scale(4.2)", cursor: "pointer" }}
          />
        </td>
      </tr>
    );
  },
);

function InputPage({ accessWarningContent = null }) {
  const MIN_ROWS = 5000; // Minimum rows
  const [keepLastNRows, setKeepLastNRows] = useState(110);
  const ROWS = MIN_ROWS;

  // State cho A, B của 10Q
  const [allQData, setAllQData] = useState(
    Array(10)
      .fill(null)
      .map(() => ({
        aValues: Array(ROWS).fill(""),
        bValues: Array(ROWS).fill(""),
      })),
  );

  const [dateValues, setDateValues] = useState(Array(ROWS).fill(""));
  const [zValues, setZValues] = useState(Array(ROWS).fill(""));
  const [deletedRows, setDeletedRows] = useState(Array(ROWS).fill(false));
  const [purpleRangeFrom, setPurpleRangeFrom] = useState(0);
  const [purpleRangeTo, setPurpleRangeTo] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const [selectedRows, setSelectedRows] = useState([]); // [rowIndex, ...] — giữ thứ tự click
  const [queue, setQueue] = useState([]); // [{ rowIndex, displaySTT }, ...]
  const MAX_PER_ROW = 4;
  // === Highlight states (giống bảng tính) ===
  const [highlightedQCols, setHighlightedQCols] = useState({}); // { qIndex: true } — multi-col
  const [highlightedRows, setHighlightedRows] = useState({});   // { rowIndex: true }
  const [highlightedCells, setHighlightedCells] = useState({}); // { rowIndex: { qIndex: { a, b } } }
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAddingToCalc, setIsAddingToCalc] = useState(false);
  const [transferDate, setTransferDate] = useState(() => {
    return (
      localStorage.getItem("lastTransferDate") ||
      new Date().toISOString().split("T")[0]
    );
  });

  // States for Deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteOption, setDeleteOption] = useState("all");
  const [deleteRowFrom, setDeleteRowFrom] = useState("");
  const [deleteRowTo, setDeleteRowTo] = useState("");

  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showDeleteFirstRowModal, setShowDeleteFirstRowModal] = useState(false);
  const [showDeleteLastRowModal, setShowDeleteLastRowModal] = useState(false);
  const [showDeleteByRowsModal, setShowDeleteByRowsModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Load data từ master_draft
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      const result = await loadPageData("master_draft");

      if (result.success && result.data) {
        const d = result.data;
        setAllQData(
          d.allQData ||
            Array(10)
              .fill(null)
              .map(() => ({
                aValues: Array(ROWS).fill(""),
                bValues: Array(ROWS).fill(""),
              })),
        );
        setDateValues(d.dateValues || Array(ROWS).fill(""));
        setZValues(d.zValues || Array(ROWS).fill(""));
        setDeletedRows(d.deletedRows || Array(ROWS).fill(false));
        setKeepLastNRows(d.keepLastNRows || 110);
        setPurpleRangeFrom(d.purpleRangeFrom || 0);
        setPurpleRangeTo(d.purpleRangeTo || 0);
      } else {
        // Khởi tạo bảng trống nếu chưa có master_draft
        setAllQData(
          Array(10)
            .fill(null)
            .map(() => ({
              aValues: Array(ROWS).fill(""),
              bValues: Array(ROWS).fill(""),
            })),
        );
        setDateValues(Array(ROWS).fill(""));
        setZValues(Array(ROWS).fill(""));
        setDeletedRows(Array(ROWS).fill(false));
      }
      setIsLoading(false);
    };

    loadData();
  }, []);

  // Helper để format STT thành dãy (VD: 049-051, 055)
  const formatSttRanges = (sttArray) => {
    if (!sttArray || sttArray.length === 0) return "";
    const sorted = sttArray.map(Number).sort((a, b) => a - b);
    const ranges = [];
    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        ranges.push(
          start === end
            ? String(start).padStart(2, "0")
            : `${String(start).padStart(2, "0")}-${String(end).padStart(2, "0")}`,
        );
        start = sorted[i];
        end = sorted[i];
      }
    }
    ranges.push(
      start === end
        ? String(start).padStart(2, "0")
        : `${String(start).padStart(2, "0")}-${String(end).padStart(2, "0")}`,
    );
    return "STT: " + ranges.join(", ");
  };

  // Auto scroll to target row on load
  useEffect(() => {
    if (!isLoading && dateValues.length > 0) {
      const timer = setTimeout(() => {
        let targetRowIndex =
          dateValues.length >= 50 ? 49 : dateValues.length - 1;

        let displayRowNumber = 0;
        for (let i = 0; i <= targetRowIndex; i++) {
          if (!deletedRows[i]) {
            displayRowNumber++;
          }
        }

        const rowElement = document.querySelector(
          `tbody tr:nth-child(${displayRowNumber})`,
        );

        if (rowElement) {
          rowElement.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          const tableContainer =
            document.querySelector(".schedule-table")?.parentElement;
          if (tableContainer) {
            tableContainer.scrollTo({
              top: tableContainer.scrollHeight * 0.4,
              behavior: "smooth",
            });
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, dateValues.length, deletedRows]);

  // Lấy thông tin lần chuyển cuối từ localStorage
  const [lastBatch, setLastBatch] = useState(() => {
    const saved = localStorage.getItem("lastBatchInfo");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (showAddModal) {
      const saved = localStorage.getItem("lastBatchInfo");
      setLastBatch(saved ? JSON.parse(saved) : null);
    }
  }, [showAddModal]);

  // Keep last N rows - hide all rows except last N rows with data
  const handleKeepLastNRows = async () => {
    const n = parseInt(keepLastNRows);

    if (!n || n <= 0) {
      alert("⚠️ Vui lòng nhập số dòng hợp lệ (> 0)");
      return;
    }

    // Use entered value as-is (no clamp)
    const adjustedN = n;

    const nonDeletedRowsWithData = [];
    for (let i = 0; i < dateValues.length; i++) {
      if (!deletedRows[i]) {
        let hasData =
          dateValues[i] !== "" &&
          dateValues[i] !== null &&
          dateValues[i] !== undefined;

        if (!hasData) {
          for (let qIndex = 0; qIndex < 10; qIndex++) {
            const a = allQData[qIndex]?.aValues[i];
            const b = allQData[qIndex]?.bValues[i];
            const z = zValues[i];
            if ((a && a !== "") || (b && b !== "") || (z && z !== "")) {
              hasData = true;
              break;
            }
          }
        }

        if (hasData) {
          nonDeletedRowsWithData.push(i);
        }
      }
    }

    if (nonDeletedRowsWithData.length === 0) {
      alert("⚠️ Không có dòng nào có dữ liệu (chưa xóa)!");
      return;
    }

    if (
      !confirm(
        `⚠️ Bạn có chắc muốn chỉ giữ lại ${adjustedN} dòng cuối cùng? Các dòng khác sẽ bị xóa.`,
      )
    ) {
      return;
    }

    // Keep only last adjustedN rows from non-deleted rows
    const rowsToKeep = nonDeletedRowsWithData.slice(-adjustedN);

    // Update deletedRows
    const newDeletedRows = [...deletedRows];
    for (let i = 0; i < dateValues.length; i++) {
      if (!deletedRows[i]) {
        if (!rowsToKeep.includes(i)) {
          newDeletedRows[i] = true;
        }
      }
    }

    setDeletedRows(newDeletedRows);

    // Save automatically
    setSaveStatus("💾 Đang lưu...");
    await savePageData(
      "master_draft",
      null,
      null,
      zValues,
      dateValues,
      newDeletedRows,
      null, // sourceSTTValues
      purpleRangeFrom,
      purpleRangeTo,
      adjustedN,
      allQData,
    );
    setSaveStatus("✅ Đã giữ " + adjustedN + " dòng cuối!");
    alert(`✅ Đã thực hiện giữ lại ${adjustedN} dòng cuối cùng!`);
    setTimeout(() => setSaveStatus(""), 2000);
  };

  const handleSave = async () => {
    setSaveStatus("💾 Đang lưu...");
    const result = await savePageData(
      "master_draft",
      null, // Not used directly in draft
      null,
      zValues,
      dateValues,
      deletedRows,
      null, // sourceSTTValues
      purpleRangeFrom,
      purpleRangeTo,
      keepLastNRows,
      allQData, // Truyền allQData
    );

    if (result.success) {
      setSaveStatus("✅ Đã lưu Master!");
      alert("✅ Đã lưu dữ liệu bảng thông thành công!");
    } else {
      setSaveStatus("⚠️ Lỗi!");
      alert("⚠️ Lỗi khi lưu vào Master: " + (result.error || "Không xác định"));
    }
    setTimeout(() => setSaveStatus(""), 2000);
  };

  // Helper function to format date to DD/MM/YYYY
  // formatDateSimple removed

  const handleToggleSelect = useCallback((rowIndex, currentQueue) => {
    setQueue((prev) => [...prev, { rowIndex, displaySTT: rowIndex }]);
    setHighlightedRows({ [rowIndex]: true });
  }, []);

  const handleAddToQueue = useCallback((currentQueue) => {
    if (selectedRows.length === 0) {
      alert("⚠️ Vui lòng chọn ít nhất một dòng!");
      return;
    }
    // Đếm số lần mỗi rowIndex đã có trong queue hiện tại
    const existingCounts = {};
    for (const item of currentQueue) {
      existingCounts[item.rowIndex] = (existingCounts[item.rowIndex] || 0) + 1;
    }
    const toAdd = [];
    const skipped = [];
    for (const rowIndex of selectedRows) {
      const count = existingCounts[rowIndex] || 0;
      if (count >= MAX_PER_ROW) {
        skipped.push(String(rowIndex).padStart(2, "0"));
      } else {
        toAdd.push({ rowIndex, displaySTT: rowIndex });
        existingCounts[rowIndex] = count + 1;
      }
    }
    if (toAdd.length > 0) {
      setQueue([...currentQueue, ...toAdd]);
    }
    if (skipped.length > 0) {
      alert(`⚠️ Dòng ${skipped.join(", ")} đã đạt tối đa ${MAX_PER_ROW} lần trong dòng đợi!`);
    }
    setSelectedRows([]);
  }, [selectedRows]);

  const handleRemoveFromQueue = useCallback((queueIndex) => {
    setQueue((prev) => prev.filter((_, i) => i !== queueIndex));
  }, []);

  const handleClearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  // === Highlight handlers (giống bảng tính) ===
  const handleRowClick = useCallback((rowIndex) => {
    setHighlightedRows((prev) => ({
      ...prev,
      [rowIndex]: !prev[rowIndex],
    }));
  }, []);

  const handleColClick = useCallback((qIndex) => {
    setHighlightedQCols((prev) => ({ ...prev, [qIndex]: !prev[qIndex] }));
  }, []);

  const handleCellClick = useCallback((rowIndex, qIndex, ab) => {
    setHighlightedCells((prev) => {
      const rowData = prev[rowIndex] || {};
      const qData = rowData[qIndex] || {};
      const newQ = { ...qData, [ab]: !qData[ab] };
      return { ...prev, [rowIndex]: { ...rowData, [qIndex]: newQ } };
    });
  }, []);

  const clearHighlights = useCallback(() => {
    setHighlightedQCols({});
    setHighlightedRows({});
    setHighlightedCells({});
  }, []);

  const handleZChange = useCallback((rIdx, val) => {
    if (val.length <= 10) {
      setZValues((prev) => {
        const next = [...prev];
        next[rIdx] = val;
        return next;
      });
    }
  }, []);

  // Date change has been removed

  const handleAChange = useCallback((qIdx, rIdx, val) => {
    setAllQData((prev) => {
      const next = [...prev];
      // Deep clone only the affected Q
      const updatedQ = {
        ...next[qIdx],
        aValues: [...next[qIdx].aValues],
      };
      updatedQ.aValues[rIdx] = val;
      next[qIdx] = updatedQ;
      return next;
    });
  }, []);

  const handleBChange = useCallback((qIdx, rIdx, val) => {
    setAllQData((prev) => {
      const next = [...prev];
      // Deep clone only the affected Q
      const updatedQ = {
        ...next[qIdx],
        bValues: [...next[qIdx].bValues],
      };
      updatedQ.bValues[rIdx] = val;
      next[qIdx] = updatedQ;
      return next;
    });
  }, []);

  // Deletion Handlers
  const handleDeleteFirstRow = async () => {
    let firstRowIndex = -1;
    for (let i = 0; i < dateValues.length; i++) {
      if (!deletedRows[i]) {
        let hasData = dateValues[i] !== "" || zValues[i] !== "";
        if (!hasData) {
          for (let q = 0; q < 10; q++) {
            if (allQData[q]?.aValues[i] || allQData[q]?.bValues[i]) {
              hasData = true;
              break;
            }
          }
        }
        if (hasData) {
          firstRowIndex = i;
          break;
        }
      }
    }

    if (firstRowIndex === -1) {
      alert("⚠️ Không có dòng nào để xóa!");
      setShowDeleteFirstRowModal(false);
      return;
    }

    const newDeletedRows = [...deletedRows];
    newDeletedRows[firstRowIndex] = true;
    setDeletedRows(newDeletedRows);

    await savePageData(
      "master_draft",
      null,
      null,
      zValues,
      dateValues,
      newDeletedRows,
      null, // sourceSTTValues
      purpleRangeFrom,
      purpleRangeTo,
      keepLastNRows,
      allQData,
    );

    setShowDeleteFirstRowModal(false);
    alert("✅ Đã xóa dòng cũ nhất!");
  };

  const handleDeleteLastRow = async () => {
    let lastRowIndex = -1;
    for (let i = dateValues.length - 1; i >= 0; i--) {
      if (!deletedRows[i]) {
        let hasData = dateValues[i] !== "" || zValues[i] !== "";
        if (!hasData) {
          for (let q = 0; q < 10; q++) {
            if (allQData[q]?.aValues[i] || allQData[q]?.bValues[i]) {
              hasData = true;
              break;
            }
          }
        }
        if (hasData) {
          lastRowIndex = i;
          break;
        }
      }
    }

    if (lastRowIndex === -1) {
      alert("⚠️ Không có dòng nào để xóa!");
      setShowDeleteLastRowModal(false);
      return;
    }

    const newDeletedRows = [...deletedRows];
    newDeletedRows[lastRowIndex] = true;
    setDeletedRows(newDeletedRows);

    await savePageData(
      "master_draft",
      null,
      null,
      zValues,
      dateValues,
      newDeletedRows,
      null, // sourceSTTValues
      purpleRangeFrom,
      purpleRangeTo,
      keepLastNRows,
      allQData,
    );

    setShowDeleteLastRowModal(false);
    alert("✅ Đã xóa dòng mới nhất!");
  };

  const confirmDeleteAll = async () => {
    const newDeletedRows = Array(dateValues.length).fill(true);
    setDeletedRows(newDeletedRows);

    await savePageData(
      "master_draft",
      null,
      null,
      Array(dateValues.length).fill(""),
      Array(dateValues.length).fill(""),
      newDeletedRows,
      null, // sourceSTTValues
      purpleRangeFrom,
      purpleRangeTo,
      keepLastNRows,
      Array(10)
        .fill(null)
        .map(() => ({
          aValues: Array(dateValues.length).fill(""),
          bValues: Array(dateValues.length).fill(""),
        })),
    );

    setAllQData(
      Array(10)
        .fill(null)
        .map(() => ({
          aValues: Array(dateValues.length).fill(""),
          bValues: Array(dateValues.length).fill(""),
        })),
    );
    setZValues(Array(dateValues.length).fill(""));
    setDateValues(Array(dateValues.length).fill(""));

    setShowDeleteAllModal(false);
    alert("✅ Đã xóa tất cả dữ liệu Bảng thông!");
  };

  const confirmDeleteByRows = async () => {
    const from = parseInt(deleteRowFrom);
    const to = parseInt(deleteRowTo);
    if (isNaN(from) || isNaN(to) || from < 0 || to < from) {
      alert("⚠️ Dãy số không hợp lệ!");
      return;
    }

    const visibleIndices = [];
    for (let i = 0; i < dateValues.length; i++) {
      if (!deletedRows[i]) visibleIndices.push(i);
    }

    const newDeletedRows = [...deletedRows];
    let count = 0;
    for (
      let vIdx = from;
      vIdx <= Math.min(to, visibleIndices.length - 1);
      vIdx++
    ) {
      newDeletedRows[visibleIndices[vIdx]] = true;
      count++;
    }

    setDeletedRows(newDeletedRows);
    await savePageData(
      "master_draft",
      null,
      null,
      zValues,
      dateValues,
      newDeletedRows,
      null, // sourceSTTValues
      purpleRangeFrom,
      purpleRangeTo,
      keepLastNRows,
      allQData,
    );

    setShowDeleteByRowsModal(false);
    alert(`✅ Đã xóa ${count} dòng theo STT!`);
  };

  const handleDelete = () => {
    if (deleteOption === "all") {
      setShowDeleteModal(false);
      setShowDeleteAllModal(true);
    } else if (deleteOption === "firstRow") {
      setShowDeleteModal(false);
      setShowDeleteFirstRowModal(true);
    } else if (deleteOption === "lastRow") {
      setShowDeleteModal(false);
      setShowDeleteLastRowModal(true);
    } else if (deleteOption === "rows") {
      if (!deleteRowFrom || !deleteRowTo) {
        alert("⚠️ Vui lòng nhập STT!");
        return;
      }
      setShowDeleteModal(false);
      setShowDeleteByRowsModal(true);
    }
  };

  const handleConfirmAddToApp = async () => {
    const selectedIndices = queue.map((item) => item.rowIndex);
    if (selectedIndices.length === 0) {
      alert("⚠️ Vui lòng chọn ít nhất một dòng!");
      return;
    }

    setIsAddingToCalc(true);
    setSaveStatus("🚀 Đang thêm dòng vào bảng tính...");

    try {
      // VALIDATE: Kiểm tra xem các dòng được chọn có giá trị A hoặc B không (chỉ check unique)
      for (const idx of [...new Set(selectedIndices)]) {
        let hasValueInAnyQ = false;
        for (let q = 0; q < 10; q++) {
          if (
            (allQData[q]?.aValues[idx] &&
              String(allQData[q].aValues[idx]).trim() !== "") ||
            (allQData[q]?.bValues[idx] &&
              String(allQData[q].bValues[idx]).trim() !== "")
          ) {
            hasValueInAnyQ = true;
            break;
          }
        }
        if (!hasValueInAnyQ) {
          alert(
            `⚠️ Dòng thông ${idx} (Z: ${zValues[idx]}) đang trống A và B! Hãy nhập A và B để tiếp tục`,
          );
          setIsAddingToCalc(false);
          setSaveStatus("");
          return;
        }
      }

      for (let i = 1; i <= 10; i++) {
        const qId = `q${i}`;
        const currentData = await loadPageData(qId);

        // Lấy lại thông tin hiện tại của bảng tính để KHÔNG ghi đè sai lệch
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

        let activeA = [],
          activeB = [],
          activeZ = [],
          activeD = [],
          activeDel = [],
          activeSourceSTT = [];

        if (currentData.success && currentData.data) {
          const d = currentData.data;
          const aVals = d.aValues || [];
          const bVals = d.bValues || [];
          const zVals = d.zValues || [];
          const dVals = d.dateValues || [];
          const delFlags = d.deletedRows || [];
          const sourceVals = d.sourceSTTValues || [];

          // COMPACTION: Loại bỏ TOÀN BỘ các dòng trống (không có bất kỳ dữ liệu nào)
          for (let j = 0; j < aVals.length; j++) {
            const hasAnyData =
              (aVals[j] !== undefined &&
                aVals[j] !== null &&
                String(aVals[j]).trim() !== "") ||
              (bVals[j] !== undefined &&
                bVals[j] !== null &&
                String(bVals[j]).trim() !== "") ||
              (zVals[j] !== undefined &&
                zVals[j] !== null &&
                String(zVals[j]).trim() !== "") ||
              (dVals[j] !== undefined &&
                dVals[j] !== null &&
                String(dVals[j]).trim() !== "");

            // Nếu dòng thực sự có nội dung thì giữ lại, bất chấp cờ xóa
            if (hasAnyData) {
              activeA.push(aVals[j] || "");
              activeB.push(bVals[j] || "");
              activeZ.push(zVals[j] || "");
              activeD.push(dVals[j] || "");
              // Giữ nguyên cờ xóa nếu dòng có dữ liệu (có thể là dòng đã bị xóa ẩn đi)
              activeDel.push(delFlags[j] === undefined ? false : delFlags[j]);
              activeSourceSTT.push(sourceVals[j] || "");
            }
          }
        }

        // Append selected rows (to the end of existing data block)
        selectedIndices.forEach((idx) => {
          activeA.push(allQData[i - 1].aValues[idx] || "");
          activeB.push(allQData[i - 1].bValues[idx] || "");
          activeZ.push(""); // Không chép cột Z sang bảng tính
          activeD.push(transferDate);
          activeDel.push(false);
          activeSourceSTT.push(String(idx).padStart(2, "0"));
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

        while (activeA.length < ROWS) {
          activeA.push("");
          activeB.push("");
          activeZ.push("");
          activeD.push("");
          activeDel.push(true);
          activeSourceSTT.push("");
        }

        await savePageData(
          qId,
          activeA,
          activeB,
          activeZ,
          activeD,
          activeDel,
          activeSourceSTT,
          existingPurpleFrom,
          existingPurpleTo,
          existingKeepN,
        );
      }

      setSaveStatus("✅ Đã thêm mới vào bảng tính!");

      // LƯU LẠI LỊCH SỬ LẦN VỪA CHUYỂN
      const batchInfo = {
        stts: selectedIndices.map((idx) => String(idx).padStart(2, "0")),
        zValues: selectedIndices.map((idx) => zValues[idx] || ""),
        date: transferDate,
      };
      localStorage.setItem("lastBatchInfo", JSON.stringify(batchInfo));
      setLastBatch(batchInfo);

      setSelectedRows([]);
      setQueue([]);
      setShowAddModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Lỗi trong quá trình thêm:", err);
      alert("⚠️ Lỗi trong quá trình thêm!");
    } finally {
      setIsAddingToCalc(false);
      setTimeout(() => setSaveStatus(""), 2000);
    }
  };

  const sortedIndices = useMemo(() => {
    return Array.from(
      { length: Math.max(Number(keepLastNRows) || 110, 110) },
      (_, i) => i,
    ).sort((a, b) => {
      const aDeleted = deletedRows[a] || false;
      const bDeleted = deletedRows[b] || false;
      if (aDeleted === bDeleted) return a - b;
      return aDeleted ? 1 : -1;
    });
  }, [keepLastNRows, deletedRows]);

  if (isLoading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <div className="spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <>
      {/* PMA Title */}
      <div
        style={{
          position: "sticky",
          top: 0,
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
            margin: "0",
            color: "#cf3535ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "15px",
          }}
        >
          {/* Nhãn phân biệt Web đã chuyển xuống Toolbar */}
          Dự án cải tạo môi trường thềm lục địa biển Việt Nam -
          <span
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              color: "#cf3535ff",
              fontStyle: "italic",
              marginLeft: "8px",
            }}
          >
            Mai Kiên - SĐT: 0964636709, email: maikien06091966@gmail.com
          </span>
        </h1>
      </div>
      <div className="app-container">
        <div style={{ width: "100%", padding: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "20px",
              marginTop: "65px",
            }}
          >
            {/* <div
              style={{
                padding: "12px 20px",
                background: "#f9f9f9",
                borderBottom: "1px solid #e0e0e0",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <label
                style={{ fontSize: "30px", fontWeight: "600", color: "#555" }}
              >
                Nhập khoảng số muốn báo màu:
              </label>
              <input
                type="number"
                min="0"
                max="1000"
                value={purpleRangeFrom}
                onChange={(e) =>
                  setPurpleRangeFrom(parseInt(e.target.value) || 0)
                }
                style={{
                  width: "100px",
                  padding: "4px 8px",
                  fontSize: "30px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  textAlign: "center",
                }}
              />
              <span style={{ fontSize: "30px", color: "#666" }}>đến</span>
              <input
                type="number"
                min="0"
                max="1000"
                value={purpleRangeTo}
                onChange={(e) =>
                  setPurpleRangeTo(parseInt(e.target.value) || 0)
                }
                style={{
                  width: "100px",
                  padding: "4px 8px",
                  fontSize: "30px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  textAlign: "center",
                }}
              />
            </div> */}
            {/* <h2 style={{ fontSize: "30px" }}>Nhập A, B cho Q1-Q10</h2> */}
            {/* <h2
              style={{
                fontSize: "30px",
                fontWeight: "bold",
                color: "#007bff",
                textDecoration: "underline",
                marginRight: "30px",
              }}
            >
              BẢNG THÔNG
            </h2> */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #007bff",
                padding: "10px 15px",
                borderRadius: "8px",
                backgroundColor: "#e7f3ff",
                marginRight: "20px",
              }}
            >
              <button
                className="toolbar-btn"
                disabled
                style={{
                  fontSize: "22px",
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
                Bảng thông - APP {import.meta.env.VITE_APP_STT || ""}
                {import.meta.env.VITE_SITE_ID === "site_a" ? "A" : "B"}
              </button>
              <label style={{ fontSize: "20px", fontWeight: "bold" }}>
                📊 Dòng tồn tại:
              </label>
              <input
                type="number"
                min="1"
                max={MIN_ROWS}
                value={keepLastNRows}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setKeepLastNRows("");
                  } else {
                    const n = parseInt(val);
                    if (!isNaN(n) && n >= 1) {
                      setKeepLastNRows(Math.min(n, MIN_ROWS));
                    }
                  }
                }}
                style={{
                  width: "80px",
                  padding: "6px",
                  fontSize: "20px",
                  border: "1px solid #007bff",
                  borderRadius: "4px",
                  textAlign: "center",
                }}
              />
              <button
                className="toolbar-btn"
                onClick={handleKeepLastNRows}
                style={{
                  fontSize: "20px",
                  background: "#ffc107",
                  color: "#212529",
                  border: "none",
                }}
              >
                Áp dụng
              </button>
            </div>

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
              }}
            >
              <button
                className="toolbar-btn"
                onClick={handleSave}
                style={{
                  fontSize: "30px",
                  background: "#28a745",
                  color: "white",
                  border: "none",
                }}
              >
                💾 Lưu dữ liệu Bảng thông
              </button>
              <button
                className="toolbar-btn"
                onClick={() => setShowDeleteModal(true)}
                style={{
                  fontSize: "30px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                }}
              >
                🗑️ Xóa dữ liệu
              </button>
              <button
                className="toolbar-btn"
                onClick={() => setShowAddModal(true)}
                style={{
                  fontSize: "30px",
                  background: "#6f42c1",
                  color: "white",
                  border: "none",
                }}
              >
                ➕ Chọn dòng thông và nhập ngày tháng năm
              </button>
              <button
                className="toolbar-btn"
                onClick={clearHighlights}
                style={{
                  fontSize: "30px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                }}
              >
                🔄 Xóa màu d.c
              </button>
              <button
                className="toolbar-btn"
                onClick={() => (window.location.href = "/q1")}
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
                onClick={() => (window.location.href = "/chon-dong-thong")}
                style={{
                  fontSize: "30px",
                  background: "#17a2b8",
                  color: "white",
                  border: "none",
                }}
              >
                📋Về Bảng chọn dòng thông
              </button>
              {accessWarningContent}
              {saveStatus && (
                <span
                  style={{
                    color: "#28a745",
                    fontSize: "18px",
                    marginLeft: "10px",
                  }}
                >
                  {saveStatus}
                </span>
              )}
            </div>
          </div>

          {/* Queue Panel */}
          {queue.length > 0 && (
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
              <span style={{ fontSize: "30px", fontWeight: "bold", marginRight: "6px", whiteSpace: "nowrap" }}>
                📋 Dòng đợi:
              </span>
              {(() => {
                return queue.map((item, idx) => {
                  const luot = idx + 1;
                  return (
                    <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
                      {idx > 0 && (
                        <span style={{ fontSize: "22px", color: "#888", margin: "0 2px" }}>→</span>
                      )}
                      <span
                        style={{
                          display: "inline-flex",
                          flexDirection: "column",
                          alignItems: "center",
                          background: "#a8d5a2",
                          color: "black",
                          borderRadius: "6px",
                          padding: "4px 12px",
                          fontSize: "30px",
                          fontWeight: "normal",
                          gap: "1px",
                          position: "relative",
                        }}
                      >
                        <span>{String(item.displaySTT).padStart(2, "0")}</span>
                        <span style={{ fontSize: "30px", fontWeight: "normal", opacity: 0.9 }}>
                          L{luot}
                        </span>
                        <button
                          onClick={() => handleRemoveFromQueue(idx)}
                          style={{
                            position: "absolute",
                            top: "-6px",
                            right: "-6px",
                            background: "#dc3545",
                            border: "none",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "11px",
                            width: "16px",
                            height: "16px",
                            borderRadius: "50%",
                            lineHeight: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 0,
                          }}
                          title="Xóa khỏi dòng đợi"
                        >
                          ×
                        </button>
                      </span>
                    </span>
                  );
                });
              })()}
              <button
                onClick={handleClearQueue}
                style={{
                  marginLeft: "10px",
                  background: "#dc3545",
                  color: "black",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 16px",
                  fontSize: "30px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Xóa hết
              </button>
            </div>
          )}

          <div
            style={{
              overflowX: "auto",
              overflowY: "auto",
              maxHeight: "calc(100vh - 200px)",
              border: "1px solid #ddd",
            }}
          >
            <table className="schedule-table">
              <thead>
                <tr>
                  <th
                    rowSpan="2"
                    style={{
                      padding: 0,
                      width: "60px !important",
                      minWidth: "60px !important",
                      fontSize: "14px",
                    }}
                  >
                    Chọn
                  </th>
                  <th rowSpan="2" style={{ padding: "8px 4px" }}>
                    STT
                  </th>
                  <th rowSpan="2" style={{ minWidth: "200px", width: "200px" }}>
                    Z
                  </th>
                  {/* Ngày đã bị loại bỏ */}
                  {Array.from({ length: 10 }, (_, qIndex) => {
                    const baseColor = qIndex % 2 === 0 ? "#e0e0e0" : "#e3f2fd";
                    const isBothActive = !!highlightedQCols[qIndex + "-a"] && !!highlightedQCols[qIndex + "-b"];
                    return (
                      <th
                        key={qIndex}
                        colSpan="2"
                        onClick={() => {
                          setHighlightedQCols((prev) => {
                            const both = prev[qIndex + "-a"] && prev[qIndex + "-b"];
                            return {
                              ...prev,
                              [qIndex + "-a"]: !both,
                              [qIndex + "-b"]: !both,
                            };
                          });
                        }}
                        className={isBothActive ? "draft-col-header-highlighted" : ""}
                        style={{
                          backgroundColor: isBothActive ? undefined : baseColor,
                          borderLeft: "2px solid red",
                          borderRight: "2px solid red",
                          borderBottom: "2px solid black",
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        Q{qIndex + 1}
                      </th>
                    );
                  })}
                  <th rowSpan="2" style={{ padding: "8px 4px" }}>
                    STT
                  </th>
                  <th
                    rowSpan="2"
                    style={{
                      padding: 0,
                      width: "60px !important",
                      minWidth: "60px !important",
                      fontSize: "14px",
                    }}
                  >
                    Chọn
                  </th>
                </tr>
                <tr>
                  {Array.from({ length: 10 }, (_, qIndex) => {
                    const baseColor = qIndex % 2 === 0 ? "#e0e0e0" : "#e3f2fd";
                    const isActiveA = !!highlightedQCols[qIndex + "-a"];
                    const isActiveB = !!highlightedQCols[qIndex + "-b"];
                    return (
                      <Fragment key={qIndex}>
                        <th
                          key={`a-${qIndex}`}
                          onClick={() => handleColClick(qIndex + "-a")}
                          className={isActiveA ? "draft-col-header-highlighted" : ""}
                          style={{
                            backgroundColor: isActiveA ? undefined : baseColor,
                            borderLeft: "2px solid red",
                            borderRight: "2px solid #999",
                            minWidth: "60px",
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                        >
                          A
                        </th>
                        <th
                          key={`b-${qIndex}`}
                          onClick={() => handleColClick(qIndex + "-b")}
                          className={isActiveB ? "draft-col-header-highlighted" : ""}
                          style={{
                            backgroundColor: isActiveB ? undefined : baseColor,
                            borderRight: "2px solid red",
                            minWidth: "60px",
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                        >
                          B
                        </th>
                      </Fragment>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedIndices.map((rowIndex, idx) => (
                  <TaskRow
                    key={rowIndex}
                    rowIndex={rowIndex}
                    displayRowNumber={idx}
                    isDeleted={deletedRows[rowIndex]}
                    isSelected={selectedRows.includes(rowIndex)}
                    zValue={zValues[rowIndex]}
                    allQData={allQData}
                    onToggleSelect={(rowIndex) => handleToggleSelect(rowIndex, queue)}
                    onZChange={handleZChange}
                    highlightedQCols={highlightedQCols}
                    highlightedRows={highlightedRows}
                    highlightedCells={highlightedCells}
                    onColClick={handleColClick}
                    onRowClick={handleRowClick}
                    onCellClick={handleCellClick}
                    onAChange={handleAChange}
                    onBChange={handleBChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Modal xác nhận thêm vào bảng tính */}
      {showAddModal && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ maxWidth: "1100px", width: "95%" }}
          >
            <h2
              style={{
                fontSize: "56px",
                marginBottom: "28px",
                fontWeight: "bold",
              }}
            >
              🚀 Thông báo
            </h2>

            {/* Thông tin 5 dòng đã chuyển gần nhất */}
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
                  <div style={{ maxHeight: "150px", overflowY: "auto" }}>
                    <div style={{ marginBottom: "5px" }}>
                      Ngày chuyển:{" "}
                      <span style={{ color: "#1976d2", fontWeight: "bold" }}>
                        {(() => {
                          const dateStr = lastBatch.date;
                          if (!dateStr || dateStr.includes("/")) return dateStr;
                          const parts = dateStr.split("-");
                          if (parts.length === 3) {
                            return `${parts[2]}/${parts[1]}/${parts[0]}`;
                          }
                          return dateStr;
                        })()}
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: "10px",
                        color: "#1976d2",
                        fontWeight: "bold",
                        fontSize: "42px",
                      }}
                    >
                      {formatSttRanges(lastBatch.stts)}
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
                {queue.length > 0 ? queue.map((item, idx) => (
                  <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
                    {idx > 0 && (
                      <span style={{ fontSize: "32px", color: "#888", margin: "0 2px" }}>→</span>
                    )}
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
                      {String(item.displaySTT).padStart(2, "0")}
                    </span>
                  </span>
                )) : (
                  <span style={{ color: "#999" }}>Chưa chọn dòng nào!</span>
                )}
              </div>
            </div>

            <div
              style={{
                marginBottom: "20px",
                padding: "15px",
                background: "#f0f0f0",
                borderRadius: "8px",
              }}
            >
              <label
                style={{
                  fontSize: "40px",
                  fontWeight: "bold",
                  display: "block",
                  marginBottom: "10px",
                }}
              >
                📅 Chọn ngày để lưu vào bảng tính:
              </label>
              <input
                type="date"
                value={transferDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setTransferDate(val);
                  localStorage.setItem("lastTransferDate", val);
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

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "space-between",
              }}
            >
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: "14px 28px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  background: "white",
                  fontSize: "36px",
                }}
              >
                Chọn lại
              </button>
              <button
                onClick={handleConfirmAddToApp}
                disabled={
                  isAddingToCalc || queue.length === 0
                }
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
                {isAddingToCalc ? "⌛ Đang thêm..." : "✅ OK chọn"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{
              maxWidth: "500px",
              width: "90%",
              textAlign: "center",
              padding: "40px 20px",
            }}
          >
            <div
              style={{
                fontSize: "80px",
                marginBottom: "20px",
              }}
            >
              ✅
            </div>
            <h2
              style={{
                fontSize: "40px",
                fontWeight: "bold",
                marginBottom: "20px",
                color: "#000",
              }}
            >
              THÀNH CÔNG!
            </h2>
            <p
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                marginBottom: "40px",
                color: "#000",
              }}
            >
              Đã thêm dữ liệu vào bảng tính thành công.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                alignItems: "center",
              }}
            >
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
                  boxShadow: "0 6px 12px rgba(0, 0, 0, 0.4)",
                }}
              >
                🔍 OK TOÁN VỀ BẢNG TÍNH
              </button>
              <button
                onClick={() => setShowSuccessModal(false)}
                style={{
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
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }
        .selected-draft-row {
          background-color: #f3e8ff !important;
        }
        .selected-draft-row td {
          border-top: 1px solid #6f42c1;
          border-bottom: 1px solid #6f42c1;
        }
        .modal-body {
          padding: 20px 0;
        }
        .radio-group label {
          cursor: pointer;
        }
        .toolbar-group .status-success {
          color: #28a745;
          font-weight: bold;
          margin-left: 10px;
        }
      `}</style>

      {/* Delete Main Modal */}
      {showDeleteModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px", width: "95%" }}
          >
            <h3 style={{ fontSize: "24px", marginBottom: "20px" }}>
              Xóa dữ liệu Bảng thông
            </h3>

            <div className="modal-body">
              <div
                className="radio-group"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                }}
              >
                <label
                  style={{
                    fontSize: "22px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <input
                    type="radio"
                    value="all"
                    checked={deleteOption === "all"}
                    onChange={(e) => setDeleteOption(e.target.value)}
                    style={{ width: "22px", height: "22px" }}
                  />
                  Xóa tất cả dữ liệu
                </label>

                <label
                  style={{
                    fontSize: "22px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <input
                    type="radio"
                    value="firstRow"
                    checked={deleteOption === "firstRow"}
                    onChange={(e) => setDeleteOption(e.target.value)}
                    style={{ width: "22px", height: "22px" }}
                  />
                  Xóa dòng cũ nhất
                </label>

                <label
                  style={{
                    fontSize: "22px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <input
                    type="radio"
                    value="lastRow"
                    checked={deleteOption === "lastRow"}
                    onChange={(e) => setDeleteOption(e.target.value)}
                    style={{ width: "22px", height: "22px" }}
                  />
                  Xóa dòng mới nhất
                </label>

                <label
                  style={{
                    fontSize: "22px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <input
                    type="radio"
                    value="rows"
                    checked={deleteOption === "rows"}
                    onChange={(e) => setDeleteOption(e.target.value)}
                    style={{ width: "22px", height: "22px" }}
                  />
                  Xóa theo khoảng STT dòng
                </label>

                {deleteOption === "rows" && (
                  <div
                    style={{
                      paddingLeft: "35px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <input
                      type="number"
                      placeholder="Từ STT"
                      value={deleteRowFrom}
                      onChange={(e) => setDeleteRowFrom(e.target.value)}
                      style={{
                        width: "100px",
                        fontSize: "18px",
                        padding: "5px",
                      }}
                    />
                    <span>đến</span>
                    <input
                      type="number"
                      placeholder="Đến STT"
                      value={deleteRowTo}
                      onChange={(e) => setDeleteRowTo(e.target.value)}
                      style={{
                        width: "100px",
                        fontSize: "18px",
                        padding: "5px",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{ padding: "8px 16px", fontSize: "18px" }}
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                style={{
                  padding: "8px 16px",
                  fontSize: "18px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                }}
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {showDeleteAllModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: "22px" }}>
              ⚠️ Xác nhận xóa tất cả dữ liệu Bảng thông?
            </h3>
            <p style={{ color: "red", fontSize: "18px" }}>
              Hành động này không thể hoàn tác.
            </p>
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              <button
                onClick={() => setShowDeleteAllModal(false)}
                style={{ padding: "8px 16px", fontSize: "18px" }}
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteAll}
                style={{
                  padding: "8px 16px",
                  fontSize: "18px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                }}
              >
                Xác nhận Xóa Hết
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteFirstRowModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: "22px" }}>
              Xác nhận xóa dòng cũ nhất (đầu tiên)?
            </h3>
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              <button
                onClick={() => setShowDeleteFirstRowModal(false)}
                style={{ padding: "8px 16px", fontSize: "18px" }}
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteFirstRow}
                style={{
                  padding: "8px 16px",
                  fontSize: "18px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                }}
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteLastRowModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: "22px" }}>
              Xác nhận xóa dòng mới nhất (cuối cùng)?
            </h3>
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              <button
                onClick={() => setShowDeleteLastRowModal(false)}
                style={{ padding: "8px 16px", fontSize: "18px" }}
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteLastRow}
                style={{
                  padding: "8px 16px",
                  fontSize: "18px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                }}
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteByRowsModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: "22px" }}>
              Xác nhận xóa dữ liệu từ STT {deleteRowFrom} đến {deleteRowTo}?
            </h3>
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              <button
                onClick={() => setShowDeleteByRowsModal(false)}
                style={{ padding: "8px 16px", fontSize: "18px" }}
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteByRows}
                style={{
                  padding: "8px 16px",
                  fontSize: "18px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                }}
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default InputPage;
