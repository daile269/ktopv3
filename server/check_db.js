import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Page from './models/Page.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in process.env. Did you run this from the server directory?');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');
    console.log(`📦 Database name: ${mongoose.connection.name}`);

    // Query site_a_q_all
    const qAll = await Page.findOne({ pageId: 'site_a_q_all' });
    if (!qAll) {
      console.log('❌ Page site_a_q_all NOT found in database!');
      return;
    }

    console.log('\n======================================================');
    console.log('📄 INFO FOR site_a_q_all:');
    console.log(`- PageId: ${qAll.pageId}`);
    console.log(`- dateValues total length: ${qAll.dateValues ? qAll.dateValues.length : 0}`);
    console.log(`- deletedRows total length: ${qAll.deletedRows ? qAll.deletedRows.length : 0}`);
    console.log(`- allQData total length (Qs count): ${qAll.allQData ? qAll.allQData.length : 0}`);

    // Filter active rows (where deleted is false)
    const activeRows = [];
    if (qAll.dateValues && qAll.deletedRows) {
      for (let i = 0; i < qAll.dateValues.length; i++) {
        if (!qAll.deletedRows[i]) {
          activeRows.push({
            index: i,
            date: qAll.dateValues[i],
            sourceSTT: qAll.sourceSTTValues ? qAll.sourceSTTValues[i] : 'N/A',
            zValue: qAll.zValues ? qAll.zValues[i] : 'N/A'
          });
        }
      }
    }

    console.log(`- Active rows count (deleted = false): ${activeRows.length}`);
    console.log('\n--- Active Rows List: ---');
    activeRows.forEach(row => {
      console.log(`Row index [${row.index}]: Date="${row.date}", STT="${row.sourceSTT}", Z="${row.zValue}"`);
    });

    console.log('\n--- Q1 Tap 0 values (T1) first few rows: ---');
    if (qAll.allQData && qAll.allQData[0] && qAll.allQData[0].tapsData && qAll.allQData[0].tapsData[0]) {
      const tap = qAll.allQData[0].tapsData[0];
      const limit = Math.min(tap.aValues.length, activeRows.length + 5);
      for (let i = 0; i < limit; i++) {
        if (!qAll.deletedRows[i] || i === 14 || i === 15) {
          console.log(`Row [${i}]: aVal="${tap.aValues[i]}", bVal="${tap.bValues[i]}", deleted=${qAll.deletedRows[i]}`);
        }
      }
    }
    console.log('======================================================');

  } catch (err) {
    console.error('❌ Error querying DB:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
