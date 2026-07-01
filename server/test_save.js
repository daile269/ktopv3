import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Page from './models/Page.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ktop-v3';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB!');

    // 1. Load master_draft
    const draftPage = await Page.findOne({ pageId: 'master_draft' });
    if (!draftPage) {
      console.log('❌ master_draft not found');
      return;
    }

    // 2. Load site_a_q_all
    const calcPage = await Page.findOne({ pageId: 'site_a_q_all' });
    if (!calcPage) {
      console.log('❌ site_a_q_all not found');
      return;
    }

    const selectedIndices = [50, 40];
    const transferDate = '2025-11-25';
    const NUM_QS = 6;
    const ROWS = 5000;

    let activeAllQData = JSON.parse(JSON.stringify(calcPage.allQData || []));
    while (activeAllQData.length < NUM_QS) {
      activeAllQData.push({
        tapsData: Array(10).fill(null).map(() => ({
          aValues: Array(ROWS).fill(""),
          bValues: Array(ROWS).fill(""),
        })),
      });
    }
    for (let q = 0; q < NUM_QS; q++) {
      if (!activeAllQData[q].tapsData) activeAllQData[q].tapsData = [];
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

    const zVals = calcPage.zValues || [];
    const dVals = calcPage.dateValues || [];
    const delFlags = calcPage.deletedRows || [];
    const sourceVals = calcPage.sourceSTTValues || [];

    for (let rowIndex = 0; rowIndex < zVals.length; rowIndex++) {
      let hasAnyData =
        String(zVals[rowIndex] || "").trim() !== "" ||
        String(dVals[rowIndex] || "").trim() !== "";

      if (!hasAnyData) {
        for (let q = 0; q < NUM_QS; q++) {
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
        for (let q = 0; q < NUM_QS; q++) {
          for (let tapIdx = 0; tapIdx < 10; tapIdx++) {
            newAllQData[q].tapsData[tapIdx].aValues.push(activeAllQData[q]?.tapsData?.[tapIdx]?.aValues[rowIndex] || "");
            newAllQData[q].tapsData[tapIdx].bValues.push(activeAllQData[q]?.tapsData?.[tapIdx]?.bValues[rowIndex] || "");
          }
        }
      }
    }

    selectedIndices.forEach((rowIndex) => {
      activeZ.push("");
      activeD.push(transferDate);
      activeDel.push(false);
      activeSourceSTT.push(String(rowIndex).padStart(2, '0'));

      for (let q = 0; q < NUM_QS; q++) {
        for (let tapIdx = 0; tapIdx < 10; tapIdx++) {
          const draftTap = draftPage.allQData[q]?.tapsData?.[tapIdx];
          newAllQData[q].tapsData[tapIdx].aValues.push(draftTap?.aValues[rowIndex] || "");
          newAllQData[q].tapsData[tapIdx].bValues.push(draftTap?.bValues[rowIndex] || "");
        }
      }
    });

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

    // Now call the server saving logic (simulated)
    const keepLastNRows = calcPage.keepLastNRows || 110;
    const purpleRangeFrom = calcPage.purpleRangeFrom || 0;
    const purpleRangeTo = calcPage.purpleRangeTo || 0;
    const pageLabel = calcPage.pageLabel || "";

    const BACKEND_ROWS = 110;
    let lastIndex = -1;
    let maxLen = Math.max(activeZ.length, activeD.length, activeSourceSTT.length);

    newAllQData.forEach((qItem) => {
      if (qItem.tapsData) {
        qItem.tapsData.forEach((tap) => {
          if (tap.aValues) maxLen = Math.max(maxLen, tap.aValues.length);
          if (tap.bValues) maxLen = Math.max(maxLen, tap.bValues.length);
        });
      }
    });

    for (let i = maxLen - 1; i >= 0; i--) {
      let hasData = false;
      if (activeZ[i] || activeD[i]) hasData = true;
      if (!hasData) {
        for (const qItem of newAllQData) {
          if (qItem.tapsData) {
            for (const tap of qItem.tapsData) {
              if (tap.aValues[i] || tap.bValues[i]) {
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

    console.log(`Computed lastIndex: ${lastIndex}`);

    const trimmedZ = activeZ.slice(0, Math.min(lastIndex + 1, BACKEND_ROWS));
    const trimmedDates = activeD.slice(0, Math.min(lastIndex + 1, BACKEND_ROWS));
    const trimmedDeleted = activeDel.slice(0, Math.min(lastIndex + 1, BACKEND_ROWS));
    const trimmedSourceSTT = activeSourceSTT.slice(0, Math.min(lastIndex + 1, BACKEND_ROWS));

    const trimmedAllQData = newAllQData.slice(0, 6).map((qItem) => {
      const trimmedQTaps = qItem.tapsData.slice(0, 10).map((tap) => ({
        aValues: tap.aValues.slice(0, Math.min(lastIndex + 1, BACKEND_ROWS)),
        bValues: tap.bValues.slice(0, Math.min(lastIndex + 1, BACKEND_ROWS)),
      }));
      return {
        aValues: [],
        bValues: [],
        tapsData: trimmedQTaps,
      };
    });

    console.log('Saving Page via Mongoose findOneAndUpdate...');
    const result = await Page.findOneAndUpdate(
      { pageId: 'site_a_q_all' },
      {
        pageId: 'site_a_q_all',
        zValues: trimmedZ,
        dateValues: trimmedDates,
        deletedRows: trimmedDeleted,
        sourceSTTValues: trimmedSourceSTT,
        purpleRangeFrom,
        purpleRangeTo,
        keepLastNRows,
        allQData: trimmedAllQData,
        pageLabel,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, runValidators: true }
    );

    console.log('✅ Simulated save succeeded!');
    console.log(`Saved document dateValues length: ${result.dateValues.length}`);
    console.log(`Saved document allQData length: ${result.allQData.length}`);
    console.log('First Q, first tap, updated aValues count:', result.allQData[0].tapsData[0].aValues.length);
    console.log('Last row saved status:', {
      Date: result.dateValues[result.dateValues.length - 1],
      STT: result.sourceSTTValues[result.sourceSTTValues.length - 1],
      Deleted: result.deletedRows[result.deletedRows.length - 1],
    });

  } catch (err) {
    console.error('❌ Error during simulated save:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
