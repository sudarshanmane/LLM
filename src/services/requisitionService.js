import { Requisition } from "../models/requisitionModel.js";
import { jdParserPrompt } from "../utils/llmPrompts.js";
import { callLLM } from "./llmService.js";
import { parseLLMJson } from "../utils/llmResponseParser.js";
import { extractTextFromFile } from "../utils/fileTextExtractor.js";

export function normalizeQuestionBank(questionBank) {
  if (!Array.isArray(questionBank)) {
    return [];
  }

  return questionBank
    .filter((item) => item && typeof item === "object" && item.question)
    .slice(0, 10)
    .map((item) => ({
      question: String(item.question).trim(),
      answer_format: item.answer_format
        ? String(item.answer_format).trim()
        : "",
      category: item.category ? String(item.category).trim() : "",
      difficulty: item.difficulty ? String(item.difficulty).trim() : "",
    }));
}

function buildRequisitionPayload(payload, fallbackSource = "manual") {
  return {
    job_title: payload.job_title || "Untitled Role",
    organization_name: payload.organization_name || "",
    job_description: payload.job_description || "",
    department: payload.department || "Not specified",
    location: payload.location || "Not specified",
    employment_type: payload.employment_type || "Full-time",
    experience_level: payload.experience_level || "Mid",
    responsibilities: Array.isArray(payload.responsibilities)
      ? payload.responsibilities
      : [],
    requirements: Array.isArray(payload.requirements)
      ? payload.requirements
      : [],
    skills: Array.isArray(payload.skills) ? payload.skills : [],
    benefits: Array.isArray(payload.benefits) ? payload.benefits : [],
    salary_min: payload.salary_min ?? null,
    salary_max: payload.salary_max ?? null,
    salary_currency: payload.salary_currency || "USD",
    years_of_experience_min: payload.years_of_experience_min ?? null,
    work_arrangement: payload.work_arrangement || "onsite",
    question_bank: normalizeQuestionBank(payload.question_bank),
    source: payload.source || fallbackSource,
  };
}

export async function uploadAndParseRequisition(file) {
  if (!file) {
    throw new Error("jd_file is required");
  }

  const rawJdText = await extractTextFromFile(file);


  if (!rawJdText || rawJdText.trim().length < 20) {
    throw new Error("Could not extract enough text from file");
  }

  const prompt = jdParserPrompt(rawJdText);
  const llmResponseText = await callLLM(prompt);
  const parsedJD = parseLLMJson(llmResponseText);
  const requisition = await createRequisition({
    ...parsedJD,
    source: "llm",
    job_description: parsedJD.job_description || rawJdText,
  });

  return {
    rawJdText,
    llmResponseText,
    parsedJD,
    requisition,
  };
}

export async function parseAndSaveRequisition(rawJdText) {
  if (!rawJdText || rawJdText.trim().length < 20) {
    throw new Error(
      "raw_jd_text is required and should contain enough JD content",
    );
  }

  const prompt = jdParserPrompt(rawJdText);
  const llmResponseText = await callLLM(prompt);
  const parsedJD = parseLLMJson(llmResponseText);
  const requisition = await createRequisition({
    ...parsedJD,
    source: "llm",
    job_description: parsedJD.job_description || rawJdText,
  });

  return {
    rawJdText,
    llmResponseText,
    parsedJD,
    requisition,
  };
}

export async function createRequisition(payload) {
  const requisitionData = buildRequisitionPayload(
    payload,
    payload?.source || "manual",
  );
  return Requisition.create(requisitionData);
}

export async function listRequisitions() {
  return Requisition.find().sort({ createdAt: -1 });
}

export async function getRequisitionById(id) {
  return Requisition.findById(id);
}
