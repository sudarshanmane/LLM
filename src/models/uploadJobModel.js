import mongoose from "mongoose";

const uploadJobSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
      index: true,
    },
    originalname: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      default: "",
    },
    fieldname: {
      type: String,
      default: "",
    },
    error: {
      type: String,
      default: "",
    },
    extracted_text_preview: {
      type: String,
      default: "",
    },
    parsed_jd: {
      type: Object,
      default: null,
    },
    requisition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Requisition",
      default: null,
    },
    started_at: {
      type: Date,
      default: null,
    },
    completed_at: {
      type: Date,
      default: null,
    },
    failed_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

export const UploadJob = mongoose.model("UploadJob", uploadJobSchema);
