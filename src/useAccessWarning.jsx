import { useEffect, useRef, useState } from "react";

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

export function useAccessWarning() {
  const [showAccessWarningModal, setShowAccessWarningModal] = useState(false);
  const [accessWarningDate, setAccessWarningDate] = useState("");
  const accessCheckDoneRef = useRef(false);

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
          Truy cập {accessWarningDate}
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
              <div
                className="modal-footer"
                style={{ justifyContent: "center" }}
              >
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

  return { renderAccessWarning };
}
