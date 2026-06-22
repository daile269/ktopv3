import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./App.css";
import "./TopToolbar.css";
import { savePageData, loadPageData, deletePageData } from "./dataService";
import InputPage from "./InputPage";
import SelectRowsPage from "./SelectRowsPage";
import ColorReportPage from "./ColorReportPage";

function App() {
  const TOTAL_TABLES = 2; // số bảng T mỗi Tập (chỉ còn T1, T2)
  const ROWS = 5000;
  
  // State lưu trữ dữ liệu 5 Q, mỗi Q có 10 Tập (mỗi Tập có A và B)
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
  const [sourceSTTValues, setSourceSTTValues] = useState(Array(ROWS).fill(""));
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const isGenerating = false;
  const [error, setError] = useState("");
  const [pageLabel, setPageLabel] = useState("");



  const [highlightedCells, setHighlightedCells] = useState({});
  const [highlightedTCells, setHighlightedTCells] = useState({});
  const [highlightedACells, setHighlightedACells] = useState({});
  const [highlightedBCells, setHighlightedBCells] = useState({});
  const [highlightedTColumns, setHighlightedTColumns] = useState({});
  const [highlightedAColumn, setHighlightedAColumn] = useState(false);
  const [highlightedBColumn, setHighlightedBColumn] = useState(false);
  const [highlightedDataColumns, setHighlightedDataColumns] = useState({});
  const [highlightedRows, setHighlightedRows] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteOption, setDeleteOption] = useState("all");
  const [deleteDateFrom, setDeleteDateFrom] = useState("");
  const [deleteDateTo, setDeleteDateTo] = useState("");
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [newRowDate, setNewRowDate] = useState("");
  const [newRowT1, setNewRowT1] = useState("");
  const [newRowT2, setNewRowT2] = useState("");
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [keepLastNRows, setKeepLastNRows] = useState("");
  const [purpleRangeFrom, setPurpleRangeFrom] = useState(0);
  const [purpleRangeTo, setPurpleRangeTo] = useState(0);
  const [deletedRows, setDeletedRows] = useState(Array(ROWS).fill(false));
  const [zValues, setZValues] = useState(Array(ROWS).fill(""));
  const [showDeleteFirstRowModal, setShowDeleteFirstRowModal] = useState(false);
  const [showKeepLastNRowsModal, setShowKeepLastNRowsModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showDeleteByDatesModal, setShowDeleteByDatesModal] = useState(false);
  const [showDeleteLastRowModal, setShowDeleteLastRowModal] = useState(false);
  const [showPurpleRangeModal, setShowPurpleRangeModal] = useState(false);
  const [tempPurpleRangeFrom, setTempPurpleRangeFrom] = useState("");
  const [tempPurpleRangeTo, setTempPurpleRangeTo] = useState("");
  const [isSavingPurpleRange, setIsSavingPurpleRange] = useState(false);
  const [showKeepLastNRowsSettingsModal, setShowKeepLastNRowsSettingsModal] =
    useState(false);
  const [tempKeepLastNRows, setTempKeepLastNRows] = useState("");
  const [isSavingKeepLastNRows, setIsSavingKeepLastNRows] = useState(false);
  const [qPurpleInfo, setQPurpleInfo] = useState({});
  const [viewedQs, setViewedQs] = useState(() => {
    const saved = localStorage.getItem("viewedQs");
    return saved ? JSON.parse(saved) : {};
  });
  const [showAccessWarningModal, setShowAccessWarningModal] = useState(false);
  const [accessWarningDate, setAccessWarningDate] = useState("");
  const [deleteRowFrom, setDeleteRowFrom] = useState("");
  const [deleteRowTo, setDeleteRowTo] = useState("");
  const [showDeleteByRowsModal, setShowDeleteByRowsModal] = useState(false);
  const [goToTableNumber, setGoToTableNumber] = useState("");

  const accessCheckDoneRef = useRef(false);

  const pathname = window.location.pathname.slice(1);
  const pageId = "q_all";

  const getTodayAccessInfo = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return {
      storageDate: `${year}-${month}-${day}`,
      displayDate: `${day}/${month}/${year}`,
    };
  };

  const normalizeAccessDate = (value) => {
    if (!value) return "";

    const text = String(value).trim();
    const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDate) {
      return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
    }

    const displayDate = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (displayDate) {
      return `${displayDate[3]}-${displayDate[2]}-${displayDate[1]}`;
    }

    const parsedDate = new Date(text);
    if (!Number.isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
      const day = String(parsedDate.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    return text;
  };

  const renderAccessWarning = (showModal = true, badgeStyle = {}) => {
    if (!accessWarningDate) return null;

    return (
      <>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            marginLeft: "8px",
            padding: "8px 14px",
            backgroundColor: "#fff7ed",
            border: "2px solid #f59e0b",
            borderRadius: "8px",
            color: "#7c2d12",
            fontSize: "30px",
            fontWeight: "bold",
            textAlign: "center",
            whiteSpace: "nowrap",
            ...badgeStyle,
          }}
        >
          TC ({accessWarningDate.slice(0, 5)})
        </div>

        {showModal && showAccessWarningModal && (
          <div className="modal-overlay">
            <div
              className="modal-content"
              style={{
                maxWidth: "520px",
                width: "90%",
                textAlign: "center",
                backgroundColor: "#fff7ed",
                border: "2px solid #f59e0b",
              }}
            >
              <div className="modal-header"></div>
              <div className="modal-body">
                <p
                  style={{
                    fontSize: "36px",
                    fontWeight: "bold",
                    color: "#f59e0b",
                    lineHeight: 1.5,
                    margin: "20px 0",
                  }}
                >
                  Truy cập {accessWarningDate}.
                </p>
              </div>
              <div className="modal-footer" style={{ justifyContent: "center" }}>
                <button
                  className="btn-delete access-warning-ok-button"
                  onClick={() => setShowAccessWarningModal(false)}
                  style={{
                    fontSize: "36px",
                    padding: "12px 28px",
                    backgroundColor: "#f59e0b",
                  }}
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  useEffect(() => {
    if (accessCheckDoneRef.current) return;
    accessCheckDoneRef.current = true;

    const ACCESS_DATE_KEY = "ktop_last_access_date";
    const ACCESS_COUNT_KEY = "ktop_daily_access_count";
    const ACCESS_MODAL_SHOWN_KEY = "ktop_access_modal_shown_date";
    const { storageDate, displayDate } = getTodayAccessInfo();
    const lastAccessDate = localStorage.getItem(ACCESS_DATE_KEY);
    const normalizedLastAccessDate = normalizeAccessDate(lastAccessDate);
    const modalShownDate = sessionStorage.getItem(ACCESS_MODAL_SHOWN_KEY);

    if (normalizedLastAccessDate === storageDate) {
      const previousAccessCount = parseInt(
        localStorage.getItem(ACCESS_COUNT_KEY) || "1",
        10,
      );
      const accessCount = Math.max(previousAccessCount || 1, 1) + 1;
      localStorage.setItem(ACCESS_DATE_KEY, storageDate);
      localStorage.setItem(ACCESS_COUNT_KEY, String(accessCount));

      if (accessCount > 1) {
        setAccessWarningDate(displayDate);
        if (modalShownDate !== storageDate) {
          setShowAccessWarningModal(true);
          sessionStorage.setItem(ACCESS_MODAL_SHOWN_KEY, storageDate);
        }
      }
      return;
    }

    localStorage.setItem(ACCESS_DATE_KEY, storageDate);
    localStorage.setItem(ACCESS_COUNT_KEY, "1");
  }, []);

  const resetViewedQs = () => {
    setViewedQs({});
    localStorage.setItem("viewedQs", JSON.stringify({}));
  };

  // Tải dữ liệu Q hiện tại khi component mount hoặc thay đổi pageId
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError("");

      try {
        const result = await loadPageData(pageId);
        if (result.success && result.data) {
          // Lưu trữ mảng 5 Q
          const loadedAllQData = result.data.allQData || Array(5).fill(null).map(() => ({
            tapsData: Array(10).fill(null).map(() => ({
              aValues: Array(ROWS).fill(""),
              bValues: Array(ROWS).fill(""),
            })),
          }));
          setAllQData(loadedAllQData);

          setZValues(result.data.zValues || Array(ROWS).fill(""));
          setDateValues(result.data.dateValues || Array(ROWS).fill(""));
          setSourceSTTValues(
            result.data.sourceSTTValues || Array(ROWS).fill(""),
          );
          setDeletedRows(result.data.deletedRows || Array(ROWS).fill(false));
          setPageLabel(result.data.pageLabel || "");

          setPurpleRangeFrom(result.data.purpleRangeFrom || 0);
          setPurpleRangeTo(result.data.purpleRangeTo || 0);

          if (result.data.keepLastNRows || result.data.keepLastNRows === 0) {
            setKeepLastNRows(result.data.keepLastNRows);
          } else {
            setKeepLastNRows(110);
          }
          setIsDataLoaded(true);
        } else {
          setIsDataLoaded(true);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [pageId]);

  const generateTableDataArr = useCallback((tValues, skipColor = false) => {
    let actualRows = 0;
    for (let i = dateValues.length - 1; i >= 0; i--) {
      if (dateValues[i] || tValues[i]) {
        actualRows = i + 1;
        break;
      }
    }
    if (actualRows === 0) return [];
    const table = Array(actualRows)
      .fill(null)
      .map(() => Array(10).fill(null));
    for (let col = 0; col < 10; col++) {
      let y = 1;
      for (let row = 0; row < actualRows; row++) {
        if (tValues[row] === "" || tValues[row] === null || tValues[row] === undefined) {
          table[row][col] = { value: "", color: "white" };
          continue;
        }

        const tVal = tValues[row] !== "" ? parseInt(tValues[row]) : -1;
        const isRed = col === tVal && tVal !== -1;
        const isPurple =
          Number(y) >= Number(purpleRangeFrom) &&
          Number(y) <= Number(purpleRangeTo);
        let color = "white";

        if (isRed && isPurple && !skipColor) color = "purple-red";
        else if (isRed) color = "red";
        else if (isPurple && !skipColor) color = "purple";

        table[row][col] = { value: `${col}-${y}`, color: color };
        y++;
        if (isRed) y = 1;
      }
    }
    return table;
  }, [dateValues, purpleRangeFrom, purpleRangeTo]);

  const getPurpleTablesForData = useCallback((
    qAValues,
    qBValues,
    qDateValues,
    qDeletedRows,
    rangeFrom = purpleRangeFrom,
    rangeTo = purpleRangeTo,
  ) => {
    const purpleTables = {};
    const from = Number(rangeFrom) || 0;
    const to = Number(rangeTo) || 0;

    if (from > to) return purpleTables;

    let actualRows = 0;
    for (let i = ROWS - 1; i >= 0; i--) {
      if (qAValues?.[i] || qBValues?.[i] || qDateValues?.[i]) {
        actualRows = i + 1;
        break;
      }
    }

    if (actualRows === 0) return purpleTables;

    let lastRowIndex = -1;
    for (let i = actualRows - 1; i >= 0; i--) {
      if (
        !qDeletedRows?.[i] &&
        (qAValues?.[i] || qBValues?.[i] || qDateValues?.[i])
      ) {
        lastRowIndex = i;
        break;
      }
    }

    if (lastRowIndex === -1) return purpleTables;

    const tValuesArr = Array(TOTAL_TABLES)
      .fill(null)
      .map(() => Array(ROWS).fill(""));

    for (let tableIndex = 0; tableIndex < TOTAL_TABLES; tableIndex++) {
      let v1, v2;
      if (tableIndex === 0) {
        v1 = qAValues || [];
        v2 = qBValues || [];
      } else if (tableIndex === 1) {
        v1 = qBValues || [];
        v2 = tValuesArr[0];
      } else {
        v1 = tValuesArr[tableIndex - 2];
        v2 = tValuesArr[tableIndex - 1];
      }

      for (let row = 0; row < actualRows; row++) {
        if (v1[row] === "" && v2[row] === "") {
          tValuesArr[tableIndex][row] = "";
          continue;
        }

        const n1 = parseInt(v1[row]) || 0;
        const n2 = parseInt(v2[row]) || 0;
        tValuesArr[tableIndex][row] = String((n1 + n2) % 10);
      }
    }

    tValuesArr.forEach((tValues, tableIndex) => {
      const tablePurpleCells = [];

      for (let col = 0; col < 10; col++) {
        let y = 1;
        for (let row = 0; row < actualRows; row++) {
          if (qDeletedRows?.[row]) continue;
          if (tValues[row] === "" || tValues[row] === null || tValues[row] === undefined) continue;

          const tVal = tValues[row] !== "" ? parseInt(tValues[row]) : -1;
          const isPurple = y >= from && y <= to;

          if (row === lastRowIndex && isPurple) {
            tablePurpleCells.push(`${col}-${y}`);
          }

          y++;
          if (col === tVal && tVal !== -1) y = 1;
        }
      }

      if (tablePurpleCells.length > 0) {
        purpleTables[`T${tableIndex + 1}`] = tablePurpleCells;
      }
    });

    return purpleTables;
  }, [purpleRangeFrom, purpleRangeTo]);
  useEffect(() => {
    if (qPurpleInfo[pageId]?.hasPurple && !viewedQs[pageId]) {
      const v = { ...viewedQs, [pageId]: true };
      setViewedQs(v);
      localStorage.setItem("viewedQs", JSON.stringify(v));
    }
  }, [pageId, qPurpleInfo, viewedQs]);

  useEffect(() => {
    if (isDataLoaded && !isLoading) {
      const params = new URLSearchParams(window.location.search);
      const scrollToT = params.get("scrollToT");
      if (scrollToT) {
        const tableNum = parseInt(scrollToT);
        if (!isNaN(tableNum) && tableNum >= 1 && tableNum <= 100) {
          setTimeout(() => {
            const elements = document.querySelectorAll(".table-section");
            const tableElement = elements[tableNum - 1];
            if (tableElement) {
              tableElement.scrollIntoView({
                behavior: "smooth",
                block: "start",
                inline: "start",
              });
              const newUrl = window.location.pathname;
              window.history.replaceState({}, "", newUrl);
            }
          }, 600);
        }
      }
    }
  }, [isDataLoaded, isLoading]);

  useEffect(() => {
    if (!isDataLoaded) return;
    const info = {};
    for (let i = 0; i < 5; i++) {
      const qId = `q${i + 1}`;
      const qTaps = allQData[i]?.tapsData || [];
      let hasPurple = false;
      for (let tapIdx = 0; tapIdx < 10; tapIdx++) {
        const tap = qTaps[tapIdx] || { aValues: [], bValues: [] };
        const purpleTables = getPurpleTablesForData(
          tap.aValues || Array(ROWS).fill(""),
          tap.bValues || Array(ROWS).fill(""),
          dateValues,
          deletedRows,
        );
        if (Object.keys(purpleTables).length > 0) {
          hasPurple = true;
          break;
        }
      }

      if (hasPurple) {
        info[qId] = {
          hasPurple: true,
          range: `${purpleRangeFrom || 0}-${purpleRangeTo || 0}`,
        };
      }
    }
    setQPurpleInfo(info);
  }, [allQData, purpleRangeFrom, purpleRangeTo, isDataLoaded, getPurpleTablesForData, dateValues, deletedRows]);
  const { tapsTValues, tapsTableData } = useMemo(() => {
    let actualRows = 0;
    for (let i = ROWS - 1; i >= 0; i--) {
      let hasData = dateValues[i] !== "" && dateValues[i] !== null && dateValues[i] !== undefined;
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

    const nextTapsTValues = [];
    const nextTapsTableData = [];

    for (let qIdx = 0; qIdx < 5; qIdx++) {
      const qData = allQData[qIdx] || { tapsData: [] };
      for (let tapIdx = 0; tapIdx < 10; tapIdx++) {
        const tap = qData.tapsData?.[tapIdx] || { aValues: Array(ROWS).fill(""), bValues: Array(ROWS).fill("") };
        const tapA = tap.aValues;
        const tapB = tap.bValues;

        const newTValuesArr = Array(TOTAL_TABLES)
          .fill(null)
          .map(() => Array(ROWS).fill(""));
        const newTableDataArr = [];

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
          newTableDataArr.push(generateTableDataArr(newTValuesArr[i], false));
        }

        nextTapsTValues.push(newTValuesArr);
        nextTapsTableData.push(newTableDataArr);
      }
    }

    return { tapsTValues: nextTapsTValues, tapsTableData: nextTapsTableData };
  }, [allQData, dateValues, generateTableDataArr]);

  const allTableData = tapsTableData[0] || [];
  const allTValues = tapsTValues[0] || Array(TOTAL_TABLES).fill(null).map(() => Array(ROWS).fill(""));
  const aValues = allQData[0]?.tapsData?.[0]?.aValues || Array(ROWS).fill("");
  const bValues = allQData[0]?.tapsData?.[0]?.bValues || Array(ROWS).fill("");

  if (pathname === "input") {
    return (
      <>
        <InputPage accessWarningContent={renderAccessWarning(false)} />
      </>
    );
  }

  if (pathname === "chon-dong-thong") {
    return (
      <>
        <SelectRowsPage accessWarningContent={renderAccessWarning(false, { fontSize: "30px" })} />
      </>
    );
  }

  if (pathname === "bao-mau") {
    return (
      <>
        <ColorReportPage accessWarningContent={renderAccessWarning(false, { fontSize: "30px" })} />
      </>
    );
  }


  const getPurpleCellsInfoOfTap = (tableDataOfTap, tapIdx) => {
    const purpleCells = {};
    if (!tableDataOfTap) return purpleCells;
    const qNum = Math.floor(tapIdx / 10) + 1;
    const relativeTapIdx = tapIdx % 10;

    let lastRowIndex = -1;
    for (let i = dateValues.length - 1; i >= 0; i--) {
      if (!deletedRows[i] && (dateValues[i] || aValues[i] || bValues[i])) {
        lastRowIndex = i;
        break;
      }
    }

    if (lastRowIndex === -1) {
      return purpleCells;
    }

    tableDataOfTap.forEach((tableData, tableIndex) => {
      const tablePurpleCells = [];

      if (tableData && tableData[lastRowIndex]) {
        tableData[lastRowIndex].forEach((cell) => {
          if (cell.color === "purple" || cell.color === "purple-red") {
            tablePurpleCells.push(cell.value);
          }
        });
      }

      if (tablePurpleCells.length > 0) {
        const globalTIndex = (qNum - 1) * 20 + relativeTapIdx * 2 + tableIndex + 1;
        purpleCells[`T${globalTIndex}`] = tablePurpleCells;
      }
    });

    return purpleCells;
  };

  const getFuturePurpleCellsInfoOfTap = (tableDataOfTap, tapIdx) => {
    const purpleCells = {};
    if (!tableDataOfTap) return purpleCells;
    const qNum = Math.floor(tapIdx / 10) + 1;
    const relativeTapIdx = tapIdx % 10;

    tableDataOfTap.forEach((tableData, tableIndex) => {
      const tablePurpleCells = [];
      const futureRow = getFutureRow(tableData);

      futureRow.forEach((cell) => {
        if (cell.color === "purple" || cell.color === "purple-red") {
          tablePurpleCells.push(cell.value);
        }
      });

      if (tablePurpleCells.length > 0) {
        const globalTIndex = (qNum - 1) * 20 + relativeTapIdx * 2 + tableIndex + 1;
        purpleCells[`T${globalTIndex}`] = tablePurpleCells;
      }
    });

    return purpleCells;
  };

  const getGlobalPurpleCellsInfo = () => {
    const reports = [];
    for (let tapIdx = 0; tapIdx < 50; tapIdx++) {
      const tapTableData = tapsTableData[tapIdx];
      if (tapTableData) {
        const purpleCells = getFuturePurpleCellsInfoOfTap(tapTableData, tapIdx);
        const tableNames = Object.keys(purpleCells);
        if (tableNames.length > 0) {
          const qNum = Math.floor(tapIdx / 10) + 1;
          const relativeTapNum = (tapIdx % 10) + 1;
          reports.push(`Q${qNum} Tập ${relativeTapNum}: ${tableNames.join(",")}`);
        }
      }
    }
    return reports.length > 0 ? reports.join(", ") : "Không có báo màu";
  };

  const getPurpleCellsInfo = () => {
    for (let tapIdx = 0; tapIdx < 50; tapIdx++) {
      const info = getPurpleCellsInfoOfTap(tapsTableData[tapIdx], tapIdx);
      if (Object.keys(info).length > 0) return info;
    }
    return {};
  };


  const handleGoToTable = () => {
    const tableNum = parseInt(goToTableNumber);

    if (isNaN(tableNum) || tableNum < 1 || tableNum > 100) {
      alert("⚠️ Vui lòng nhập số từ 1 đến 100");
      return;
    }

    const tableElement = document.querySelectorAll(".table-section")[tableNum - 1];

    if (tableElement) {
      tableElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "start",
      });
      setGoToTableNumber("");
    } else {
      alert(`⚠️ Không tìm thấy bảng T${tableNum}`);
    }
  };

  const getFutureRow = (tableData) => {
    if (!tableData || tableData.length === 0)
      return Array(10).fill({ value: "", color: "white" });

    const futureRow = [];
    for (let col = 0; col < 10; col++) {
      let lastCell = null;
      for (let row = tableData.length - 1; row >= 0; row--) {
        if (tableData[row][col] && tableData[row][col].value !== "") {
          lastCell = tableData[row][col];
          break;
        }
      }

      let nextY;
      if (!lastCell) {
        nextY = 1;
      } else {
        const parts = lastCell.value.split("-");
        const lastY = parseInt(parts[1]) || 0;
        const isRed = lastCell.color && lastCell.color.includes("red");
        nextY = isRed ? 1 : lastY + 1;
      }

      const isPurple =
        Number(nextY) >= Number(purpleRangeFrom) &&
        Number(nextY) <= Number(purpleRangeTo);
      const color = isPurple ? "purple" : "white";
      futureRow.push({ value: `${col}-${nextY}`, color: color });
    }
    return futureRow;
  };





  const handleSaveData = async () => {
    setSaveStatus("💾 Đang lưu...");

    const result = await savePageData(
      pageId,
      null,
      null,
      zValues,
      dateValues,
      deletedRows,
      sourceSTTValues,
      purpleRangeFrom,
      purpleRangeTo,
      keepLastNRows,
      allQData,
      pageLabel,
      undefined,
    );

    if (result.success) {
      setSaveStatus("✅ Đã lưu thành công");
    } else {
      setSaveStatus("⚠️ Lỗi: " + result.error);
      setError(result.error);
    }

    setTimeout(() => setSaveStatus(""), 2000);
  };

  const handleCellClick = (tableIndex, rowIndex, colIndex) => {
    setHighlightedCells((prev) => {
      const currentTable = prev[tableIndex] || {};
      const currentRow = currentTable[rowIndex] || {};

      const newRow = { ...currentRow };
      if (newRow[colIndex]) {
        delete newRow[colIndex];
      } else {
        newRow[colIndex] = true;
      }

      return {
        ...prev,
        [tableIndex]: {
          ...currentTable,
          [rowIndex]: newRow,
        },
      };
    });
  };

  const handleTCellClick = (tableIndex, rowIndex) => {
    setHighlightedTCells((prev) => {
      const currentTable = prev[tableIndex] || {};
      const newTable = { ...currentTable };
      if (newTable[rowIndex]) {
        delete newTable[rowIndex];
      } else {
        newTable[rowIndex] = true;
      }
      return { ...prev, [tableIndex]: newTable };
    });
  };

  const handleACellClick = (rowIndex) => {
    setHighlightedACells((prev) => {
      const next = { ...prev };
      if (next[rowIndex]) delete next[rowIndex];
      else next[rowIndex] = true;
      return next;
    });
  };

  const handleBCellClick = (rowIndex) => {
    setHighlightedBCells((prev) => {
      const next = { ...prev };
      if (next[rowIndex]) delete next[rowIndex];
      else next[rowIndex] = true;
      return next;
    });
  };

  const handleAColHeader = () => setHighlightedAColumn((prev) => !prev);
  const handleBColHeader = () => setHighlightedBColumn((prev) => !prev);
  const handleTColHeader = (tableIndex) =>
    setHighlightedTColumns((prev) => ({ ...prev, [tableIndex]: !prev[tableIndex] }));

  const handleDataColHeader = (tableIndex, colIndex) => {
    setHighlightedDataColumns((prev) => {
      const table = prev[tableIndex] || {};
      return {
        ...prev,
        [tableIndex]: {
          ...table,
          [colIndex]: !table[colIndex],
        },
      };
    });
  };

  const handleRowClick = (rowIndex) => {
    setHighlightedRows((prev) => ({
      ...prev,
      [rowIndex]: !prev[rowIndex],
    }));
  };

  const clearColumnHighlights = () => {
    setHighlightedTCells({});
    setHighlightedACells({});
    setHighlightedBCells({});
    setHighlightedCells({});
    setHighlightedTColumns({});
    setHighlightedAColumn(false);
    setHighlightedBColumn(false);
    setHighlightedDataColumns({});
    setHighlightedRows({});
  };

  const handleInputAllQ = () => {
    window.location.href = "/input";
  };





  const confirmAddRow = async () => {
    if (!newRowDate) {
      alert("⚠️ Vui lòng chọn ngày!");
      return;
    }

    setIsAddingRow(true);

    let lastRowIndex = -1;
    for (let i = ROWS - 1; i >= 0; i--) {
      if (deletedRows[i]) continue;
      if (dateValues[i] || allTValues[0][i] || allTValues[1][i]) {
        lastRowIndex = i;
        break;
      }
    }

    const newRowIndex = lastRowIndex + 1;

    if (newRowIndex >= ROWS) {
      alert("⚠️ Đã đạt giới hạn số hàng!");
      setShowAddRowModal(false);
      return;
    }

    const newDateValues = [...dateValues];
    const newZValues = [...zValues];
    const newDeletedRows = [...deletedRows];

    newDateValues[newRowIndex] = newRowDate;
    newZValues[newRowIndex] = "";
    newDeletedRows[newRowIndex] = false;

    setDateValues(newDateValues);
    setZValues(newZValues);
    setDeletedRows(newDeletedRows);

    const updatedAllQData = allQData.map((qItem) => {
      const nextTaps = qItem.tapsData.map((tap) => {
        const nextA = [...tap.aValues];
        const nextB = [...tap.bValues];
        nextA[newRowIndex] = newRowT1;
        nextB[newRowIndex] = newRowT2;
        return { aValues: nextA, bValues: nextB };
      });
      return { ...qItem, tapsData: nextTaps };
    });

    setAllQData(updatedAllQData);

    setSaveStatus("💾 Đang lưu...");
    const result = await savePageData(
      pageId,
      null,
      null,
      newZValues,
      newDateValues,
      newDeletedRows,
      sourceSTTValues,
      purpleRangeFrom,
      purpleRangeTo,
      keepLastNRows,
      updatedAllQData,
      pageLabel,
      undefined,
    );

    if (result.success) {
      setSaveStatus("✅ Đã thêm hàng mới");
    } else {
      setSaveStatus("⚠️ Lỗi: " + result.error);
    }
    resetViewedQs();

    setShowAddRowModal(false);
    setIsAddingRow(false);

    alert(`✅ Đã thêm hàng mới với ngày ${newRowDate}`);
    window.location.reload();
  };

  const applyKeepLastNRows = async (n) => {
    if (!n || n <= 0) {
      alert("⚠️ Vui lòng nhập số dòng hợp lệ (> 0)");
      return;
    }

    const nonDeletedRowsWithData = [];
    for (let i = 0; i < ROWS; i++) {
      if (
        !deletedRows[i] &&
        (dateValues[i] || aValues[i] || bValues[i] || zValues[i])
      ) {
        nonDeletedRowsWithData.push(i);
      }
    }

    if (nonDeletedRowsWithData.length === 0) {
      alert("⚠️ Không có dòng nào có dữ liệu (chưa xóa)!");
      return;
    }

    const rowsToKeep = nonDeletedRowsWithData.slice(-n);
    const newDeletedRows = [...deletedRows];

    for (let i = 0; i < ROWS; i++) {
      if (!deletedRows[i]) {
        if (!rowsToKeep.includes(i)) {
          newDeletedRows[i] = true;
        }
      }
    }

    setDeletedRows(newDeletedRows);

    setSaveStatus("💾 Đang lưu...");
    const result = await savePageData(
      pageId,
      null,
      null,
      zValues,
      dateValues,
      newDeletedRows,
      sourceSTTValues,
      purpleRangeFrom,
      purpleRangeTo,
      n,
      allQData,
      pageLabel,
      undefined,
    );

    if (result.success) {
      setSaveStatus("✅ Đã lưu cài đặt");
    } else {
      setSaveStatus("⚠️ Lỗi: " + result.error);
    }
    setTimeout(() => setSaveStatus(""), 2000);

    alert(`✅ Đã xóa các dòng cũ, giữ lại ${n} dòng cuối cùng!`);
  };

  const handleKeepLastNRows = async () => {
    const n = parseInt(keepLastNRows);
    await applyKeepLastNRows(n);
  };

  const handleDeleteLastRow = async () => {
    let lastRowIndex = -1;
    for (let i = ROWS - 1; i >= 0; i--) {
      if (!deletedRows[i]) {
        if (dateValues[i] || aValues[i] || bValues[i] || zValues[i]) {
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

    const newZValues = [...zValues];
    const newDateValues = [...dateValues];
    const newDeletedRows = [...deletedRows];

    newZValues.splice(lastRowIndex, 1);
    newDateValues.splice(lastRowIndex, 1);
    newDeletedRows.splice(lastRowIndex, 1);

    newZValues.push("");
    newDateValues.push("");
    newDeletedRows.push(false);

    setZValues(newZValues);
    setDateValues(newDateValues);
    setDeletedRows(newDeletedRows);

    const updatedAllQData = allQData.map((qItem) => {
      const nextTaps = qItem.tapsData.map((tap) => {
        const nextA = [...tap.aValues];
        const nextB = [...tap.bValues];
        nextA.splice(lastRowIndex, 1);
        nextB.splice(lastRowIndex, 1);
        nextA.push("");
        nextB.push("");
        return { aValues: nextA, bValues: nextB };
      });
      return { ...qItem, tapsData: nextTaps };
    });

    setAllQData(updatedAllQData);

    setSaveStatus("💾 Đang lưu...");
    const result = await savePageData(
      pageId,
      null,
      null,
      newZValues,
      newDateValues,
      newDeletedRows,
      sourceSTTValues,
      purpleRangeFrom,
      purpleRangeTo,
      keepLastNRows,
      updatedAllQData,
      pageLabel,
      undefined,
    );

    if (result.success) {
      setSaveStatus("✅ Đã xóa dòng cuối cùng");
    } else {
      setSaveStatus("⚠️ Lỗi: " + result.error);
    }
    setTimeout(() => setSaveStatus(""), 2000);

    setShowDeleteLastRowModal(false);
    alert(`✅ Đã xóa dòng mới nhất thành công!`);
  };

  const handleDeleteFirstRow = async () => {
    let firstRowIndex = -1;
    for (let i = 0; i < ROWS; i++) {
      if (deletedRows[i]) continue;
      if (dateValues[i] || allTValues[0][i] || allTValues[1][i]) {
        firstRowIndex = i;
        break;
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

    setSaveStatus("💾 Đang lưu...");
    const result = await savePageData(
      pageId,
      null,
      null,
      zValues,
      dateValues,
      newDeletedRows,
      sourceSTTValues,
      purpleRangeFrom,
      purpleRangeTo,
      keepLastNRows,
      allQData,
      pageLabel,
      undefined,
    );

    if (result.success) {
      setSaveStatus("✅ Đã xóa dòng đầu tiên");
    } else {
      setSaveStatus("⚠️ Lỗi: " + result.error);
    }
    setTimeout(() => setSaveStatus(""), 2000);

    setShowDeleteFirstRowModal(false);
    alert(`✅ Đã xóa dòng đầu tiên!`);
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
    } else if (deleteOption === "dates") {
      if (!deleteDateFrom || !deleteDateTo) {
        alert("⚠️ Vui lòng nhập đầy đủ ngày!");
        return;
      }
      setShowDeleteModal(false);
      setShowDeleteByDatesModal(true);
    } else if (deleteOption === "rows") {
      if (!deleteRowFrom || !deleteRowTo) {
        alert("⚠️ Vui lòng nhập đầy đủ STT dòng!");
        return;
      }
      setShowDeleteModal(false);
      setShowDeleteByRowsModal(true);
    }
  };

  const confirmDeleteAll = async () => {
    try {
      await deletePageData(pageId);

      setDateValues(Array(ROWS).fill(""));
      setDeletedRows(Array(ROWS).fill(false));
      setAllQData(
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
      setIsDataLoaded(false);

      setShowDeleteAllModal(false);
      alert("✅ Đã xóa tất cả dữ liệu bảng tính tổng hợp!");

      setDeleteOption("all");
      setDeleteDateFrom("");
      setDeleteDateTo("");
    } catch (error) {
      alert("⚠️ Lỗi: " + error.message);
    }
  };

  const confirmDeleteByDates = async () => {
    try {
      const newDeletedRows = [...deletedRows];
      let deletedCount = 0;

      for (let i = 0; i < ROWS; i++) {
        const dateStr = dateValues[i];
        const shouldDelete =
          dateStr && dateStr >= deleteDateFrom && dateStr <= deleteDateTo;

        if (shouldDelete) {
          newDeletedRows[i] = true;
          deletedCount++;
        }
      }

      setDeletedRows(newDeletedRows);

      setSaveStatus("💾 Đang lưu...");
      const result = await savePageData(
        pageId,
        null,
        null,
        zValues,
        dateValues,
        newDeletedRows,
        sourceSTTValues,
        purpleRangeFrom,
        purpleRangeTo,
        keepLastNRows,
        allQData,
        pageLabel,
        undefined,
      );

      if (result.success) {
        setSaveStatus("✅ Đã lưu dữ liệu thành công");
        alert(
          `✅ Đã xóa ${deletedCount} dòng từ ${deleteDateFrom} đến ${deleteDateTo} thành công!`,
        );
      } else {
        setSaveStatus("⚠️ Lỗi: " + result.error);
      }

      setTimeout(() => setSaveStatus(""), 2000);
      setShowDeleteByDatesModal(false);

      setDeleteOption("all");
      setDeleteDateFrom("");
      setDeleteDateTo("");
    } catch (error) {
      alert("⚠️ Lỗi: " + error.message);
    }
  };

  const confirmDeleteByRows = async () => {
    try {
      const from = parseInt(deleteRowFrom);
      const to = parseInt(deleteRowTo);

      if (isNaN(from) || isNaN(to) || from < 0 || to < 0 || from > to) {
        alert("⚠️ STT dòng không hợp lệ!");
        return;
      }

      const visibleIndices = [];
      for (let i = 0; i < ROWS; i++) {
        if (!deletedRows[i]) {
          visibleIndices.push(i);
        }
      }

      if (from >= visibleIndices.length) {
        alert("⚠️ STT bắt đầu vượt quá số lượng dòng hiện có!");
        return;
      }

      const newDeletedRows = [...deletedRows];
      let deletedCount = 0;

      for (
        let vIdx = from;
        vIdx <= Math.min(to, visibleIndices.length - 1);
        vIdx++
      ) {
        const actualIndex = visibleIndices[vIdx];
        newDeletedRows[actualIndex] = true;
        deletedCount++;
      }

      setDeletedRows(newDeletedRows);

      setSaveStatus("💾 Đang lưu...");
      const result = await savePageData(
        pageId,
        null,
        null,
        zValues,
        dateValues,
        newDeletedRows,
        sourceSTTValues,
        purpleRangeFrom,
        purpleRangeTo,
        keepLastNRows,
        allQData,
        pageLabel,
        undefined,
      );

      if (result.success) {
        setSaveStatus("✅ Đã lưu dữ liệu thành công");
        alert(
          `✅ Đã xóa ${deletedCount} dòng từ STT ${from} đến ${to} thành công!`,
        );
      } else {
        setSaveStatus("⚠️ Lỗi: " + result.error);
      }

      setTimeout(() => setSaveStatus(""), 2000);
      setShowDeleteByRowsModal(false);

      setDeleteOption("all");
      setDeleteRowFrom("");
      setDeleteRowTo("");
    } catch (error) {
      alert("⚠️ Lỗi: " + error.message);
    }
  };

  const handleSavePurpleRange = async () => {
    try {
      const from = parseInt(tempPurpleRangeFrom) || 0;
      const to = parseInt(tempPurpleRangeTo) || 0;

      if (from < 0 || to < 0) {
        alert("⚠️ Giá trị phải lớn hơn hoặc bằng 0!");
        return;
      }

      if (from > to) {
        alert("⚠️ Giá trị 'Từ' phải nhỏ hơn hoặc bằng 'Đến'!");
        return;
      }

      setIsSavingPurpleRange(true);
      setPurpleRangeFrom(from);
      setPurpleRangeTo(to);

      setSaveStatus("💾 Đang lưu...");
      const result = await savePageData(
        pageId,
        null,
        null,
        zValues,
        dateValues,
        deletedRows,
        sourceSTTValues,
        from,
        to,
        keepLastNRows,
        allQData,
        pageLabel,
        undefined,
      );

      if (result.success) {
        setSaveStatus("✅ Đã lưu cài đặt báo màu");
      } else {
        setSaveStatus("⚠️ Lỗi khi lưu");
      }
      setTimeout(() => setSaveStatus(""), 2000);

      setShowPurpleRangeModal(false);
      alert(`✅ Đã lưu khoảng báo màu: ${from} - ${to}`);
    } catch (error) {
      console.error("Error saving purple range:", error);
      alert("⚠️ Lỗi khi lưu cài đặt: " + error.message);
      setSaveStatus("⚠️ Lỗi khi lưu");
      setTimeout(() => setSaveStatus(""), 2000);
    } finally {
      setIsSavingPurpleRange(false);
    }
  };

  const handleSaveKeepLastNRows = async () => {
    try {
      const n = parseInt(tempKeepLastNRows);

      if (!n || n <= 0) {
        alert("⚠️ Vui lòng nhập số dòng hợp lệ (lớn hơn 0)!");
        return;
      }

      setIsSavingKeepLastNRows(true);
      setKeepLastNRows(n);

      setSaveStatus("💾 Đang lưu...");
      const result = await savePageData(
        pageId,
        null,
        null,
        zValues,
        dateValues,
        deletedRows,
        sourceSTTValues,
        purpleRangeFrom,
        purpleRangeTo,
        n,
        allQData,
        pageLabel,
        undefined,
      );

      if (result.success) {
        setSaveStatus("✅ Đã lưu cài đặt dòng tồn tại");
      } else {
        setSaveStatus("⚠️ Lỗi khi lưu");
      }

      setShowKeepLastNRowsSettingsModal(false);

      if (
        confirm(
          `✅ Đã lưu cài đặt: ${n} dòng tồn tại.\n\nBạn có muốn thực hiện xóa các dòng cũ để CHỈ GIỮ LẠI ${n} dòng cuối cùng ngay bây giờ không?`,
        )
      ) {
        await applyKeepLastNRows(n);
      }
    } catch (error) {
      console.error("Error saving keep last N rows:", error);
      alert("⚠️ Lỗi khi lưu cài đặt: " + error.message);
      setSaveStatus("⚠️ Lỗi khi lưu");
      setTimeout(() => setSaveStatus(""), 2000);
    } finally {
      setIsSavingKeepLastNRows(false);
    }
  };

  const currentPageHasPurple = Object.keys(getPurpleCellsInfo()).length > 0;

  return (
    <div className="app-container-full">
      <div
        style={{
          width: "100%",
          textAlign: "center",
          backgroundColor: "#f8f9fa",
          borderBottom: "2px solid #dee2e6",
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
      
      <div className="top-toolbar">
        <div className="toolbar-section">
          <div
            className="toolbar-group"
            style={{
              border: "3px solid #28a745",
              borderRadius: "8px",
              padding: "10px 15px",
              backgroundColor: "#e8f5e9",
            }}
          >
            <button
              className="toolbar-button"
              disabled
              style={{
                fontSize: "25px",
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
              Bt - {import.meta.env.VITE_APP_STT || ""}
              {import.meta.env.VITE_SITE_ID === "site_a" ? "A" : "B"}
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="toolbar-button danger"
              style={{ fontSize: "25px", fontWeight: "bold" }}
            >
              🗑️ Xóa dl
            </button>
            <button onClick={clearColumnHighlights} className="toolbar-button" style={{ fontSize: "25px", fontWeight: "bold" }}>
              🔄 X màu d.c
            </button>
            <button onClick={handleSaveData} className="toolbar-button success" style={{ fontSize: "25px", fontWeight: "bold" }}>
              💾 Lưu dl
            </button>
          </div>



          <div
            className="toolbar-group"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "3px solid #007bff",
              borderRadius: "8px",
              padding: "10px 12px",
              backgroundColor: "#e7f3ff",
            }}
          >
            <label style={{ fontSize: "25px", fontWeight: "bold" }}>
              Báo màu:
            </label>
            <span
              style={{
                fontSize: "25px",
                fontWeight: "600",
                color: "#333",
                padding: "6px 12px",
                backgroundColor: "#fff",
                border: "2px solid #ffc107",
                borderRadius: "4px",
                minWidth: "120px",
                textAlign: "center",
              }}
            >
              {purpleRangeFrom || 0} - {purpleRangeTo || 0}
            </span>
            <button
              onClick={() => {
                setTempPurpleRangeFrom(purpleRangeFrom);
                setTempPurpleRangeTo(purpleRangeTo);
                setShowPurpleRangeModal(true);
              }}
              className="toolbar-button"
              style={{
                fontSize: "25px",
                padding: "6px 12px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              ⚙️
            </button>
          </div>

          <div
            className="toolbar-group"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "3px solid #007bff",
              borderRadius: "8px",
              padding: "10px 15px",
              backgroundColor: "#e7f3ff",
            }}
          >
            <label style={{ fontSize: "25px", fontWeight: "bold" }}>
              📊 Dòng tồn tại:
            </label>
            <span
              style={{
                fontSize: "25px",
                fontWeight: "600",
                color: "#333",
                padding: "6px 12px",
                backgroundColor: "#fff",
                border: "2px solid #007bff",
                borderRadius: "4px",
                minWidth: "80px",
                textAlign: "center",
              }}
            >
              {keepLastNRows || 0}
            </span>
            <button
              onClick={() => {
                setTempKeepLastNRows(keepLastNRows);
                setShowKeepLastNRowsSettingsModal(true);
              }}
              className="toolbar-button"
              style={{
                fontSize: "25px",
                padding: "6px 12px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              ⚙️
            </button>
          </div>

          <div
            className="toolbar-group"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              border: "3px solid #007bff",
              borderRadius: "8px",
              padding: "8px 12px",
              backgroundColor: "#e7f3ff",
            }}
          >
            <button
              onClick={handleInputAllQ}
              className="toolbar-button primary"
              style={{
                fontSize: "25px",
                padding: "8px 16px",
                borderRadius: "8px",
              }}
            >
              📥 Về BT
            </button>
            <button
              onClick={() => (window.location.href = "/chon-dong-thong")}
              className="toolbar-button"
              style={{
                fontSize: "25px",
                padding: "8px 16px",
                borderRadius: "8px",
                backgroundColor: "#17a2b8",
                color: "white",
                border: "none",
                fontWeight: "bold",
              }}
            >
              📋 Chọn dòng thông
            </button>
            <button
              onClick={() => (window.location.href = "/bao-mau")}
              className="toolbar-button"
              style={{
                fontSize: "25px",
                padding: "8px 16px",
                borderRadius: "8px",
                backgroundColor: "#ffc107",
                color: "#212529",
                border: "none",
                fontWeight: "bold",
              }}
            >
              🎨 Báo màu
            </button>
          </div>
          {renderAccessWarning()}

          <div
            style={{
              marginLeft: "12px",
              padding: "8px 12px",
              backgroundColor: "#fff3cd",
              border: "2px solid #ffc107",
              borderRadius: "6px",
              fontSize: "24px",
              fontWeight: "bold",
              whiteSpace: "normal",
              maxWidth: "70%",
            }}
          >
            📍 Báo màu các Q: {getGlobalPurpleCellsInfo()}
          </div>

          <div className="toolbar-group">
            {isLoading && (
              <span className="status-loading">⏳ Đang tải...</span>
            )}
            {!isLoading && saveStatus && (
              <span className="status-success">{saveStatus}</span>
            )}
            {error && <span className="status-error">{error}</span>}
          </div>

          <div
            className="toolbar-group"
            style={{
              marginLeft: "12px",
              border: "3px solid #28a745",
              borderRadius: "8px",
              padding: "5px 12px",
              backgroundColor: "#e8f5e9",
            }}
          >
            <input
              type="number"
              value={goToTableNumber}
              onChange={(e) => setGoToTableNumber(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleGoToTable();
                }
              }}
              min="1"
              max={100}
              style={{
                width: "80px",
                padding: "8px",
                fontSize: "18px",
                border: "2px solid #28a745",
                borderRadius: "4px",
                textAlign: "center",
              }}
            />
            <button
              onClick={handleGoToTable}
              className="toolbar-button primary"
              style={{ fontSize: "25px", fontWeight: "bold", padding: "8px 16px" }}
            >
              Xem
            </button>
            <button
              className="toolbar-button"
              style={{
                fontSize: "25px",
                padding: "8px 16px",
                backgroundColor: "#17a2b8",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "default",
                marginLeft: "8px",
                fontWeight: "bold",
              }}
            >
              📊 D đã toán:{" "}
              {allTableData[0]
                ? allTableData[0].filter((_, i) => !deletedRows[i]).length
                : 0}
            </button>
          </div>
        </div>
      </div>

      <div className="main-content" style={{ overflow: "auto" }}>
        {isGenerating && (
          <div className="loading-overlay">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Đang tính toán {allTableData.length} bảng...</p>
            </div>
          </div>
        )}

        <div className="taps-container" style={{ display: "flex", flexDirection: "row", gap: "40px", width: "max-content" }}>
          {tapsTableData.map((tapTableData, tapIndex) => {
            const qIdx = Math.floor(tapIndex / 10);
            const relativeTapIdx = tapIndex % 10;
            return (
              <div key={tapIndex} className="tap-section" style={{ border: "2px solid #ccc", borderRadius: "10px", padding: "20px", backgroundColor: "#fff" }}>
                <div className="tables-container" style={{ display: "flex", gap: "24px", width: "max-content", overflow: "visible" }}>
                  {tapTableData.map((tableData, tableIndex) => (
                    <div
                      key={tableIndex}
                      className={`table-section ${tableIndex === 0 ? "first-table" : ""}`}
                    >
                      <div
                        className="data-grid-wrapper"
                        style={{ maxHeight: "none", overflow: "visible" }}
                      >
                        {tableData.length > 0 ? (
                          <table className="data-grid">
                            <colgroup>
                              <col style={{ width: "80px" }} />
                              <col style={{ width: "190px" }} />
                              <col style={{ width: "150px" }} />
                              {tableIndex === 0 && (
                                <>
                                  <col style={{ width: "100px" }} />
                                  <col style={{ width: "100px" }} />
                                </>
                              )}
                              <col style={{ width: "100px" }} />
                              {[...Array(10)].map((_, i) => (
                                <col key={i} style={{ width: "120px" }} />
                              ))}
                            </colgroup>
                            <thead>
                              <tr>
                                <th colSpan="3" className="group-header">
                                  Q{qIdx + 1}
                                  {tapIndex === 0 && (
                                    <input
                                      type="text"
                                      value={pageLabel}
                                      onChange={(e) => setPageLabel(e.target.value)}
                                      placeholder="Ghi chú..."
                                      className="header-label-input"
                                      style={{
                                        marginLeft: "15px",
                                        fontSize: "22px",
                                        width: "300px",
                                        backgroundColor: "rgba(255, 255, 255, 0.5)",
                                        border: "1px solid #ddd",
                                        padding: "4px 10px",
                                        borderRadius: "6px"
                                      }}
                                    />
                                  )}
                                </th>
                                {tableIndex === 0 && (
                                  <>
                                    <th colSpan="1" className="group-header">
                                      A
                                    </th>
                                    <th colSpan="1" className="group-header">
                                      B
                                    </th>
                                  </>
                                )}
                                <th colSpan="1" className="group-header">
                                  Thông
                                </th>
                                <th colSpan="10" className="group-header">
                                  Q{qIdx + 1} - Tham số (Tập {relativeTapIdx + 1})
                                </th>
                              </tr>
                              <tr>
                                <th className="col-header fixed">STT</th>
                                <th
                                  className="col-header fixed date-col-header"
                                  style={{ minWidth: "190px", width: "190px" }}
                                >
                                  Ngày
                                </th>
                                <th
                                  className="col-header fixed"
                                  style={{ minWidth: "150px", width: "150px" }}
                                ></th>
                                {tableIndex === 0 && (
                                  <>
                                    <th
                                      className={`col-header fixed col-header-clickable ${
                                        highlightedAColumn ? "col-header-highlighted" : ""
                                      }`}
                                      onClick={handleAColHeader}
                                    >
                                      A
                                    </th>
                                    <th
                                      className={`col-header fixed col-header-clickable ${
                                        highlightedBColumn ? "col-header-highlighted" : ""
                                      }`}
                                      onClick={handleBColHeader}
                                    >
                                      B
                                    </th>
                                  </>
                                )}
                                <th
                                  className={`col-header fixed col-header-clickable ${
                                    highlightedTColumns[tableIndex] ? "col-header-highlighted" : ""
                                  }`}
                                  onClick={() => handleTColHeader(tableIndex)}
                                >
                                  T{tapIndex * 2 + tableIndex + 1}
                                </th>
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                  <th
                                    key={num}
                                    className={`col-header col-header-clickable ${
                                      highlightedDataColumns[tableIndex]?.[num]
                                        ? "col-header-highlighted"
                                        : ""
                                    }`}
                                    onClick={() => handleDataColHeader(tableIndex, num)}
                                  >
                                    {num}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                let displayRowNumber = -1;
                                return tableData.map((row, rowIndex) => {
                                  if (deletedRows[rowIndex]) return null;

                                  displayRowNumber++;
                                  return (
                                    <tr key={rowIndex}>
                                      <td
                                        className={`data-cell fixed ${
                                          highlightedRows[rowIndex] ? "highlighted-row" : ""
                                        }`}
                                        onClick={() => handleRowClick(rowIndex)}
                                        style={{ cursor: "pointer" }}
                                      >
                                        {String(displayRowNumber).padStart(2, "0")}
                                      </td>
                                      <td
                                        className={`data-cell fixed date-col ${
                                          highlightedRows[rowIndex] ? "highlighted-row" : ""
                                        }`}
                                        onClick={() => handleRowClick(rowIndex)}
                                        style={{ cursor: "pointer" }}
                                      >
                                        <input
                                          type="date"
                                          className="date-input"
                                          value={dateValues[rowIndex] || ""}
                                          style={{ pointerEvents: "none" }}
                                          readOnly
                                        />
                                      </td>
                                      <td
                                        className={`data-cell fixed ${
                                          highlightedRows[rowIndex] ? "highlighted-row" : ""
                                        }`}
                                        style={{ minWidth: "150px", width: "150px" }}
                                      >
                                        <input
                                          type="text"
                                          className="grid-input"
                                          value={sourceSTTValues[rowIndex] || ""}
                                          readOnly={true}
                                          style={{
                                            width: "100%",
                                            border: "none",
                                            background: "transparent",
                                            fontSize: "35px",
                                            textAlign: "center",
                                            fontWeight: "bold",
                                            color: "#6f42c1",
                                          }}
                                        />
                                      </td>
                                      {tableIndex === 0 && (
                                        <>
                                          <td
                                            className={`data-cell fixed value-col ${
                                              highlightedACells[rowIndex]
                                                ? "highlighted-t-cell"
                                                : highlightedAColumn
                                                ? "col-highlighted"
                                                : highlightedRows[rowIndex]
                                                ? "highlighted-row"
                                                : ""
                                            }`}
                                            onClick={() => handleACellClick(rowIndex)}
                                          >
                                            <input
                                              type="text"
                                              className="grid-input"
                                              value={allQData[qIdx]?.tapsData?.[relativeTapIdx]?.aValues[rowIndex] || ""}
                                              readOnly={true}
                                              style={{
                                                width: "100%",
                                                border: "none",
                                                background: "transparent",
                                                fontSize: "35px",
                                                textAlign: "center",
                                                color: highlightedACells[rowIndex]
                                                  ? "white"
                                                  : "#ef4444",
                                                fontWeight: "600",
                                                pointerEvents: "none",
                                              }}
                                            />
                                          </td>
                                          <td
                                            className={`data-cell fixed value-col ${
                                              highlightedBCells[rowIndex]
                                                ? "highlighted-t-cell"
                                                : highlightedBColumn
                                                ? "col-highlighted"
                                                : highlightedRows[rowIndex]
                                                ? "highlighted-row"
                                                : ""
                                            }`}
                                            onClick={() => handleBCellClick(rowIndex)}
                                          >
                                            <input
                                              type="text"
                                              className="grid-input"
                                              value={allQData[qIdx]?.tapsData?.[relativeTapIdx]?.bValues[rowIndex] || ""}
                                              readOnly={true}
                                              style={{
                                                width: "100%",
                                                border: "none",
                                                background: "transparent",
                                                fontSize: "35px",
                                                textAlign: "center",
                                                color: highlightedBCells[rowIndex]
                                                  ? "white"
                                                  : "#ef4444",
                                                fontWeight: "600",
                                                pointerEvents: "none",
                                              }}
                                            />
                                          </td>
                                        </>
                                      )}
                                      <td
                                        className={`data-cell fixed value-col ${
                                          highlightedTCells[tableIndex]?.[rowIndex]
                                            ? "highlighted-t-cell"
                                            : highlightedTColumns[tableIndex]
                                            ? "col-highlighted"
                                            : highlightedRows[rowIndex]
                                            ? "highlighted-row"
                                            : ""
                                        }`}
                                        onClick={() =>
                                          handleTCellClick(tableIndex, rowIndex)
                                        }
                                      >
                                        <input
                                          type="text"
                                          className="grid-input"
                                          value={tapsTValues[tapIndex]?.[tableIndex]?.[rowIndex] || ""}
                                          onChange={() => {}}
                                          readOnly={true}
                                          style={{
                                            pointerEvents: "none",
                                          }}
                                        />
                                      </td>
                                      {row.map((cell, colIndex) => (
                                        <td
                                          key={colIndex}
                                          className={`data-cell ${cell.color} ${
                                            highlightedCells[tableIndex]?.[rowIndex]?.[colIndex]
                                              ? "highlighted-cell"
                                              : highlightedDataColumns[tableIndex]?.[colIndex]
                                              ? "col-highlighted"
                                              : highlightedRows[rowIndex]
                                              ? "highlighted-row"
                                              : ""
                                          }`}
                                          onClick={() =>
                                            handleCellClick(
                                              tableIndex,
                                              rowIndex,
                                              colIndex,
                                            )
                                          }
                                        >
                                          {cell.value}
                                        </td>
                                      ))}
                                    </tr>
                                  );
                                });
                              })()}

                              {tableData.length > 0 && (
                                <tr className="future-row">
                                  <td
                                    className="data-cell fixed future-cell"
                                    style={{
                                      opacity: 0.5,
                                      fontStyle: "italic",
                                      height: "50px",
                                      fontWeight: "300",
                                    }}
                                  >
                                    &nbsp;
                                  </td>
                                  <td
                                    className="data-cell fixed future-cell"
                                    style={{
                                      opacity: 0.5,
                                      fontStyle: "italic",
                                      fontWeight: "300",
                                    }}
                                  >
                                    &nbsp;
                                  </td>
                                  <td
                                    className="data-cell fixed future-cell"
                                    style={{
                                      fontStyle: "italic",
                                      fontWeight: 600,
                                    }}
                                  >
                                    &nbsp;
                                  </td>
                                  {tableIndex === 0 && (
                                    <>
                                      <td
                                        className="data-cell fixed future-cell"
                                        style={{
                                          fontStyle: "italic",
                                          fontWeight: 600,
                                        }}
                                      >
                                        &nbsp;
                                      </td>
                                      <td
                                        className="data-cell fixed future-cell"
                                        style={{
                                          fontStyle: "italic",
                                          fontWeight: 600,
                                        }}
                                      >
                                        &nbsp;
                                      </td>
                                    </>
                                  )}
                                  <td
                                    className="data-cell fixed future-cell"
                                    style={{
                                      fontStyle: "italic",
                                      fontWeight: 600,
                                    }}
                                  >
                                    &nbsp;
                                  </td>
                                  {getFutureRow(tableData).map((cell, colIdx) => (
                                    <td
                                      key={colIdx}
                                      className={`data-cell ${cell.color} future-cell`}
                                      style={{
                                        pointerEvents: "none",
                                        height: "50px",
                                        fontStyle: "italic",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {cell.value}
                                    </td>
                                  ))}
                                </tr>
                              )}
                            </tbody>
                          </table>
                        ) : (
                          <div className="empty-message">
                            Nhập giá trị T{tableIndex + 1} và nhấn "Tính"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showDeleteModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px", width: "90%" }}
          >
            <h3 style={{ fontSize: "24px" }}>Xóa dữ liệu</h3>

            <div className="modal-body">
              <div className="radio-group">
                <label
                  style={{
                    fontSize: "35px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <input
                    type="radio"
                    value="all"
                    checked={deleteOption === "all"}
                    onChange={(e) => setDeleteOption(e.target.value)}
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  Xóa tất cả dữ liệu
                </label>

                <label
                  style={{
                    fontSize: "35px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <input
                    type="radio"
                    value="firstRow"
                    checked={deleteOption === "firstRow"}
                    onChange={(e) => setDeleteOption(e.target.value)}
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  Xóa dòng cũ nhất
                </label>

                <label
                  style={{
                    fontSize: "35px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <input
                    type="radio"
                    value="lastRow"
                    checked={deleteOption === "lastRow"}
                    onChange={(e) => setDeleteOption(e.target.value)}
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  Xóa dòng mới nhất
                </label>

                <label
                  style={{
                    fontSize: "35px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <input
                    type="radio"
                    value="dates"
                    checked={deleteOption === "dates"}
                    onChange={(e) => setDeleteOption(e.target.value)}
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  Xóa theo khoảng ngày
                </label>

                {deleteOption === "dates" && (
                  <div
                    className="input-row"
                    style={{
                      marginTop: "16px",
                      marginBottom: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <input
                      type="date"
                      value={deleteDateFrom}
                      onChange={(e) => setDeleteDateFrom(e.target.value)}
                      style={{
                        padding: "12px",
                        fontSize: "18px",
                        border: "2px solid #ddd",
                        borderRadius: "6px",
                        flex: 1,
                      }}
                    />
                    <span style={{ fontSize: "18px", fontWeight: "bold" }}>
                      đến
                    </span>
                    <input
                      type="date"
                      value={deleteDateTo}
                      onChange={(e) => setDeleteDateTo(e.target.value)}
                      style={{
                        padding: "12px",
                        fontSize: "18px",
                        border: "2px solid #ddd",
                        borderRadius: "6px",
                        flex: 1,
                      }}
                    />
                  </div>
                )}

                <label
                  style={{
                    fontSize: "35px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <input
                    type="radio"
                    value="rows"
                    checked={deleteOption === "rows"}
                    onChange={(e) => setDeleteOption(e.target.value)}
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  Xóa theo khoảng STT dòng
                </label>

                {deleteOption === "rows" && (
                  <div
                    className="input-row"
                    style={{
                      marginTop: "16px",
                      marginBottom: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <input
                      type="number"
                      placeholder="STT từ"
                      value={deleteRowFrom}
                      onChange={(e) => setDeleteRowFrom(e.target.value)}
                      style={{
                        padding: "12px",
                        fontSize: "18px",
                        border: "2px solid #ddd",
                        borderRadius: "6px",
                        flex: 1,
                      }}
                    />
                    <span style={{ fontSize: "18px", fontWeight: "bold" }}>
                      đến
                    </span>
                    <input
                      type="number"
                      placeholder="STT đến"
                      value={deleteRowTo}
                      onChange={(e) => setDeleteRowTo(e.target.value)}
                      style={{
                        padding: "12px",
                        fontSize: "18px",
                        border: "2px solid #ddd",
                        borderRadius: "6px",
                        flex: 1,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowDeleteModal(false)}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Hủy
              </button>
              <button
                className="btn-delete"
                onClick={handleDelete}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddRowModal && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ maxWidth: "600px", width: "90%" }}
          >
            <div className="modal-header">
              <h3 style={{ fontSize: "24px" }}>➕ Thêm hàng mới</h3>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  Chọn ngày (ngày/tháng/năm):
                </label>
                <input
                  type="date"
                  value={newRowDate}
                  onChange={(e) => setNewRowDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "18px",
                    border: "2px solid #ddd",
                    borderRadius: "6px",
                  }}
                />
              </div>

              <div className="form-group" style={{ marginTop: "20px" }}>
                <label
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  A (không bắt buộc):
                </label>
                <input
                  type="text"
                  value={newRowT1}
                  onChange={(e) => setNewRowT1(e.target.value)}
                  placeholder="Nhập A"
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "18px",
                    border: "2px solid #ddd",
                    borderRadius: "6px",
                  }}
                />
              </div>

              <div className="form-group" style={{ marginTop: "20px" }}>
                <label
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  B (không bắt buộc):
                </label>
                <input
                  type="text"
                  value={newRowT2}
                  onChange={(e) => setNewRowT2(e.target.value)}
                  placeholder="Nhập B"
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "18px",
                    border: "2px solid #ddd",
                    borderRadius: "6px",
                  }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowAddRowModal(false)}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Hủy
              </button>
              <button
                className="btn-delete"
                onClick={confirmAddRow}
                disabled={isAddingRow}
                style={{
                  background: isAddingRow ? "#6c757d" : "#28a745",
                  fontSize: "18px",
                  padding: "12px 24px",
                  cursor: isAddingRow ? "not-allowed" : "pointer",
                  opacity: isAddingRow ? 0.7 : 1,
                }}
              >
                {isAddingRow ? "Đang thêm..." : "Thêm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteFirstRowModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>⚠️ Xác nhận xóa dòng</h3>
            </div>

            <div className="modal-body">
              <p
                style={{
                  fontSize: "18px",
                  textAlign: "center",
                  margin: "20px 0",
                }}
              >
                Bạn có chắc chắn muốn xóa dòng đầu tiên hiện tại không?
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowDeleteFirstRowModal(false)}
              >
                Hủy
              </button>
              <button className="btn-delete" onClick={handleDeleteFirstRow}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteLastRowModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>⚠️ Xác nhận xóa dòng</h3>
            </div>

            <div className="modal-body">
              <p
                style={{
                  fontSize: "18px",
                  textAlign: "center",
                  margin: "20px 0",
                }}
              >
                Bạn có chắc chắn muốn xóa dòng cuối cùng (dòng mới nhất) hiện tại không?
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowDeleteLastRowModal(false)}
              >
                Hủy
              </button>
              <button className="btn-delete" onClick={handleDeleteLastRow}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {showKeepLastNRowsModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h3 style={{ fontSize: "24px" }}>⚠️ Xác nhận</h3>
            </div>

            <div className="modal-body">
              <p
                style={{
                  fontSize: "18px",
                  textAlign: "center",
                  margin: "20px 0",
                }}
              >
                Bạn có chắc chắn muốn chỉ giữ lại{" "}
                <strong>{keepLastNRows}</strong> dòng cuối cùng?
                <br />
                <br />
                Tất cả các dòng khác sẽ bị xóa!
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowKeepLastNRowsModal(false)}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Hủy
              </button>
              <button
                className="btn-delete"
                onClick={() => {
                  handleKeepLastNRows();
                  setShowKeepLastNRowsModal(false);
                }}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAllModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h3 style={{ fontSize: "24px" }}>⚠️ Xác nhận xóa tất cả</h3>
            </div>

            <div className="modal-body">
              <p
                style={{
                  fontSize: "18px",
                  textAlign: "center",
                  margin: "20px 0",
                }}
              >
                Bạn có chắc chắn muốn xóa <strong>TẤT CẢ</strong> dữ liệu Q1-Q5?
                <br />
                <br />
                <span style={{ color: "#dc3545", fontWeight: "bold" }}>
                  Hành động này không thể hoàn tác!
                </span>
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowDeleteAllModal(false)}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Hủy
              </button>
              <button
                className="btn-delete"
                onClick={confirmDeleteAll}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteByDatesModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h3 style={{ fontSize: "24px" }}>⚠️ Xác nhận xóa theo ngày</h3>
            </div>

            <div className="modal-body">
              <p
                style={{
                  fontSize: "18px",
                  textAlign: "center",
                  margin: "20px 0",
                }}
              >
                Bạn có chắc chắn muốn xóa các dòng từ:
                <br />
                <br />
                <strong style={{ fontSize: "20px", color: "#dc3545" }}>
                  {deleteDateFrom} đến {deleteDateTo}
                </strong>
                <br />
                <br />
                Dữ liệu sẽ được đồng bộ xóa trên tất cả Q1-Q5!
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowDeleteByDatesModal(false)}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Hủy
              </button>
              <button
                className="btn-delete"
                onClick={confirmDeleteByDates}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteByRowsModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h3 style={{ fontSize: "24px" }}>⚠️ Xác nhận xóa theo dòng</h3>
            </div>

            <div className="modal-body">
              <p
                style={{
                  fontSize: "18px",
                  textAlign: "center",
                  margin: "20px 0",
                }}
              >
                Bạn có chắc chắn muốn xóa các dòng từ STT:
                <br />
                <br />
                <strong style={{ fontSize: "20px", color: "#dc3545" }}>
                  {deleteRowFrom} đến {deleteRowTo}
                </strong>
                <br />
                <br />
                Dữ liệu sẽ được đồng bộ xóa trên tất cả Q1-Q5!
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowDeleteByRowsModal(false)}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Hủy
              </button>
              <button
                className="btn-delete"
                onClick={confirmDeleteByRows}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {showPurpleRangeModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowPurpleRangeModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "500px", width: "90%" }}
          >
            <div className="modal-header">
              <h3 style={{ fontSize: "35px" }}>⚙️ Cài đặt khoảng báo màu</h3>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label
                  style={{
                    fontSize: "35px",
                    fontWeight: "bold",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  Từ:
                </label>
                <input
                  type="number"
                  value={tempPurpleRangeFrom}
                  onChange={(e) => setTempPurpleRangeFrom(e.target.value)}
                  placeholder="Nhập giá trị từ"
                  min="0"
                  disabled={isSavingPurpleRange}
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "35px",
                    border: "2px solid #ffc107",
                    borderRadius: "6px",
                    textAlign: "center",
                    cursor: isSavingPurpleRange ? "not-allowed" : "text",
                    opacity: isSavingPurpleRange ? 0.6 : 1,
                  }}
                />
              </div>

              <div className="form-group" style={{ marginTop: "20px" }}>
                <label
                  style={{
                    fontSize: "35px",
                    fontWeight: "bold",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  Đến:
                </label>
                <input
                  type="number"
                  value={tempPurpleRangeTo}
                  onChange={(e) => setTempPurpleRangeTo(e.target.value)}
                  placeholder="Nhập giá trị đến"
                  min="0"
                  disabled={isSavingPurpleRange}
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "35px",
                    border: "2px solid #ffc107",
                    borderRadius: "6px",
                    textAlign: "center",
                    cursor: isSavingPurpleRange ? "not-allowed" : "text",
                    opacity: isSavingPurpleRange ? 0.6 : 1,
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
                  fontSize: "16px",
                  color: "#856404",
                }}
              >
                💡 <strong>Lưu ý:</strong> Các ô có giá trị trong khoảng này sẽ được tô màu vàng để báo hiệu.
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowPurpleRangeModal(false)}
                disabled={isSavingPurpleRange}
                style={{
                  fontSize: "18px",
                  padding: "12px 24px",
                  cursor: isSavingPurpleRange ? "not-allowed" : "pointer",
                  opacity: isSavingPurpleRange ? 0.6 : 1,
                }}
              >
                Hủy
              </button>
              <button
                className="btn-delete"
                onClick={handleSavePurpleRange}
                disabled={isSavingPurpleRange}
                style={{
                  fontSize: "18px",
                  padding: "12px 24px",
                  backgroundColor: isSavingPurpleRange ? "#6c757d" : "#28a745",
                  cursor: isSavingPurpleRange ? "not-allowed" : "pointer",
                  opacity: isSavingPurpleRange ? 0.7 : 1,
                }}
              >
                {isSavingPurpleRange ? "⏳ Đang lưu..." : "💾 Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showKeepLastNRowsSettingsModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowKeepLastNRowsSettingsModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "500px", width: "90%" }}
          >
            <div className="modal-header">
              <h3 style={{ fontSize: "35px" }}>⚙️ Cài đặt số dòng tồn tại</h3>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label
                  style={{
                    fontSize: "35px",
                    fontWeight: "bold",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  Số dòng:
                </label>
                <input
                  type="number"
                  value={tempKeepLastNRows}
                  onChange={(e) => setTempKeepLastNRows(e.target.value)}
                  placeholder="Nhập số dòng tồn tại"
                  min="1"
                  max={ROWS}
                  disabled={isSavingKeepLastNRows}
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "35px",
                    border: "2px solid #007bff",
                    borderRadius: "6px",
                    textAlign: "center",
                    cursor: isSavingKeepLastNRows ? "not-allowed" : "text",
                    opacity: isSavingKeepLastNRows ? 0.6 : 1,
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: "20px",
                  padding: "12px",
                  backgroundColor: "#d1ecf1",
                  border: "1px solid #007bff",
                  borderRadius: "6px",
                  fontSize: "16px",
                  color: "#0c5460",
                }}
              >
                💡 <strong>Lưu ý:</strong> Đây là số dòng tối đa được lưu trữ trong hệ thống.
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowKeepLastNRowsSettingsModal(false)}
                disabled={isSavingKeepLastNRows}
                style={{
                  fontSize: "18px",
                  padding: "12px 24px",
                  cursor: isSavingKeepLastNRows ? "not-allowed" : "pointer",
                  opacity: isSavingKeepLastNRows ? 0.6 : 1,
                }}
              >
                Hủy
              </button>
              <button
                className="btn-delete"
                onClick={handleSaveKeepLastNRows}
                disabled={isSavingKeepLastNRows}
                style={{
                  fontSize: "18px",
                  padding: "12px 24px",
                  backgroundColor: isSavingKeepLastNRows
                    ? "#6c757d"
                    : "#28a745",
                  cursor: isSavingKeepLastNRows ? "not-allowed" : "pointer",
                  opacity: isSavingKeepLastNRows ? 0.7 : 1,
                }}
              >
                {isSavingKeepLastNRows ? "⏳ Đang lưu..." : "💾 Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
