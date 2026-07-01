import mongoose from "mongoose";
import dotenv from "dotenv";
import Page from "./models/Page.js";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ktop-v3";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB!");

    const page = await Page.findOne({ pageId: "master_draft" });
    if (!page) {
      console.log("❌ master_draft not found");
      return;
    }

    const rows = [50, 40];
    for (const r of rows) {
      console.log(`\n--- Row ${r} ---`);
      for (let q = 0; q < page.allQData.length; q++) {
        const qItem = page.allQData[q];
        console.log(`Q${q + 1}:`);
        for (let t = 0; t < 10; t++) {
          const tap = qItem.tapsData[t];
          const a = tap.aValues[r];
          const b = tap.bValues[r];
          if (a || b) {
            console.log(`  Tap ${t + 1}: a="${a}", b="${b}"`);
          }
        }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
