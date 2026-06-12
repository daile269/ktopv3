import mongoose from 'mongoose';

const pageSchema = new mongoose.Schema({
  pageId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  aValues: {
    type: [String],
    default: []
  },
  bValues: {
    type: [String],
    default: []
  },
  zValues: {
    type: [String],
    default: []
  },
  dateValues: {
    type: [String],
    default: []
  },
  deletedRows: {
    type: [Boolean],
    default: []
  },
  sourceSTTValues: {
    type: [String],
    default: []
  },
  purpleRangeFrom: {
    type: Number,
    default: 0
  },
  purpleRangeTo: {
    type: Number,
    default: 0
  },
  keepLastNRows: {
    type: Number,
    default: 110
  },
  allQData: {
    type: [{
      aValues: [String],
      bValues: [String]
    }],
    default: undefined
  },
  pageLabel: {
    type: String,
    default: ""
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Page = mongoose.model('Page', pageSchema);

export default Page;
