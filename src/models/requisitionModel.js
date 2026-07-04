import mongoose from "mongoose";

const requisitionSchema = new mongoose.Schema(
  {
    job_title: {
      type: String,
      required: true,
      trim: true,
    },

    organization_name: {
      type: String,
      default: "",
    },

    job_description: {
      type: String,
      required: true,
    },

    department: {
      type: String,
      default: "Not specified",
    },

    location: {
      type: String,
      default: "Not specified",
    },

    employment_type: {
      type: String,
      default: "Full-time",
    },

    experience_level: {
      type: String,
      default: "Mid",
    },

    responsibilities: {
      type: [String],
      default: [],
    },

    requirements: {
      type: [String],
      default: [],
    },

    skills: {
      type: [String],
      default: [],
    },

    benefits: {
      type: [String],
      default: [],
    },

    salary_min: {
      type: Number,
      default: null,
    },

    salary_max: {
      type: Number,
      default: null,
    },

    salary_currency: {
      type: String,
      default: "USD",
    },

    years_of_experience_min: {
      type: Number,
      default: null,
    },

    work_arrangement: {
      type: String,
      default: "onsite",
    },

    interview_rounds: {
      type: Array,
      default: [],
    },

    question_bank: {
      type: [
        {
          question: {
            type: String,
            required: true,
            trim: true,
          },
          answer_format: {
            type: String,
            default: "",
            trim: true,
          },
          category: {
            type: String,
            default: "",
            trim: true,
          },
          difficulty: {
            type: String,
            default: "",
            trim: true,
          },
        },
      ],
      default: [],
    },

    screening_script: {
      type: String,
      default: "",
    },

    evaluation_framework: {
      type: Object,
      default: {},
    },

    source: {
      type: String,
      enum: ["manual", "llm"],
      default: "llm",
    },
  },
  { timestamps: true },
);

export const Requisition = mongoose.model("Requisition", requisitionSchema);
