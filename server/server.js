import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import Page from "./models/Page.js";

// Load environment variables
dotenv.config();

console.log("🚀 [SERVER ENV] Port:", process.env.PORT);
console.log("🚀 [SERVER ENV] MongoDB URI:", process.env.MONGODB_URI);

const app = express();
const PORT = process.env.PORT;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// MongoDB Connection
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB successfully!");
    console.log(`📦 Database: ${mongoose.connection.name}`);
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  });

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "KTOP Backend API is running",
    database:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    timestamp: new Date().toISOString(),
  });
});

// ==================== API ROUTES ====================

/**
 * GET /api/pages/:pageId
 * Load data for a specific page (q1, q2, etc.)
 */
app.get("/api/pages/:pageId", async (req, res) => {
  try {
    const { pageId } = req.params;

    console.log(`📖 Loading data for page: ${pageId}`);

    const page = await Page.findOne({ pageId });

    if (!page) {
      console.log(`ℹ️ No data found for ${pageId}, returning empty data`);
      return res.json({
        success: true,
        data: null,
      });
    }

    // Pad arrays to 110 rows
    const ROWS = 110;
    const aValues = [...page.aValues].slice(0, ROWS);
    const bValues = [...page.bValues].slice(0, ROWS);
    const zValues = page.zValues ? [...page.zValues].slice(0, ROWS) : [];
    const dateValues = [...page.dateValues].slice(0, ROWS);
    const deletedRows = [...page.deletedRows].slice(0, ROWS);
    const sourceSTTValues = page.sourceSTTValues ? [...page.sourceSTTValues].slice(0, ROWS) : [];

    while (aValues.length < ROWS) aValues.push("");
    while (bValues.length < ROWS) bValues.push("");
    while (zValues.length < ROWS) zValues.push("");
    while (dateValues.length < ROWS) dateValues.push("");
    while (deletedRows.length < ROWS) deletedRows.push(false);
    while (sourceSTTValues.length < ROWS) sourceSTTValues.push("");

    // Pad và xử lý tapsData (nếu có)
    let tapsData = page.tapsData;
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

    // Pad và xử lý allQData cho master_draft (nếu có)
    let allQData = page.allQData;
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

    res.json({
      success: true,
      data: {
        aValues,
        bValues,
        tapsData: processedTapsData,
        zValues,
        dateValues,
        deletedRows,
        sourceSTTValues,
        purpleRangeFrom: page.purpleRangeFrom || 0,
        purpleRangeTo: page.purpleRangeTo || 0,
        keepLastNRows: typeof page.keepLastNRows === "number" ? page.keepLastNRows : 110,
        allQData,
        pageLabel: page.pageLabel || "",
      },
    });

    console.log(`✅ Data loaded successfully for ${pageId}`);
  } catch (error) {
    console.error("❌ Error loading page data:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/pages/:pageId
 * Save data for a specific page
 */
app.post("/api/pages/:pageId", async (req, res) => {
  try {
    const { pageId } = req.params;
    const {
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
    } = req.body;

    console.log(`💾 Saving data for page: ${pageId}`);

    const ROWS = 110;

    // Find last index with data
    let lastIndex = -1;
    const aLen = aValues ? aValues.length : 0;
    const bLen = bValues ? bValues.length : 0;
    const zLen = zValues ? zValues.length : 0;
    const dLen = dateValues ? dateValues.length : 0;
    const sLen = sourceSTTValues ? sourceSTTValues.length : 0;
    let maxLen = Math.max(aLen, bLen, zLen, dLen, sLen);

    // Tích hợp độ dài của tapsData vào maxLen
    if (tapsData && Array.isArray(tapsData)) {
      tapsData.forEach((tap) => {
        if (tap.aValues) maxLen = Math.max(maxLen, tap.aValues.length);
        if (tap.bValues) maxLen = Math.max(maxLen, tap.bValues.length);
      });
    }

    // Tích hợp độ dài của allQData vào maxLen
    if (allQData && Array.isArray(allQData)) {
      allQData.forEach((qItem) => {
        if (qItem.tapsData && Array.isArray(qItem.tapsData)) {
          qItem.tapsData.forEach((tap) => {
            if (tap.aValues) maxLen = Math.max(maxLen, tap.aValues.length);
            if (tap.bValues) maxLen = Math.max(maxLen, tap.bValues.length);
          });
        }
      });
    }

    for (let i = maxLen - 1; i >= 0; i--) {
      let hasData = false;
      if (
        (aValues && aValues[i]) ||
        (bValues && bValues[i]) ||
        (zValues && zValues[i]) ||
        (dateValues && dateValues[i])
      ) {
        hasData = true;
      }
      
      // Kiểm tra trong tapsData
      if (!hasData && tapsData && Array.isArray(tapsData)) {
        for (const tap of tapsData) {
          if ((tap.aValues && tap.aValues[i]) || (tap.bValues && tap.bValues[i])) {
            hasData = true;
            break;
          }
        }
      }

      // Kiểm tra trong allQData
      if (!hasData && allQData && Array.isArray(allQData)) {
        for (const qItem of allQData) {
          if (qItem.tapsData && Array.isArray(qItem.tapsData)) {
            for (const tap of qItem.tapsData) {
              if ((tap.aValues && tap.aValues[i]) || (tap.bValues && tap.bValues[i])) {
                hasData = true;
                break;
              }
            }
          }
          if (hasData) break;
        }
      }

      if (hasData) {
        lastIndex = i;
        break;
      }
    }

    // Trim empty values at the end
    const trimmedA =
      lastIndex >= 0 && aValues ? aValues.slice(0, Math.min(lastIndex + 1, ROWS)) : [];
    const trimmedB =
      lastIndex >= 0 && bValues ? bValues.slice(0, Math.min(lastIndex + 1, ROWS)) : [];
    const trimmedZ =
      lastIndex >= 0 && zValues ? zValues.slice(0, Math.min(lastIndex + 1, ROWS)) : [];
    const trimmedDates =
      lastIndex >= 0 && dateValues ? dateValues.slice(0, Math.min(lastIndex + 1, ROWS)) : [];
    const trimmedDeleted =
      lastIndex >= 0 && deletedRows ? deletedRows.slice(0, Math.min(lastIndex + 1, ROWS)) : [];
    const trimmedSourceSTT =
      lastIndex >= 0 && sourceSTTValues ? sourceSTTValues.slice(0, Math.min(lastIndex + 1, ROWS)) : [];

    // Trim tapsData
    const trimmedTaps =
      lastIndex >= 0 && tapsData && Array.isArray(tapsData)
        ? tapsData.slice(0, 10).map((tap) => ({
            aValues: tap.aValues ? tap.aValues.slice(0, Math.min(lastIndex + 1, ROWS)) : [],
            bValues: tap.bValues ? tap.bValues.slice(0, Math.min(lastIndex + 1, ROWS)) : [],
          }))
        : undefined;

    // Trim allQData
    const trimmedAllQData =
      lastIndex >= 0 && allQData && Array.isArray(allQData)
        ? allQData.slice(0, 6).map((qItem) => {
            let qTaps = qItem.tapsData;
            let trimmedQTaps = undefined;
            if (qTaps && Array.isArray(qTaps)) {
              trimmedQTaps = qTaps.slice(0, 10).map((tap) => ({
                aValues: tap.aValues ? tap.aValues.slice(0, Math.min(lastIndex + 1, ROWS)) : [],
                bValues: tap.bValues ? tap.bValues.slice(0, Math.min(lastIndex + 1, ROWS)) : [],
              }));
            }
            return {
              aValues: qItem.aValues ? qItem.aValues.slice(0, Math.min(lastIndex + 1, ROWS)) : [],
              bValues: qItem.bValues ? qItem.bValues.slice(0, Math.min(lastIndex + 1, ROWS)) : [],
              tapsData: trimmedQTaps,
            };
          })
        : undefined;

    // Update or create page
    const page = await Page.findOneAndUpdate(
      { pageId },
      {
        pageId,
        aValues: trimmedA,
        bValues: trimmedB,
        tapsData: trimmedTaps,
        zValues: trimmedZ,
        dateValues: trimmedDates,
        deletedRows: trimmedDeleted,
        sourceSTTValues: trimmedSourceSTT,
        purpleRangeFrom: purpleRangeFrom || 0,
        purpleRangeTo: purpleRangeTo || 0,
        keepLastNRows: typeof keepLastNRows === "number" ? keepLastNRows : 110,
        allQData: trimmedAllQData,
        pageLabel: pageLabel || "",
        updatedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    );

    res.json({
      success: true,
      message: `Data saved successfully for ${pageId}`,
      data: {
        pageId: page.pageId,
        updatedAt: page.updatedAt,
      },
    });

    console.log(`✅ Data saved successfully for ${pageId}`);
  } catch (error) {
    console.error("❌ Error saving page data:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/pages/:pageId
 * Delete data for a specific page
 */
app.delete("/api/pages/:pageId", async (req, res) => {
  try {
    const { pageId } = req.params;

    console.log(`🗑️ Deleting data for page: ${pageId}`);

    const result = await Page.findOneAndDelete({ pageId });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: `Page ${pageId} not found`,
      });
    }

    res.json({
      success: true,
      message: `Data deleted successfully for ${pageId}`,
    });

    console.log(`✅ Data deleted successfully for ${pageId}`);
  } catch (error) {
    console.error("❌ Error deleting page data:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/pages
 * Get all pages (for debugging)
 */
app.get("/api/pages", async (req, res) => {
  try {
    const pages = await Page.find({}).select("pageId updatedAt");

    res.json({
      success: true,
      count: pages.length,
      data: pages,
    });
  } catch (error) {
    console.error("❌ Error fetching pages:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

// Start server
app.listen(PORT, () => {
  console.log("");
  console.log("🚀 ========================================");
  console.log(`🚀 KTOP Backend Server is running!`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🚀 API URL: http://localhost:${PORT}`);
  console.log("🚀 ========================================");
  console.log("");
  console.log("📍 Available endpoints:");
  console.log(`   GET    /api/health`);
  console.log(`   GET    /api/pages`);
  console.log(`   GET    /api/pages/:pageId`);
  console.log(`   POST   /api/pages/:pageId`);
  console.log(`   DELETE /api/pages/:pageId`);
  console.log("");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("⚠️ SIGTERM received, closing server...");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("\n⚠️ SIGINT received, closing server...");
  await mongoose.connection.close();
  process.exit(0);
});
