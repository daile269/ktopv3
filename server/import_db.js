import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Page from './models/Page.js';

// Thiết lập thư mục làm việc hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load cấu hình môi trường từ server/.env
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ktop-v3';
const DATA_FILE = path.join(__dirname, '../migration_input/new_pages_imported.json');

async function importData() {
  console.log('==================================================');
  console.log('🚀 BẮT ĐẦU NẠP DỮ LIỆU ĐÃ DI CƯ VÀO DATABASE');
  console.log(`🔗 Database: ${MONGODB_URI}`);
  console.log(`📁 File nguồn: ${DATA_FILE}`);
  console.log('==================================================\n');

  if (!fs.existsSync(DATA_FILE)) {
    console.error(`❌ Không tìm thấy file dữ liệu: ${DATA_FILE}`);
    console.log('Vui lòng chạy lệnh chuyển đổi trước: node scratch/migrate.js');
    return;
  }

  try {
    // Kết nối tới MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Kết nối thành công tới MongoDB!');

    // Đọc dữ liệu từ file JSON
    const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
    const documents = JSON.parse(fileContent);

    if (!Array.isArray(documents)) {
      console.error('❌ Lỗi: Định dạng file JSON phải là một mảng.');
      await mongoose.disconnect();
      return;
    }

    console.log(`\n👉 Tìm thấy ${documents.length} trang dữ liệu cần import...`);

    // Thực hiện Merge/Upsert từng document
    for (const doc of documents) {
      const pageId = doc.pageId;
      console.log(`   -> Đang nạp trang: ${pageId}...`);

      // Dùng findOneAndUpdate với upsert: true để merge đè dữ liệu mới
      await Page.findOneAndUpdate(
        { pageId },
        { ...doc, updatedAt: new Date() },
        { upsert: true, new: true, runValidators: true }
      );
    }

    console.log('\n==================================================');
    console.log('✅ ĐÃ NẠP THÀNH CÔNG TOÀN BỘ DỮ LIỆU VÀO DATABASE!');
    console.log('==================================================\n');
    console.log('Bây giờ anh có thể mở ứng dụng mới lên kiểm tra dữ liệu Tập 1 ở Q1-Q5 rồi ạ!');

  } catch (error) {
    console.error('❌ Lỗi trong quá trình nạp dữ liệu:', error);
  } finally {
    // Đóng kết nối DB
    await mongoose.disconnect();
    console.log('🔌 Đã ngắt kết nối database.');
  }
}

importData();
