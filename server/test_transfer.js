import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Page from './models/Page.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ktop-v3';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB!');

    // 1. Simulate saving site_a_q_all with a transfer at index 61
    const pageId = 'site_a_q_all';

    // Mock data
    const activeZ = Array(5000).fill("");
    const activeD = Array(5000).fill("");
    const activeDel = Array(5000).fill(true);
    const activeSourceSTT = Array(5000).fill("");

    // Set row 0 to 13 as active, and row 61 as active
    for (let i = 0; i < 14; i++) {
      activeD[i] = "2025-10-13";
      activeDel[i] = false;
      activeSourceSTT[i] = String(i).padStart(2, "0");
    }
    activeD[61] = "2026-07-01";
    activeDel[61] = false;
    activeSourceSTT[61] = "61";

    const allQData = Array(6).fill(null).map(() => ({
      tapsData: Array(10).fill(null).map(() => ({
        aValues: Array(5000).fill(""),
        bValues: Array(5000).fill(""),
      })),
    }));

    // Put some values at index 61
    allQData[0].tapsData[0].aValues[61] = "5";
    allQData[0].tapsData[0].bValues[61] = "6";

    // Mimic the backend trimming logic
    let lastIndex = -1;
    const maxLen = 5000;
    for (let i = maxLen - 1; i >= 0; i--) {
      let hasData = false;
      if (activeD[i] || activeSourceSTT[i]) {
        hasData = true;
      }
      if (hasData) {
        lastIndex = i;
        break;
      }
    }

    console.log('lastIndex calculated:', lastIndex);

    // Backend ROWS limit is 110! Let's check how it trims!
    const ROWS = 110;
    const trimmedZ = lastIndex >= 0 ? activeZ.slice(0, Math.min(lastIndex + 1, ROWS)) : [];
    const trimmedDates = lastIndex >= 0 ? activeD.slice(0, Math.min(lastIndex + 1, ROWS)) : [];
    const trimmedDeleted = lastIndex >= 0 ? activeDel.slice(0, Math.min(lastIndex + 1, ROWS)) : [];
    const trimmedSourceSTT = lastIndex >= 0 ? activeSourceSTT.slice(0, Math.min(lastIndex + 1, ROWS)) : [];

    const trimmedAllQData = allQData.map((qItem) => {
      const trimmedQTaps = qItem.tapsData.map((tap) => ({
        aValues: tap.aValues.slice(0, Math.min(lastIndex + 1, ROWS)),
        bValues: tap.bValues.slice(0, Math.min(lastIndex + 1, ROWS)),
      }));
      return {
        aValues: [],
        bValues: [],
        tapsData: trimmedQTaps,
      };
    });

    console.log('trimmedDates length:', trimmedDates.length);
    console.log('trimmedDeleted at index 61:', trimmedDeleted[61]);
    console.log('trimmedDates at index 61:', trimmedDates[61]);

    // Upsert into DB
    const page = await Page.findOneAndUpdate(
      { pageId },
      {
        pageId,
        zValues: trimmedZ,
        dateValues: trimmedDates,
        deletedRows: trimmedDeleted,
        sourceSTTValues: trimmedSourceSTT,
        purpleRangeFrom: 16,
        purpleRangeTo: 95,
        keepLastNRows: 110,
        allQData: trimmedAllQData,
        pageLabel: '',
        updatedAt: new Date(),
      },
      { new: true, upsert: true }
    );

    console.log('Document saved successfully. Querying back...');
    const savedPage = await Page.findOne({ pageId });
    console.log('Retrieved dateValues at index 61:', savedPage.dateValues[61]);
    console.log('Retrieved deletedRows at index 61:', savedPage.deletedRows[61]);
    console.log('Retrieved allQData length:', savedPage.allQData.length);
    console.log('Retrieved allQData[0] tap 0 aValues length:', savedPage.allQData[0].tapsData[0].aValues.length);
    console.log('Retrieved allQData[0] tap 0 aValues at index 61:', savedPage.allQData[0].tapsData[0].aValues[61]);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
