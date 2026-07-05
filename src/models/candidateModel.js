import mongoose from "mongoose";

const profileMatchScoreSchema = new mongoose.Schema(
  {
    overall_match_score: {
      type: Number,
      default: null,
    },
    skill_match_score: {
      type: Number,
      default: null,
    },
    experience_match_score: {
      type: Number,
      default: null,
    },
    education_match_score: {
      type: Number,
      default: null,
    },
    culture_fit: {
      type: Number,
      default: null,
    },
    reasoning: {
      type: String,
      default: "",
    },
    strengths: {
      type: [String],
      default: [],
    },
    gaps: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
);

const candidateSchema = new mongoose.Schema(
  {
    candidate_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    organization_id: {
      type: String,
      default: "",
      index: true,
    },
    requisition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Requisition",
      required: true,
      index: true,
    },
    requisition_number: {
      type: String,
      default: "",
      index: true,
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: null,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    age: {
      type: Number,
      default: null,
    },
    location: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      default: "applied",
      index: true,
    },
    ingestion_platform: {
      type: String,
      default: "direct",
    },
    current_position: {
      type: String,
      default: null,
    },
    current_organization: {
      type: String,
      default: null,
    },
    experience: {
      type: Number,
      default: null,
    },
    linkedin_profile: {
      type: String,
      default: null,
    },
    profile_match_score: {
      type: profileMatchScoreSchema,
      default: () => ({}),
    },
    skills: {
      type: [String],
      default: [],
    },
    education: {
      type: [Object],
      default: [],
    },
    past_projects: {
      type: [
        {
          name: {
            type: String,
            default: "",
          },
          description: {
            type: String,
            default: "",
          },
          technologies: {
            type: [String],
            default: [],
          },
          role: {
            type: String,
            default: "",
          },
        },
      ],
      default: [],
    },
    blob_url: {
      type: String,
      default: "",
    },
    original_filename: {
      type: String,
      default: "",
    },
    last_interviewed_at: {
      type: Date,
      default: null,
    },
    feedback_notes: {
      type: [Object],
      default: [],
    },
    uploaded_at: {
      type: Date,
      default: Date.now,
    },
    uploaded_by: {
      type: String,
      default: null,
    },
    screening_id: {
      type: String,
      default: null,
    },
    screening_status: {
      type: String,
      default: null,
    },
    interview_pipeline: {
      type: Object,
      default: null,
    },
    documents: {
      type: Object,
      default: null,
    },
    resume_match_job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResumeMatchJob",
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

candidateSchema.set("toJSON", {
  transform(_doc, ret) {
    ret.id = ret.candidate_id;
    delete ret.candidate_id;
    delete ret.__v;
    return ret;
  },
});

export const Candidate = mongoose.model("Candidate", candidateSchema);
