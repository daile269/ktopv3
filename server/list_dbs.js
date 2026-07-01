import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ktop-v3';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB!');

    const admin = new mongoose.mongo.Admin(mongoose.connection.db);
    const dbs = await admin.listDatabases();
    console.log('Databases:', dbs.databases.map(d => d.name));
    
    // print collections in ktop-v3 database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in current DB:', collections.map(c => c.name));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
