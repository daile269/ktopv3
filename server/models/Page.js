import mongoose from "mongoose";

const tapSchema = new mongoose.Schema(
  {
    aValues: {
      type: [String],
      default: [],
    },
    bValues: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
);

const pageSchema = new mongoose.Schema(
  {
    pageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    aValues: {
      type: [String],
      default: [],
    },
    bValues: {
      type: [String],
      default: [],
    },
    tapsData: {
      type: [tapSchema],
      default: undefined,
    },
    zValues: {
      type: [String],
      default: [],
    },
    dateValues: {
      type: [String],
      default: [],
    },
    deletedRows: {
      type: [Boolean],
      default: [],
    },
    sourceSTTValues: {
      type: [String],
      default: [],
    },
    purpleRangeFrom: {
      type: Number,
      default: 0,
    },
    purpleRangeTo: {
      type: Number,
      default: 0,
    },
    keepLastNRows: {
      type: Number,
      default: 500,
    },
    allQData: {
      type: [
        {
          aValues: [String],
          bValues: [String],
          tapsData: [tapSchema],
        },
      ],
      default: undefined,
    },
    pageLabel: {
      type: String,
      default: "",
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

const Page = mongoose.model("Page", pageSchema);

export default Page;
