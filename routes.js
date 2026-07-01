import express from "express";
import { Requisition } from "./requisitions.js";
import { jdParserPrompt } from "./jdPrompt.js";
import { callLLM } from "./calLLM.js";
import { parseLLMJson } from "./parseLLMJSON.js";
import multer from "multer";
import { extractTextFromFile } from "./extractTextFromFiles.js";

const router = express.Router();
const API_BUILD = "llm-chat-json-upload-v3";

function normalizeQuestionBank(questionBank) {
  if (!Array.isArray(questionBank)) {
    return [];
  }

  return questionBank
    .filter((item) => item && typeof item === "object" && item.question)
    .slice(0, 10)
    .map((item) => ({
      question: String(item.question).trim(),
      answer_format: item.answer_format ? String(item.answer_format).trim() : "",
      category: item.category ? String(item.category).trim() : "",
      difficulty: item.difficulty ? String(item.difficulty).trim() : "",
    }));
}

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post("/upload-jd", upload.single("jd_file"), async (req, res) => {
  let llmResponseText = "";
  let stage = "upload";

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "jd_file is required",
      });
    }

    stage = "extract_text";
    const rawJdText = await extractTextFromFile(req.file);

    if (!rawJdText || rawJdText.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: "Could not extract enough text from file",
      });
    }

    const prompt = jdParserPrompt(rawJdText);
    stage = "call_llm";
    llmResponseText = await callLLM(prompt);
    stage = "parse_llm_json";
    const parsedJD = parseLLMJson(llmResponseText);

    stage = "save_requisition";
    const requisition = await Requisition.create({
      job_title: parsedJD.job_title || "Untitled Role",
      organization_name: parsedJD.organization_name || "",
      job_description: parsedJD.job_description || rawJdText,
      department: parsedJD.department || "Not specified",
      location: parsedJD.location || "Not specified",
      employment_type: parsedJD.employment_type || "Full-time",
      experience_level: parsedJD.experience_level || "Mid",
      responsibilities: Array.isArray(parsedJD.responsibilities)
        ? parsedJD.responsibilities
        : [],
      requirements: Array.isArray(parsedJD.requirements)
        ? parsedJD.requirements
        : [],
      skills: Array.isArray(parsedJD.skills) ? parsedJD.skills : [],
      benefits: Array.isArray(parsedJD.benefits) ? parsedJD.benefits : [],
      salary_min: parsedJD.salary_min ?? null,
      salary_max: parsedJD.salary_max ?? null,
      salary_currency: parsedJD.salary_currency || "USD",
      years_of_experience_min: parsedJD.years_of_experience_min ?? null,
      work_arrangement: parsedJD.work_arrangement || "onsite",
      question_bank: normalizeQuestionBank(parsedJD.question_bank),
      source: "llm",
    });

    return res.status(201).json({
      success: true,
      message: "JD file parsed with LLM and saved successfully",
      extracted_text_preview: rawJdText.slice(0, 500),
      parsed_jd: parsedJD,
      data: requisition,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      build: API_BUILD,
      message: "Failed to upload and parse JD",
      stage,
      error: error.message,
      llm_response_preview: llmResponseText
        ? llmResponseText.slice(0, 1000)
        : undefined,
    });
  }
});

/**
 * Parse JD using LLM and save to MongoDB
 * POST /api/v1/requisitions/parse-with-llm
 */
router.post("/parse-with-llm", async (req, res) => {
  try {
    const { raw_jd_text } = req.body;

    if (!raw_jd_text || raw_jd_text.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: "raw_jd_text is required and should contain enough JD content",
      });
    }

    // Step 1: Create prompt
    const prompt = jdParserPrompt(raw_jd_text);

    // Step 2: Send prompt to LLM
    const llmResponseText = await callLLM(prompt);

    // Step 3: Convert LLM response string into JS object
    const parsedJD = parseLLMJson(llmResponseText);

    // Step 4: Important fallback handling
    const finalJD = {
      job_title: parsedJD.job_title || "Untitled Role",
      organization_name: parsedJD.organization_name || "",
      job_description: parsedJD.job_description || raw_jd_text,
      department: parsedJD.department || "Not specified",
      location: parsedJD.location || "Not specified",
      employment_type: parsedJD.employment_type || "Full-time",
      experience_level: parsedJD.experience_level || "Mid",
      responsibilities: Array.isArray(parsedJD.responsibilities)
        ? parsedJD.responsibilities
        : [],
      requirements: Array.isArray(parsedJD.requirements)
        ? parsedJD.requirements
        : [],
      skills: Array.isArray(parsedJD.skills) ? parsedJD.skills : [],
      benefits: Array.isArray(parsedJD.benefits) ? parsedJD.benefits : [],
      salary_min: parsedJD.salary_min ?? null,
      salary_max: parsedJD.salary_max ?? null,
      salary_currency: parsedJD.salary_currency || "USD",
      years_of_experience_min: parsedJD.years_of_experience_min ?? null,
      work_arrangement: parsedJD.work_arrangement || "onsite",
      question_bank: normalizeQuestionBank(parsedJD.question_bank),
      source: "llm",
    };

    // Step 5: Store in MongoDB
    const requisition = await Requisition.create(finalJD);

    return res.status(201).json({
      success: true,
      build: API_BUILD,
      message: "JD parsed using LLM and saved successfully",
      raw_llm_response: llmResponseText,
      parsed_jd: parsedJD,
      data: requisition,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      build: API_BUILD,
      message: "Failed to parse JD using LLM",
      error: error.message,
    });
  }
});

/**
 * Create JD manually
 * POST /api/v1/requisitions
 */
router.post("/", async (req, res) => {
  try {
    const {
      job_title,
      job_description,
      organization_name,
      department,
      location,
      employment_type,
      experience_level,
      responsibilities,
      requirements,
      skills,
      benefits,
      salary_min,
      salary_max,
      salary_currency,
      years_of_experience_min,
      work_arrangement,
      question_bank,
    } = req.body;

    if (!job_title) {
      return res.status(400).json({
        success: false,
        message: "job_title is required",
      });
    }

    if (!job_description) {
      return res.status(400).json({
        success: false,
        message: "job_description is required",
      });
    }

    const requisition = await Requisition.create({
      job_title,
      job_description,
      organization_name,
      department,
      location,
      employment_type,
      experience_level,
      responsibilities,
      requirements,
      skills,
      benefits,
      salary_min,
      salary_max,
      salary_currency,
      years_of_experience_min,
      work_arrangement,
      question_bank: normalizeQuestionBank(question_bank),
      source: "manual",
    });

    return res.status(201).json({
      success: true,
      message: "Requisition created successfully",
      data: requisition,
    });
  } catch (error) {
    console.error("Create requisition error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create requisition",
      error: error.message,
    });
  }
});

/**
 * Get all JDs
 * GET /api/v1/requisitions
 */
router.get("/", async (req, res) => {
  try {
    const requisitions = await Requisition.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requisitions.length,
      data: requisitions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch requisitions",
      error: error.message,
    });
  }
});

/**
 * Get single JD
 * GET /api/v1/requisitions/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const requisition = await Requisition.findById(req.params.id);

    if (!requisition) {
      return res.status(404).json({
        success: false,
        message: "Requisition not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: requisition,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch requisition",
      error: error.message,
    });
  }
});

export default router;
