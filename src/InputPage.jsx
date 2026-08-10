import { useState, useEffect, useMemo, memo, useCallback, useRef, Fragment, startTransition } from "react";
import "./App.css";
import "./InputPage.css";
import { savePageData, loadPageData } from "./dataService";

const MIN_ROWS = 5000;
const ROWS = MIN_ROWS;
const NUM_QS = 4;
const DRAFT_ROW_HEIGHT = 52;
const DRAFT_OVERSCAN = 6;
const DRAFT_DATA_COL_COUNT = NUM_QS * 10 * 2;

const DraftTableColgroup = () => (
  <colgroup>
    <col className="draft-col-sticky-1" />
    <col className="draft-col-sticky-2" />
    <col className="draft-col-sticky-3" />
    {Array.from({ length: DRAFT_DATA_COL_COUNT }).map((_, i) => (
      <col key={i} className="draft-col-data" />
    ))}
    <col className="draft-col-trailing" />
    <col className="draft-col-trailing" />
  </colgroup>
);

const DraftVirtualSpacerRow = ({ height }) => {
  if (height <= 0) return null;

  const cellStyle = {
    height,
    padding: 0,
    border: "none",
    lineHeight: 0,
    fontSize: 0,
  };

  return (
    <tr aria-hidden="true" className="draft-virtual-spacer">
      <td className="draft-sticky-left-1" style={cellStyle} />
      <td className="draft-sticky-left-2" style={cellStyle} />
      <td className="draft-sticky-left-3" style={cellStyle} />
      {Array.from({ length: DRAFT_DATA_COL_COUNT }).map((_, i) => (
        <td key={i} style={cellStyle} />
      ))}
      <td style={cellStyle} />
      <td style={cellStyle} />
    </tr>
  );
};

const padToRows = (arr, fill = "", maxLen = ROWS) => {
  const src = Array.isArray(arr) ? arr : [];
  if (src.length >= maxLen) {
    return src.slice(0, maxLen);
  }
  const out = src.slice();
  while (out.length < maxLen) {
    out.push(fill);
  }
  return out;
};

const toggleRowHighlightDom = (rowIndex, isActive, rowTrCache) => {
  const tr =
    rowTrCache.get(rowIndex) ??
    document.querySelector(`tr[data-row-index="${rowIndex}"]`);
  if (tr) {
    tr.classList.toggle("draft-row-highlighted", isActive);
  }
};

const toggleColHighlightDom = (colKey, isActive, cellCache, headerCache) => {
  const cells = cellCache.get(colKey);
  if (cells) {
    for (let i = 0; i < cells.length; i++) {
      cells[i].classList.toggle("draft-col-highlighted", isActive);
    }
  } else {
    document.querySelectorAll(`td[data-col-key="${colKey}"]`).forEach((td) => {
      td.classList.toggle("draft-col-highlighted", isActive);
    });
  }

  const th = headerCache.get(colKey);
  if (th) {
    th.classList.toggle("draft-col-header-highlighted", isActive);
  } else {
    document
      .querySelector(`th[data-col-key="${colKey}"]`)
      ?.classList.toggle("draft-col-header-highlighted", isActive);
  }
};

const createEmptyAllQData = () =>
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

const hasAllQDataContent = (allQData) => {
  if (!Array.isArray(allQData) || allQData.length === 0) return false;
  for (let q = 0; q < allQData.length; q++) {
    const taps = allQData[q]?.tapsData;
    if (!Array.isArray(taps)) continue;
    for (let t = 0; t < taps.length; t++) {
      const tap = taps[t];
      const a = tap?.aValues;
      if (Array.isArray(a)) {
        for (let i = 0; i < a.length; i++) {
          if (a[i] !== "" && a[i] != null) return true;
        }
      }
      const b = tap?.bValues;
      if (Array.isArray(b)) {
        for (let i = 0; i < b.length; i++) {
          if (b[i] !== "" && b[i] != null) return true;
        }
      }
    }
  }
  return false;
};

const normalizeAllQData = (raw, pageData = null) => {
  let source = raw;

  if (!hasAllQDataContent(source) && (raw == null || raw === undefined) && pageData?.tapsData?.length) {
    source = [
      {
        aValues: pageData.aValues || [],
        bValues: pageData.bValues || [],
        tapsData: pageData.tapsData,
      },
    ];
  }

  if (!Array.isArray(source)) {
    source = [];
  }

  const loadedAllQData = [];
  for (let q = 0; q < NUM_QS; q++) {
    const qItem = source[q] || {};
    const qTaps = Array.isArray(qItem.tapsData) ? qItem.tapsData : [];
    const tapsData = [];

    for (let tapIdx = 0; tapIdx < 10; tapIdx++) {
      const tap = qTaps[tapIdx] || {};
      tapsData.push({
        aValues: padToRows(tap.aValues, ""),
        bValues: padToRows(tap.bValues, ""),
      });
    }

    loadedAllQData.push({
      aValues: padToRows(qItem.aValues, ""),
      bValues: padToRows(qItem.bValues, ""),
      tapsData,
    });
  }

  return loadedAllQData;
};

const hasDraftRowData = (pageData, allQData) => {
  if (pageData?.dateValues?.some((v) => v !== "" && v != null)) return true;
  if (pageData?.zValues?.some((v) => v !== "" && v != null)) return true;
  return hasAllQDataContent(allQData);
};

const resetDeletedRowsIfEmptyDraft = (deletedRowsArr, pageData, allQData) => {
  const padded = padToRows(deletedRowsArr, false);
  const rowLimit = Math.max(Number(pageData?.keepLastNRows) || 1000, 1000);
  const visibleFlags = padded.slice(0, rowLimit);
  const allVisibleDeleted =
    visibleFlags.length > 0 && visibleFlags.every(Boolean);

  if (allVisibleDeleted && !hasDraftRowData(pageData, allQData)) {
    return padToRows([], false);
  }

  return padded;
};

const cloneAllQData = (data) => JSON.parse(JSON.stringify(data));

const getTapVolumeClass = (tapIndex) =>
  tapIndex % 2 === 0 ? "draft-tap-odd" : "draft-tap-even";

const getTapHeaderClass = (tapIndex) =>
  tapIndex % 2 === 0 ? "draft-tap-header-odd" : "draft-tap-header-even";

const DraftABCell = memo(function DraftABCell({
  value,
  disabled,
  colKey,
  tapVolumeClass,
  tdClassName,
  borderRight,
  onCellHighlightToggle,
  onValueChange,
}) {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleFocusInput = useCallback(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const handleToggleHighlight = useCallback(
    (e) => {
      e.preventDefault();
      if (!disabled) {
        onCellHighlightToggle();
      }
    },
    [disabled, onCellHighlightToggle],
  );

  return (
    <td
      data-col-key={colKey}
      onClick={handleFocusInput}
      onDoubleClick={handleToggleHighlight}
      className={[tapVolumeClass, tdClassName].filter(Boolean).join(" ")}
      style={{
        borderRight,
        cursor: "text",
        minWidth: "90px",
        width: "90px",
      }}
    >
      <input
        ref={inputRef}
        type="text"
        className="cell-input small"
        value={disabled ? "" : localValue}
        onChange={(e) => {
          const next = e.target.value;
          setLocalValue(next);
          onValueChange(next);
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleFocusInput();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          handleToggleHighlight(e);
        }}
        disabled={disabled}
      />
    </td>
  );
});

const areTaskRowPropsEqual = (prev, next) =>
  prev.highlightedQColsRef === next.highlightedQColsRef &&
  prev.highlightedRowsRef === next.highlightedRowsRef &&
  prev.allQDataRef === next.allQDataRef &&
  prev.dataSyncKey === next.dataSyncKey &&
  prev.rowIndex === next.rowIndex &&
  prev.displayRowNumber === next.displayRowNumber &&
  prev.isDeleted === next.isDeleted &&
  prev.isSelected === next.isSelected &&
  prev.zValue === next.zValue &&
  prev.rowHighlightedCells === next.rowHighlightedCells &&
  prev.onToggleSelect === next.onToggleSelect &&
  prev.onZChange === next.onZChange &&
  prev.onAChange === next.onAChange &&
  prev.onBChange === next.onBChange &&
  prev.onRowClick === next.onRowClick &&
  prev.onCellHighlightToggle === next.onCellHighlightToggle;

const TaskRow = memo(
  ({
    rowIndex,
    displayRowNumber,
    isDeleted,
    isSelected,
    zValue,
    allQDataRef,
    dataSyncKey,
    onToggleSelect,
    onZChange,
    onAChange,
    onBChange,
    rowHighlightedCells,
    highlightedQColsRef,
    highlightedRowsRef,
    onRowClick,
    onCellHighlightToggle,
  }) => {
    const colHighlights = highlightedQColsRef.current;
    const isRowHL = !!highlightedRowsRef.current[rowIndex];
    const rowClassName = [
      isSelected ? "selected-draft-row" : "",
      isRowHL ? "draft-row-highlighted" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <tr data-row-index={rowIndex} className={rowClassName || undefined}>
        <td
          className="draft-sticky-left-1"
          style={{
            textAlign: "center",
            padding: "8px 4px",
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
          className="draft-sticky-left-2"
          onClick={() => onRowClick(rowIndex)}
          style={{ textAlign: "center", fontSize: "35px", fontWeight: "bold", cursor: "pointer", userSelect: "none" }}
        >
          {String(displayRowNumber).padStart(2, "0")}
        </td>
        <td className="draft-sticky-left-3">
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

        {/* Render NUM_QS Qs, each has 10 Taps, each Tap has A and B */}
        {Array.from({ length: NUM_QS }).map((_, qIndex) => {
          const qData = allQDataRef.current?.[qIndex];

          return Array.from({ length: 10 }).map((__, tapIndex) => {
            const tap = qData?.tapsData?.[tapIndex];
            const aV = isDeleted ? "" : tap?.aValues?.[rowIndex] || "";
            const bV = isDeleted ? "" : tap?.bValues?.[rowIndex] || "";
            const tapVolumeClass = getTapVolumeClass(tapIndex);

            const colKeyA = `${qIndex}-${tapIndex}-a`;
            const colKeyB = `${qIndex}-${tapIndex}-b`;

            const isCellAHL = !!rowHighlightedCells?.[qIndex]?.[tapIndex]?.a;
            const isCellBHL = !!rowHighlightedCells?.[qIndex]?.[tapIndex]?.b;
            const isColAHL = !!colHighlights[colKeyA];
            const isColBHL = !!colHighlights[colKeyB];

            const tdAClass = isCellAHL
              ? "draft-cell-highlighted"
              : isColAHL
                ? "draft-col-highlighted"
                : "";
            const tdBClass = isCellBHL
              ? "draft-cell-highlighted"
              : isColBHL
                ? "draft-col-highlighted"
                : "";

            return (
              <Fragment key={`${qIndex}-${tapIndex}-${dataSyncKey}`}>
                <DraftABCell
                  value={aV}
                  disabled={isDeleted}
                  colKey={colKeyA}
                  tapVolumeClass={tapVolumeClass}
                  tdClassName={tdAClass}
                  borderRight="2px solid #999"
                  onCellHighlightToggle={() =>
                    onCellHighlightToggle(rowIndex, qIndex, tapIndex, "a")
                  }
                  onValueChange={(val) => onAChange(qIndex, tapIndex, rowIndex, val)}
                />
                <DraftABCell
                  value={bV}
                  disabled={isDeleted}
                  colKey={colKeyB}
                  tapVolumeClass={tapVolumeClass}
                  tdClassName={tdBClass}
                  borderRight={tapIndex === 9 ? "3px double red" : "2px solid red"}
                  onCellHighlightToggle={() =>
                    onCellHighlightToggle(rowIndex, qIndex, tapIndex, "b")
                  }
                  onValueChange={(val) => onBChange(qIndex, tapIndex, rowIndex, val)}
                />
              </Fragment>
            );
          });
        })}

        <td
          onClick={() => onRowClick(rowIndex)}
          style={{ textAlign: "center", fontSize: "35px", fontWeight: "bold", cursor: "pointer", userSelect: "none" }}
        >
          {String(displayRowNumber).padStart(2, "0")}
        </td>
        <td
          style={{
            textAlign: "center",
            width: "80px !important",
            minWidth: "80px !important",
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
      </tr>
    );
  },
  areTaskRowPropsEqual,
);

const qOffset = import.meta.env.VITE_SITE_ID === "site_b" ? NUM_QS : 0;

function InputPage({ accessWarningContent = null }) {
  const [keepLastNRows, setKeepLastNRows] = useState(1000);

  // State cho NUM_QS Q — khởi tạo lazy sau khi load (tránh cấp phát 400k ô rỗng lúc mount)
  const [allQData, setAllQData] = useState(null);
  const allQDataRef = useRef(null);
  const [dataSyncKey, setDataSyncKey] = useState(0);
  const scrollContainerRef = useRef(null);
  const [virtualRange, setVirtualRange] = useState({ start: 0, end: 30 });

  const assignAllQData = useCallback((nextAllQData) => {
    allQDataRef.current = nextAllQData;
    setAllQData(nextAllQData);
    setDataSyncKey((k) => k + 1);
  }, []);

  const getAllQDataSnapshot = useCallback(
    () => cloneAllQData(allQDataRef.current || createEmptyAllQData()),
    [],
  );

  const [dateValues, setDateValues] = useState(null);
  const [zValues, setZValues] = useState(null);
  const [deletedRows, setDeletedRows] = useState(null);
  const [purpleRangeFrom, setPurpleRangeFrom] = useState(0);
  const [purpleRangeTo, setPurpleRangeTo] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const [queue, setQueue] = useState([]);
  const MAX_PER_ROW = 4;

  const highlightedQColsRef = useRef({});
  const highlightedRowsRef = useRef({});
  const colCellCacheRef = useRef(new Map());
  const colHeaderCacheRef = useRef(new Map());
  const rowTrCacheRef = useRef(new Map());
  const [highlightedCells, setHighlightedCells] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAddingToCalc, setIsAddingToCalc] = useState(false);
  const [transferDate, setTransferDate] = useState(() => {
    return (
      localStorage.getItem("lastTransferDate") ||
      new Date().toISOString().split("T")[0]
    );
  });

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

      const result = await loadPageData("master_draft", { compact: true });

      if (result.success && result.data) {
        const d = result.data;
        const loadedAllQData = normalizeAllQData(d.allQData, d);
        assignAllQData(loadedAllQData);
        setDateValues(padToRows(d.dateValues, ""));
        setZValues(padToRows(d.zValues, ""));
        setDeletedRows(
          resetDeletedRowsIfEmptyDraft(d.deletedRows, d, loadedAllQData),
        );
        setKeepLastNRows(d.keepLastNRows || 1000);
        setPurpleRangeFrom(d.purpleRangeFrom || 0);
        setPurpleRangeTo(d.purpleRangeTo || 0);
      } else {
        assignAllQData(createEmptyAllQData());
        setDateValues(padToRows([], ""));
        setZValues(padToRows([], ""));
        setDeletedRows(padToRows([], false));
      }
      setIsLoading(false);
    };

    loadData();
  }, [assignAllQData]);

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

  const handleKeepLastNRows = async () => {
    const n = parseInt(keepLastNRows);

    if (!n || n <= 0) {
      alert("⚠️ Vui lòng nhập số dòng hợp lệ (> 0)");
      return;
    }

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
            const q = allQDataRef.current[qIndex];
            if (q && q.tapsData) {
              for (let tap = 0; tap < 10; tap++) {
                const a = q.tapsData[tap]?.aValues[i];
                const b = q.tapsData[tap]?.bValues[i];
                const z = zValues[i];
                if ((a && a !== "") || (b && b !== "") || (z && z !== "")) {
                  hasData = true;
                  break;
                }
              }
            }
            if (hasData) break;
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

    const rowsToKeep = nonDeletedRowsWithData.slice(-adjustedN);

    const newDeletedRows = [...deletedRows];
    for (let i = 0; i < dateValues.length; i++) {
      if (!deletedRows[i]) {
        if (!rowsToKeep.includes(i)) {
          newDeletedRows[i] = true;
        }
      }
    }

    setDeletedRows(newDeletedRows);

    setSaveStatus("💾 Đang lưu...");
    const result = await savePageData(
      "master_draft",
      null,
      null,
      zValues,
      dateValues,
      newDeletedRows,
      null,
      purpleRangeFrom,
      purpleRangeTo,
      adjustedN,
      getAllQDataSnapshot(),
    );
    if (result && result.success) {
      setSaveStatus("✅ Đã giữ " + adjustedN + " dòng cuối!");
      alert(`✅ Đã thực hiện giữ lại ${adjustedN} dòng cuối cùng!`);
    } else {
      setSaveStatus("⚠️ Lỗi!");
      alert("⚠️ Lỗi khi giữ lại dòng cuối: " + (result?.error || "Không xác định"));
    }
    setTimeout(() => setSaveStatus(""), 2000);
  };

  const handleSave = async () => {
    setSaveStatus("💾 Đang lưu...");
    const result = await savePageData(
      "master_draft",
      null,
      null,
      zValues,
      dateValues,
      deletedRows,
      null,
      purpleRangeFrom,
      purpleRangeTo,
      keepLastNRows,
      getAllQDataSnapshot(),
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

  const handleToggleSelect = useCallback((rowIndex) => {
    setQueue((prev) => {
      const count = prev.filter((item) => item.rowIndex === rowIndex).length;
      if (count >= 4) {
        alert(`⚠️ Dòng ${String(rowIndex).padStart(2, "0")} đã đạt tối đa 4 lần trong dòng đợi!`);
        return prev;
      }
      return [...prev, { rowIndex, displaySTT: rowIndex }];
    });
  }, []);

  const handleRemoveFromQueue = useCallback((queueIndex) => {
    setQueue((prev) => prev.filter((_, i) => i !== queueIndex));
  }, []);

  const handleClearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const handleRowClick = useCallback((rowIndex) => {
    const isActive = !highlightedRowsRef.current[rowIndex];
    highlightedRowsRef.current[rowIndex] = isActive;
    toggleRowHighlightDom(rowIndex, isActive, rowTrCacheRef.current);
  }, []);

  const handleColClick = useCallback((colKey) => {
    const isActive = !highlightedQColsRef.current[colKey];
    highlightedQColsRef.current[colKey] = isActive;
    toggleColHighlightDom(
      colKey,
      isActive,
      colCellCacheRef.current,
      colHeaderCacheRef.current,
    );
  }, []);

  const handleCellHighlightToggle = useCallback((rowIndex, qIndex, tapIndex, ab) => {
    setHighlightedCells((prev) => {
      const rowData = prev[rowIndex] || {};
      const qData = rowData[qIndex] || {};
      const tapData = qData[tapIndex] || {};
      const newTap = { ...tapData, [ab]: !tapData[ab] };
      return {
        ...prev,
        [rowIndex]: {
          ...rowData,
          [qIndex]: {
            ...qData,
            [tapIndex]: newTap,
          },
        },
      };
    });
  }, []);

  const clearHighlights = useCallback(() => {
    Object.entries(highlightedQColsRef.current).forEach(([colKey, isActive]) => {
      if (isActive) {
        toggleColHighlightDom(
          colKey,
          false,
          colCellCacheRef.current,
          colHeaderCacheRef.current,
        );
      }
    });
    highlightedQColsRef.current = {};

    Object.entries(highlightedRowsRef.current).forEach(([rowIndex, isActive]) => {
      if (isActive) {
        toggleRowHighlightDom(Number(rowIndex), false, rowTrCacheRef.current);
      }
    });
    highlightedRowsRef.current = {};

    startTransition(() => {
      setHighlightedCells({});
    });
  }, []);

  const handleZChange = useCallback((rIdx, val) => {
    if (val.length <= 10) {
      setZValues((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        next[rIdx] = val;
        return next;
      });
    }
  }, []);

  const handleAChange = useCallback((qIdx, tapIdx, rIdx, val) => {
    const tap = allQDataRef.current?.[qIdx]?.tapsData?.[tapIdx];
    if (!tap?.aValues) return;
    tap.aValues[rIdx] = val;
  }, []);

  const handleBChange = useCallback((qIdx, tapIdx, rIdx, val) => {
    const tap = allQDataRef.current?.[qIdx]?.tapsData?.[tapIdx];
    if (!tap?.bValues) return;
    tap.bValues[rIdx] = val;
  }, []);

  const handleDeleteFirstRow = async () => {
    let firstRowIndex = -1;
    for (let i = 0; i < dateValues.length; i++) {
      if (!deletedRows[i]) {
        let hasData = dateValues[i] !== "" || zValues[i] !== "";
        if (!hasData) {
          for (let q = 0; q < 10; q++) {
            const qData = allQDataRef.current[q];
            if (qData && qData.tapsData) {
              for (let tapIdx = 0; tapIdx < 10; tapIdx++) {
                if (qData.tapsData[tapIdx]?.aValues[i] || qData.tapsData[tapIdx]?.bValues[i]) {
                  hasData = true;
                  break;
                }
              }
            }
            if (hasData) break;
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

    const result = await savePageData(
      "master_draft",
      null,
      null,
      zValues,
      dateValues,
      newDeletedRows,
      null,
      purpleRangeFrom,
      purpleRangeTo,
      keepLastNRows,
      getAllQDataSnapshot(),
    );

    setShowDeleteFirstRowModal(false);
    if (result && result.success) {
      alert("✅ Đã xóa dòng cũ nhất!");
    } else {
      alert("⚠️ Lỗi khi xóa dòng cũ nhất: " + (result?.error || "Không xác định"));
    }
  };

  const handleDeleteLastRow = async () => {
    let lastRowIndex = -1;
    for (let i = dateValues.length - 1; i >= 0; i--) {
      if (!deletedRows[i]) {
        let hasData = dateValues[i] !== "" || zValues[i] !== "";
        if (!hasData) {
          for (let q = 0; q < 10; q++) {
            const qData = allQDataRef.current[q];
            if (qData && qData.tapsData) {
              for (let tapIdx = 0; tapIdx < 10; tapIdx++) {
                if (qData.tapsData[tapIdx]?.aValues[i] || qData.tapsData[tapIdx]?.bValues[i]) {
                  hasData = true;
                  break;
                }
              }
            }
            if (hasData) break;
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

    const result = await savePageData(
      "master_draft",
      null,
      null,
      zValues,
      dateValues,
      newDeletedRows,
      null,
      purpleRangeFrom,
      purpleRangeTo,
      keepLastNRows,
      getAllQDataSnapshot(),
    );

    setShowDeleteLastRowModal(false);
    if (result && result.success) {
      alert("✅ Đã xóa dòng mới nhất!");
    } else {
      alert("⚠️ Lỗi khi xóa dòng mới nhất: " + (result?.error || "Không xác định"));
    }
  };

  const confirmDeleteAll = async () => {
    const newDeletedRows = padToRows([], false);
    setDeletedRows(newDeletedRows);

    const emptyAllQData = createEmptyAllQData();

    const result = await savePageData(
      "master_draft",
      [],
      [],
      [],
      [],
      newDeletedRows,
      [],
      purpleRangeFrom,
      purpleRangeTo,
      keepLastNRows,
      [],
      "",
      [],
    );

    setShowDeleteAllModal(false);
    if (result && result.success) {
      assignAllQData(emptyAllQData);
      setZValues(padToRows([], ""));
      setDateValues(padToRows([], ""));
      setDeletedRows(newDeletedRows);
      alert("✅ Đã xóa tất cả dữ liệu Bảng thông!");
    } else {
      alert("⚠️ Lỗi khi xóa tất cả dữ liệu: " + (result?.error || "Không xác định"));
    }
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

    const result = await savePageData(
      "master_draft",
      null,
      null,
      zValues,
      dateValues,
      newDeletedRows,
      null,
      purpleRangeFrom,
      purpleRangeTo,
      keepLastNRows,
      getAllQDataSnapshot(),
    );

    setShowDeleteByRowsModal(false);
    if (result && result.success) {
      alert(`✅ Đã xóa ${count} dòng theo STT!`);
    } else {
      alert("⚠️ Lỗi khi xóa dòng theo STT: " + (result?.error || "Không xác định"));
    }
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
      // VALIDATE: Kiểm tra xem các dòng được chọn có giá trị A hoặc B không
      for (const idx of [...new Set(selectedIndices)]) {
        let hasValueInAnyQ = false;
        for (let q = 0; q < NUM_QS; q++) {
          const qData = allQDataRef.current[q];
          if (qData && qData.tapsData) {
            for (let tap = 0; tap < 10; tap++) {
              const a = qData.tapsData[tap]?.aValues[idx];
              const b = qData.tapsData[tap]?.bValues[idx];
              if (
                (a && String(a).trim() !== "") ||
                (b && String(b).trim() !== "")
              ) {
                hasValueInAnyQ = true;
                break;
              }
            }
          }
          if (hasValueInAnyQ) break;
        }
        if (!hasValueInAnyQ) {
          alert(
            `⚠️ Dòng thông ${idx} (Z: ${zValues[idx]}) đang trống A và B! Hãy nhập ít nhất một cặp A và B để tiếp tục`,
          );
          setIsAddingToCalc(false);
          setSaveStatus("");
          return;
        }
      }

      const currentData = await loadPageData("q_all");

      const existingPurpleFrom =
        currentData.success && currentData.data && currentData.data.purpleRangeFrom !== undefined && currentData.data.purpleRangeFrom !== null
          ? currentData.data.purpleRangeFrom
          : 16;
      const existingPurpleTo =
        currentData.success && currentData.data && currentData.data.purpleRangeTo !== undefined && currentData.data.purpleRangeTo !== null
          ? currentData.data.purpleRangeTo
          : 95;
      const existingKeepN =
        currentData.success && currentData.data && currentData.data.keepLastNRows !== undefined && currentData.data.keepLastNRows !== null
          ? currentData.data.keepLastNRows
          : 1000;
      const existingPageLabel =
        currentData.success && currentData.data
          ? currentData.data.pageLabel || ""
          : "";

      let activeAllQData = [];
      if (currentData.success && currentData.data?.allQData) {
        activeAllQData = JSON.parse(JSON.stringify(currentData.data.allQData));
      }
      while (activeAllQData.length < NUM_QS) {
        activeAllQData.push({
          tapsData: Array(10).fill(null).map(() => ({
            aValues: Array(ROWS).fill(""),
            bValues: Array(ROWS).fill(""),
          })),
        });
      }
      for (let q = 0; q < NUM_QS; q++) {
        if (!activeAllQData[q]) {
          activeAllQData[q] = { tapsData: [] };
        }
        if (!activeAllQData[q].tapsData) {
          activeAllQData[q].tapsData = [];
        }
        while (activeAllQData[q].tapsData.length < 10) {
          activeAllQData[q].tapsData.push({
            aValues: Array(ROWS).fill(""),
            bValues: Array(ROWS).fill(""),
          });
        }
      }

      let activeZ = [];
      let activeD = [];
      let activeDel = [];
      let activeSourceSTT = [];

      let newAllQData = Array(NUM_QS).fill(null).map(() => ({
        tapsData: Array(10).fill(null).map(() => ({
          aValues: [],
          bValues: [],
        })),
      }));

      if (currentData.success && currentData.data) {
        const d = currentData.data;
        const zVals = d.zValues || [];
        const dVals = d.dateValues || [];
        const delFlags = d.deletedRows || [];
        const sourceVals = d.sourceSTTValues || [];

        for (let j = 0; j < zVals.length; j++) {
          let hasAnyData =
            (zVals[j] && String(zVals[j]).trim() !== "") ||
            (dVals[j] && String(dVals[j]).trim() !== "");

          if (!hasAnyData) {
            for (let q = 0; q < NUM_QS; q++) {
              const taps = activeAllQData[q]?.tapsData || [];
              for (let tapIdx = 0; tapIdx < 10; tapIdx++) {
                const a = taps[tapIdx]?.aValues[j];
                const b = taps[tapIdx]?.bValues[j];
                if ((a && String(a).trim() !== "") || (b && String(b).trim() !== "")) {
                  hasAnyData = true;
                  break;
                }
              }
              if (hasAnyData) break;
            }
          }

          if (hasAnyData) {
            activeZ.push(zVals[j] || "");
            activeD.push(dVals[j] || "");
            activeDel.push(delFlags[j] === undefined ? false : delFlags[j]);
            activeSourceSTT.push(sourceVals[j] || "");
            for (let q = 0; q < NUM_QS; q++) {
              for (let tapIdx = 0; tapIdx < 10; tapIdx++) {
                newAllQData[q].tapsData[tapIdx].aValues.push(activeAllQData[q]?.tapsData?.[tapIdx]?.aValues[j] || "");
                newAllQData[q].tapsData[tapIdx].bValues.push(activeAllQData[q]?.tapsData?.[tapIdx]?.bValues[j] || "");
              }
            }
          }
        }
      }

      selectedIndices.forEach((idx) => {
        activeZ.push("");
        activeD.push(transferDate);
        activeDel.push(false);
        activeSourceSTT.push(String(idx).padStart(2, "0"));

        for (let q = 0; q < NUM_QS; q++) {
          for (let tapIdx = 0; tapIdx < 10; tapIdx++) {
            const draftTap = allQDataRef.current[q]?.tapsData?.[tapIdx];
            newAllQData[q].tapsData[tapIdx].aValues.push(draftTap?.aValues[idx] || "");
            newAllQData[q].tapsData[tapIdx].bValues.push(draftTap?.bValues[idx] || "");
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
        for (let q = 0; q < NUM_QS; q++) {
          for (let tapIdx = 0; tapIdx < 10; tapIdx++) {
            newAllQData[q].tapsData[tapIdx].aValues.push("");
            newAllQData[q].tapsData[tapIdx].bValues.push("");
          }
        }
      }

      const result = await savePageData(
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

      if (!result || !result.success) {
        throw new Error(result?.error || "Không thể lưu dữ liệu vào cơ sở dữ liệu.");
      }

      setSaveStatus("✅ Đã thêm mới vào bảng tính!");

      const batchInfo = {
        stts: selectedIndices.map((idx) => String(idx).padStart(2, "0")),
        zValues: selectedIndices.map((idx) => zValues[idx] || ""),
        date: transferDate,
      };
      localStorage.setItem("lastBatchInfo", JSON.stringify(batchInfo));
      setLastBatch(batchInfo);

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
    if (!deletedRows) return [];

    return Array.from(
      { length: Math.max(Number(keepLastNRows) || 1000, 1000) },
      (_, i) => i,
    ).sort((a, b) => {
      const aDeleted = deletedRows[a] || false;
      const bDeleted = deletedRows[b] || false;
      if (aDeleted === bDeleted) return a - b;
      return aDeleted ? 1 : -1;
    });
  }, [keepLastNRows, deletedRows]);

  const selectedRowSet = useMemo(
    () => new Set(queue.map((item) => item.rowIndex)),
    [queue],
  );

  const updateVirtualRange = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const total = sortedIndices.length;
    const scrollTop = el.scrollTop;
    const viewport = el.clientHeight;
    const start = Math.max(
      0,
      Math.floor(scrollTop / DRAFT_ROW_HEIGHT) - DRAFT_OVERSCAN,
    );
    const count =
      Math.ceil(viewport / DRAFT_ROW_HEIGHT) + DRAFT_OVERSCAN * 2;
    const end = Math.min(total, start + count);

    setVirtualRange((prev) =>
      prev.start === start && prev.end === end ? prev : { start, end },
    );
  }, [sortedIndices.length]);

  useEffect(() => {
    if (isLoading) return;

    updateVirtualRange();
    const el = scrollContainerRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateVirtualRange, { passive: true });
    window.addEventListener("resize", updateVirtualRange);

    return () => {
      el.removeEventListener("scroll", updateVirtualRange);
      window.removeEventListener("resize", updateVirtualRange);
    };
  }, [isLoading, updateVirtualRange, sortedIndices.length]);

  const visibleIndices = useMemo(
    () => sortedIndices.slice(virtualRange.start, virtualRange.end),
    [sortedIndices, virtualRange.start, virtualRange.end],
  );

  const topSpacerHeight = virtualRange.start * DRAFT_ROW_HEIGHT;
  const bottomSpacerHeight =
    (sortedIndices.length - virtualRange.end) * DRAFT_ROW_HEIGHT;

  useEffect(() => {
    if (isLoading || !dateValues?.length) return;

    const timer = setTimeout(() => {
      const targetRowIndex =
        dateValues.length >= 50 ? 49 : dateValues.length - 1;
      const displayIdx = sortedIndices.indexOf(targetRowIndex);
      const container = scrollContainerRef.current;

      if (displayIdx >= 0 && container) {
        container.scrollTop = Math.max(
          0,
          displayIdx * DRAFT_ROW_HEIGHT - container.clientHeight * 0.4,
        );
        updateVirtualRange();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isLoading, dateValues, deletedRows, sortedIndices, updateVirtualRange]);

  const rebuildHighlightCaches = useCallback(() => {
    const headerCache = new Map();
    for (let q = 0; q < NUM_QS; q++) {
      for (let tap = 0; tap < 10; tap++) {
        for (const ab of ["a", "b"]) {
          const key = `${q}-${tap}-${ab}`;
          const th = document.querySelector(`th[data-col-key="${key}"]`);
          if (th) headerCache.set(key, th);
        }
      }
    }
    colHeaderCacheRef.current = headerCache;

    const rowCache = new Map();
    document.querySelectorAll("tr[data-row-index]").forEach((tr) => {
      const idx = parseInt(tr.getAttribute("data-row-index"), 10);
      if (!Number.isNaN(idx)) rowCache.set(idx, tr);
    });
    rowTrCacheRef.current = rowCache;

    const cellCache = new Map();
    for (const key of headerCache.keys()) {
      cellCache.set(
        key,
        document.querySelectorAll(`td[data-col-key="${key}"]`),
      );
    }
    colCellCacheRef.current = cellCache;

    for (const [key, active] of Object.entries(highlightedQColsRef.current)) {
      if (active) {
        toggleColHighlightDom(key, true, cellCache, headerCache);
      }
    }
    for (const [rowIndex, active] of Object.entries(
      highlightedRowsRef.current,
    )) {
      if (active) {
        toggleRowHighlightDom(Number(rowIndex), true, rowCache);
      }
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;

    let idleId;
    let timeoutId;

    if (typeof requestIdleCallback !== "undefined") {
      idleId = requestIdleCallback(rebuildHighlightCaches, { timeout: 1500 });
    } else {
      timeoutId = setTimeout(rebuildHighlightCaches, 0);
    }

    return () => {
      if (idleId != null && typeof cancelIdleCallback !== "undefined") {
        cancelIdleCallback(idleId);
      }
      if (timeoutId != null) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    isLoading,
    virtualRange.start,
    virtualRange.end,
    keepLastNRows,
    rebuildHighlightCaches,
  ]);

  if (isLoading || !allQData || !dateValues || !zValues || !deletedRows) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <div className="spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="draft-input-root">
      <div className="draft-input-header">
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
      <div className="draft-input-page">
        <div className="draft-input-content">
          <div className="draft-input-toolbar">
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
                onClick={() => (window.location.href = "/chon-dong-thong")}
                style={{
                  fontSize: "30px",
                  background: "#17a2b8",
                  color: "white",
                  border: "none",
                }}
              >
                📋 Về Bảng chọn dòng thông
              </button>
              <button
                className="toolbar-btn"
                onClick={() => (window.location.href = "/bao-mau")}
                style={{
                  fontSize: "30px",
                  background: "#ffc107",
                  color: "#212529",
                  border: "none",
                  fontWeight: "bold",
                }}
              >
                🎨 Về bảng màu
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
              {queue.map((item, idx) => {
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
              })}
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

          {/* Giao diện lưới nhập liệu — scroll ngang/dọc trong viewport */}
          <div
            ref={scrollContainerRef}
            className="draft-table-scroll"
          >
            <div className="draft-table-inner">
            <table className="draft-schedule-table">
              <DraftTableColgroup />
              <thead>
                <tr>
                  <th rowSpan="3" className="draft-sticky-left-1">
                    Chọn
                  </th>
                  <th rowSpan="3" className="draft-sticky-left-2">
                    STT
                  </th>
                  <th rowSpan="3" className="draft-sticky-left-3">
                    Z
                  </th>
                  {Array.from({ length: NUM_QS }, (_, qIndex) => {
                    const baseColor = qIndex % 2 === 0 ? "#e0e0e0" : "#e3f2fd";
                    return (
                      <th
                        key={qIndex}
                        colSpan="20"
                        style={{
                          backgroundColor: baseColor,
                          borderLeft: "3px solid red",
                          borderRight: "3px solid red",
                          borderBottom: "2px solid black",
                          userSelect: "none",
                          fontSize: "20px",
                          fontWeight: "bold",
                        }}
                      >
                        Q{qIndex + 1 + qOffset}
                      </th>
                    );
                  })}
                  <th rowSpan="3" style={{ padding: "8px 4px" }}>
                    STT
                  </th>
                  <th
                    rowSpan="3"
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
                  {Array.from({ length: NUM_QS }).map((_, qIndex) =>
                    Array.from({ length: 10 }).map((__, tapIndex) => (
                      <th
                        key={`${qIndex}-${tapIndex}`}
                        colSpan="2"
                        className={getTapHeaderClass(tapIndex)}
                        style={{
                          borderLeft: tapIndex === 0 ? "3px solid red" : "1px solid #999",
                          borderRight: "1px solid #999",
                          borderBottom: "1px solid black",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Tập {tapIndex + 1}
                      </th>
                    )),
                  )}
                </tr>
                <tr>
                  {Array.from({ length: NUM_QS }).map((_, qIndex) => {
                    return Array.from({ length: 10 }).map((__, tapIndex) => {
                      const colKeyA = `${qIndex}-${tapIndex}-a`;
                      const colKeyB = `${qIndex}-${tapIndex}-b`;
                      return (
                        <Fragment key={`${qIndex}-${tapIndex}`}>
                          <th
                            data-col-key={colKeyA}
                            onClick={() => handleColClick(colKeyA)}
                            className={`${getTapHeaderClass(tapIndex)} draft-ab-header`}
                            style={{
                              borderLeft: "1px solid #999",
                              borderRight: "1px solid #ccc",
                              cursor: "pointer",
                              userSelect: "none",
                            }}
                          >
                            A
                          </th>
                          <th
                            data-col-key={colKeyB}
                            onClick={() => handleColClick(colKeyB)}
                            className={`${getTapHeaderClass(tapIndex)} draft-ab-header`}
                            style={{
                              borderRight: tapIndex === 9 ? "3px double red" : "1px solid #999",
                              cursor: "pointer",
                              userSelect: "none",
                            }}
                          >
                            B
                          </th>
                        </Fragment>
                      );
                    });
                  })}
                </tr>
              </thead>
              <tbody>
                <DraftVirtualSpacerRow height={topSpacerHeight} />
                {visibleIndices.map((rowIndex, localIdx) => (
                  <TaskRow
                    key={rowIndex}
                    rowIndex={rowIndex}
                    displayRowNumber={virtualRange.start + localIdx}
                    isDeleted={deletedRows[rowIndex]}
                    isSelected={selectedRowSet.has(rowIndex)}
                    zValue={zValues[rowIndex]}
                    allQDataRef={allQDataRef}
                    dataSyncKey={dataSyncKey}
                    onToggleSelect={handleToggleSelect}
                    onZChange={handleZChange}
                    rowHighlightedCells={highlightedCells[rowIndex]}
                    highlightedQColsRef={highlightedQColsRef}
                    highlightedRowsRef={highlightedRowsRef}
                    onRowClick={handleRowClick}
                    onCellHighlightToggle={handleCellHighlightToggle}
                    onAChange={handleAChange}
                    onBChange={handleBChange}
                  />
                ))}
                <DraftVirtualSpacerRow height={bottomSpacerHeight} />
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal xác nhận thêm vào bảng tính */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "1100px", width: "95%" }}>
            <h2 style={{ fontSize: "56px", marginBottom: "28px", fontWeight: "bold" }}>
              🚀 Thông báo
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
                    <div style={{ marginTop: "10px", color: "#1976d2", fontWeight: "bold", fontSize: "42px" }}>
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
                {queue.length > 0 ? (
                  queue.map((item, idx) => (
                    <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
                      {idx > 0 && <span style={{ fontSize: "32px", color: "#888", margin: "0 2px" }}>→</span>}
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
                  ))
                ) : (
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
              <label style={{ fontSize: "40px", fontWeight: "bold", display: "block", marginBottom: "10px" }}>
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

            <div style={{ display: "flex", gap: "10px", justifyContent: "space-between" }}>
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
            <div style={{ fontSize: "80px", marginBottom: "20px" }}>✅</div>
            <h2 style={{ fontSize: "40px", fontWeight: "bold", marginBottom: "20px", color: "#000" }}>
              THÀNH CÔNG!
            </h2>
            <p style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "40px", color: "#000" }}>
              Đã thêm dữ liệu vào bảng tính thành công.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "center" }}>
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
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px", width: "95%" }}>
            <h3 style={{ fontSize: "24px", marginBottom: "20px" }}>Xóa dữ liệu Bảng thông</h3>
            <div className="modal-body">
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                <label style={{ fontSize: "22px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <input
                    type="radio"
                    value="all"
                    checked={deleteOption === "all"}
                    onChange={(e) => setDeleteOption(e.target.value)}
                    style={{ width: "22px", height: "22px" }}
                  />
                  Xóa tất cả dữ liệu
                </label>
                <label style={{ fontSize: "22px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <input
                    type="radio"
                    value="firstRow"
                    checked={deleteOption === "firstRow"}
                    onChange={(e) => setDeleteOption(e.target.value)}
                    style={{ width: "22px", height: "22px" }}
                  />
                  Xóa dòng cũ nhất
                </label>
                <label style={{ fontSize: "22px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <input
                    type="radio"
                    value="lastRow"
                    checked={deleteOption === "lastRow"}
                    onChange={(e) => setDeleteOption(e.target.value)}
                    style={{ width: "22px", height: "22px" }}
                  />
                  Xóa dòng mới nhất
                </label>
                <label style={{ fontSize: "22px", display: "flex", alignItems: "center", gap: "12px" }}>
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
                  <div style={{ paddingLeft: "35px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="number"
                      placeholder="Từ STT"
                      value={deleteRowFrom}
                      onChange={(e) => setDeleteRowFrom(e.target.value)}
                      style={{ width: "100px", fontSize: "18px", padding: "5px" }}
                    />
                    <span>đến</span>
                    <input
                      type="number"
                      placeholder="Đến STT"
                      value={deleteRowTo}
                      onChange={(e) => setDeleteRowTo(e.target.value)}
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

      {showDeleteAllModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: "22px" }}>⚠️ Xác nhận xóa tất cả dữ liệu Bảng thông?</h3>
            <p style={{ color: "red", fontSize: "18px" }}>Hành động này không thể hoàn tác.</p>
            <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "10px" }}>
              <button onClick={() => setShowDeleteAllModal(false)} style={{ padding: "8px 16px", fontSize: "18px" }}>
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
            <h3 style={{ fontSize: "22px" }}>Xác nhận xóa dòng cũ nhất (đầu tiên)?</h3>
            <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "10px" }}>
              <button onClick={() => setShowDeleteFirstRowModal(false)} style={{ padding: "8px 16px", fontSize: "18px" }}>
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
            <h3 style={{ fontSize: "22px" }}>Xác nhận xóa dòng mới nhất (cuối cùng)?</h3>
            <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "10px" }}>
              <button onClick={() => setShowDeleteLastRowModal(false)} style={{ padding: "8px 16px", fontSize: "18px" }}>
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
            <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "10px" }}>
              <button onClick={() => setShowDeleteByRowsModal(false)} style={{ padding: "8px 16px", fontSize: "18px" }}>
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
    </div>
  );
}

export default InputPage;
