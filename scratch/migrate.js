import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Thiết lập thư mục làm việc hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_DIR = path.join(__dirname, '../migration_input');
const OUTPUT_FILE = path.join(INPUT_DIR, 'new_pages_imported.json');

// Hàm chuẩn hóa mảng về 5000 phần tử
function padArray(arr, size, defaultValue = '') {
  const result = Array.isArray(arr) ? [...arr].slice(0, size) : [];
  while (result.length < size) {
    result.push(defaultValue);
  }
  return result;
}

// Khởi tạo khung document master_draft mới trống
function createEmptyMasterDraft() {
  return {
    pageId: 'master_draft',
    dateValues: Array(5000).fill(''),
    zValues: Array(5000).fill(''),
    deletedRows: Array(5000).fill(false),
    sourceSTTValues: Array(5000).fill(''),
    purpleRangeFrom: 0,
    purpleRangeTo: 0,
    keepLastNRows: 110,
    allQData: Array.from({ length: 6 }, () => ({
      aValues: [],
      bValues: [],
      tapsData: Array.from({ length: 10 }, () => ({ aValues: [], bValues: [] }))
    })),
    pageLabel: 'Bảng thông - APP 1A',
  };
}

// Khởi tạo khung page chi tiết mới trống cho Q1-Q5
function createEmptyQPage(pageId) {
  return {
    pageId,
    aValues: Array(5000).fill(''),
    bValues: Array(5000).fill(''),
    tapsData: Array.from({ length: 10 }, () => ({ aValues: [], bValues: [] })),
    zValues: Array(5000).fill(''),
    dateValues: Array(5000).fill(''),
    deletedRows: Array(5000).fill(false),
    sourceSTTValues: Array(5000).fill(''),
    purpleRangeFrom: 0,
    purpleRangeTo: 0,
    keepLastNRows: 110,
    pageLabel: '',
  };
}

// Đọc file JSON an toàn
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.error(`❌ Lỗi khi đọc file ${path.basename(filePath)}:`, error.message);
    return null;
  }
}

async function runMigration() {
  console.log('==================================================');
  console.log('🚀 BẮT ĐẦU DI CƯ ĐỒNG THỜI 6 FILE APP CŨ VÀO 6 Q MỚI');
  console.log(`📁 Thư mục nguồn: ${INPUT_DIR}`);
  console.log('==================================================\n');

  // Khởi tạo cấu trúc đích cho master_draft
  const newMaster = createEmptyMasterDraft();
  
  // Khởi tạo cấu trúc đích cho 6 trang Q chi tiết (site_a_q1 đến site_a_q6)
  const newQPages = Array.from({ length: 6 }, (_, idx) => 
    createEmptyQPage(`site_a_q${idx + 1}`)
  );

  let masterBasePopulated = false;

  // Duyệt qua 6 file ứng với 6 Q mới
  for (let pmIdx = 0; pmIdx < 6; pmIdx++) {
    const pmNumber = pmIdx + 1;
    const fileName = `ktop-new-pm${pmNumber}.pages.json`;
    const filePath = path.join(INPUT_DIR, fileName);

    const oldDocs = readJsonFile(filePath);

    if (!oldDocs) {
      console.log(`⚠️ Không tìm thấy file ${fileName} hoặc file bị lỗi. Bỏ qua Q${pmNumber}...`);
      continue;
    }

    console.log(`📖 Đang xử lý file: ${fileName} -> Ánh xạ vào Q${pmNumber} (10 Tập)...`);

    // 1. Ánh xạ dữ liệu master_draft từ file này
    const oldMaster = oldDocs.find(doc => doc.pageId === 'master_draft');
    if (oldMaster) {
      // Dùng thông tin chung từ PM1 làm thông tin chung cho master_draft mới
      if (!masterBasePopulated) {
        newMaster.dateValues = padArray(oldMaster.dateValues, 5000, '');
        newMaster.zValues = padArray(oldMaster.zValues, 5000, '');
        newMaster.deletedRows = padArray(oldMaster.deletedRows, 5000, false);
        newMaster.sourceSTTValues = padArray(oldMaster.sourceSTTValues, 5000, '');
        newMaster.purpleRangeFrom = oldMaster.purpleRangeFrom || 0;
        newMaster.purpleRangeTo = oldMaster.purpleRangeTo || 0;
        newMaster.keepLastNRows = oldMaster.keepLastNRows || 110;
        masterBasePopulated = true;
      }

      // Đưa 10 Q của file này vào 10 Tập của Q{pmNumber} mới
      if (Array.isArray(oldMaster.allQData)) {
        for (let oldQIdx = 0; oldQIdx < Math.min(oldMaster.allQData.length, 10); oldQIdx++) {
          const oldQ = oldMaster.allQData[oldQIdx];
          if (oldQ) {
            newMaster.allQData[pmIdx].tapsData[oldQIdx] = {
              aValues: padArray(oldQ.aValues, 5000, ''),
              bValues: padArray(oldQ.bValues, 5000, '')
            };
          }
        }
        console.log(`   ✅ Đã nạp dữ liệu bảng thông cho Q${pmNumber} (Tập 1 - Tập 10).`);
      }
    }

    // 2. Ánh xạ các trang tính toán chi tiết của file này
    const destinationQPage = newQPages[pmIdx];
    
    // Tìm các trang cũ trong file có dạng site_a_q{Y} (ví dụ Y = 1, 4, 7, 10...)
    const oldQDocs = oldDocs.filter(doc => doc.pageId && doc.pageId.includes('_q'));
    
    let pageBasePopulated = false;

    for (const oldQDoc of oldQDocs) {
      // Trích xuất số Q từ pageId (vd: site_a_q4 -> Y = 4)
      const match = oldQDoc.pageId.match(/_q(\d+)$/);
      if (!match) continue;
      
      const oldQNum = parseInt(match[1]);
      if (isNaN(oldQNum) || oldQNum < 1 || oldQNum > 10) continue;

      const tapIdx = oldQNum - 1; // Ánh xạ Q1 -> Tập 1, Q4 -> Tập 4, ...

      // Sử dụng trang đầu tiên tìm thấy để lấy Ngày tháng làm base cho QPage mới
      if (!pageBasePopulated) {
        destinationQPage.dateValues = padArray(oldQDoc.dateValues, 5000, '');
        destinationQPage.zValues = padArray(oldQDoc.zValues, 5000, '');
        destinationQPage.deletedRows = padArray(oldQDoc.deletedRows, 5000, false);
        destinationQPage.sourceSTTValues = padArray(oldQDoc.sourceSTTValues, 5000, '');
        destinationQPage.purpleRangeFrom = oldQDoc.purpleRangeFrom || 0;
        destinationQPage.purpleRangeTo = oldQDoc.purpleRangeTo || 0;
        destinationQPage.keepLastNRows = oldQDoc.keepLastNRows || 110;
        destinationQPage.pageLabel = `Trang tính Q${pmNumber} - APP 1A`;
        pageBasePopulated = true;
      }

      // Map aValues và bValues của Q{oldQNum} cũ vào Tập Y tương ứng của Q{pmNumber} mới
      destinationQPage.tapsData[tapIdx] = {
        aValues: padArray(oldQDoc.aValues, 5000, ''),
        bValues: padArray(oldQDoc.bValues, 5000, '')
      };
      
      // Tập 1 sẽ đồng thời gán vào root aValues/bValues để tương thích giao diện mặc định
      if (tapIdx === 0) {
        destinationQPage.aValues = destinationQPage.tapsData[0].aValues;
        destinationQPage.bValues = destinationQPage.tapsData[0].bValues;
      }
    }
    console.log(`   ✅ Đã nạp dữ liệu bảng tính chi tiết cho Q${pmNumber} (Tập 1 - Tập 10).`);
  }

  // Gộp tất cả kết quả lại thành một mảng
  const finalImportDocs = [newMaster, ...newQPages];

  // Xuất file kết quả
  try {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalImportDocs, null, 2), 'utf8');
    console.log('\n==================================================');
    console.log('✅ CHUYỂN ĐỔI THÀNH CÔNG!');
    console.log(`📁 File kết quả gộp: ${OUTPUT_FILE}`);
    console.log('==================================================\n');
    console.log('👉 Hướng dẫn nhập dữ liệu vào database mới:');
    console.log('Chạy câu lệnh dưới đây để nạp đè dữ liệu mới vào DB:');
    console.log('--------------------------------------------------');
    console.log('mongoimport --uri="mongodb://localhost:27017/ktop-v3" --collection=pages --mode=merge --file=migration_input/new_pages_imported.json');
    console.log('--------------------------------------------------');
    console.log('*(Hoặc sử dụng MongoDB Compass mở bảng `pages` chọn Import file `new_pages_imported.json` ở chế độ Merge)*\n');
  } catch (error) {
    console.error('❌ Lỗi khi xuất file kết quả di cư:', error.message);
  }
}

runMigration();
