import mongoose from "mongoose";

const resumeMatchJobSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
      index: true,
    },
    requisition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Requisition",
      required: true,
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
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      default: null,
    },
    candidate_snapshot: {
      type: Object,
      default: null,
    },
    match_score: {
      type: Number,
      default: null,
    },
    match_result: {
      type: Object,
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

export const ResumeMatchJob = mongoose.model(
  "ResumeMatchJob",
  resumeMatchJobSchema,
);
