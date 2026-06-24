import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '../server/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ktop-v3';

console.log('Connecting to:', MONGODB_URI);

const pageSchema = new mongoose.Schema({}, { strict: false });
const Page = mongoose.model('Page', pageSchema, 'pages');

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB!');
    
    const pages = await Page.find({});
    console.log('Total pages in DB:', pages.length);
    for (const p of pages) {
      console.log(`- Page ID: ${p.get('pageId')}`);
      if (p.get('allQData')) {
        console.log(`  allQData length: ${p.get('allQData').length}`);
        // Log keys of first item in allQData
        const first = p.get('allQData')[0];
        if (first) {
          console.log(`  First item keys:`, Object.keys(first.toObject ? first.toObject() : first));
          if (first.tapsData) {
            console.log(`  First item tapsData length: ${first.tapsData.length}`);
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
