import { Requisition } from "../models/requisitionModel.js";
import { ResumeMatchJob } from "../models/resumeMatchJobModel.js";
import { callLLM } from "./llmService.js";
import { parseLLMJson } from "../utils/llmResponseParser.js";
import { extractTextFromFile } from "../utils/fileTextExtractor.js";
import { resumeMatchPrompt } from "../utils/llmPrompts.js";

function serializeResumeMatchJob(job) {
  return {
    id: job._id.toString(),
    status: job.status,
    requisition: job.requisition,
    originalname: job.originalname,
    mimetype: job.mimetype,
    size: job.size,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
    started_at: job.started_at,
    completed_at: job.completed_at,
    failed_at: job.failed_at,
    error: job.error || null,
    extracted_text_preview: job.extracted_text_preview || undefined,
    candidate: job.candidate || undefined,
    candidate_snapshot: job.candidate_snapshot || undefined,
    match_score: job.match_score ?? undefined,
    match_result: job.match_result || undefined,
  };
}

export async function matchResumeAgainstRequisition(
  file,
  requisitionId,
  metadata = {},
) {
  if (!file) {
    throw new Error("resume_file is required");
  }

  const requisition = await Requisition.findById(requisitionId).lean();
  if (!requisition) {
    const error = new Error("Requisition not found");
    error.statusCode = 404;
    throw error;
  }

  const rawResumeText = await extractTextFromFile(file);
  if (!rawResumeText || rawResumeText.trim().length < 20) {
    throw new Error("Could not extract enough text from resume");
  }

  const prompt = resumeMatchPrompt(requisition, rawResumeText, metadata);
  const llmResponseText = await callLLM(prompt);
  const matchResult = parseLLMJson(llmResponseText);

  return {
    requisition,
    rawResumeText,
    llmResponseText,
    matchResult,
  };
}

export async function getResumeMatchJob(jobId) {
  const job = await ResumeMatchJob.findById(jobId).lean();
  return job ? serializeResumeMatchJob(job) : null;
}

export async function listResumeMatchJobs(requisitionId) {
  const filter = requisitionId ? { requisition: requisitionId } : {};
  const jobs = await ResumeMatchJob.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return jobs.map(serializeResumeMatchJob);
}
