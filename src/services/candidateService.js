import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { Candidate } from "../models/candidateModel.js";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumberOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toStringOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value).trim();
}

function organizationIdFromRequisition(requisition) {
  if (!requisition?.organization_name) {
    return "";
  }

  return String(requisition.organization_name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function serializeCandidate(candidate) {
  const source =
    typeof candidate.toObject === "function" ? candidate.toObject() : candidate;

  return {
    id: source.candidate_id,
    organization_id: source.organization_id,
    requisition: source.requisition,
    requisition_number: source.requisition_number,
    name: source.name,
    email: source.email,
    phone: source.phone,
    age: source.age,
    location: source.location,
    status: source.status,
    ingestion_platform: source.ingestion_platform,
    current_position: source.current_position,
    current_organization: source.current_organization,
    experience: source.experience,
    linkedin_profile: source.linkedin_profile,
    profile_match_score: source.profile_match_score,
    skills: source.skills,
    education: source.education,
    past_projects: source.past_projects,
    blob_url: source.blob_url,
    original_filename: source.original_filename,
    last_interviewed_at: source.last_interviewed_at,
    feedback_notes: source.feedback_notes,
    uploaded_at: source.uploaded_at,
    uploaded_by: source.uploaded_by,
    screening_id: source.screening_id,
    screening_status: source.screening_status,
    interview_pipeline: source.interview_pipeline,
    documents: source.documents,
    resume_match_job: source.resume_match_job,
  };
}

export async function createCandidateFromMatch({
  matchResult,
  requisition,
  file,
  metadata = {},
  resumeMatchJobId,
}) {
  const score = matchResult.profile_match_score || {};

  const candidate = await Candidate.create({
    candidate_id: randomUUID(),
    organization_id:
      metadata.organization_id ||
      matchResult.organization_id ||
      organizationIdFromRequisition(requisition),
    requisition: requisition._id,
    requisition_number:
      metadata.requisition_number ||
      matchResult.requisition_number ||
      requisition.requisition_number ||
      requisition._id.toString(),
    name: matchResult.name || "",
    email: toStringOrNull(matchResult.email),
    phone: toStringOrNull(matchResult.phone),
    age: toNumberOrNull(matchResult.age),
    location: toStringOrNull(matchResult.location),
    status: metadata.status || matchResult.status || "applied",
    ingestion_platform:
      metadata.ingestion_platform || matchResult.ingestion_platform || "direct",
    current_position: toStringOrNull(matchResult.current_position),
    current_organization: toStringOrNull(matchResult.current_organization),
    experience: toNumberOrNull(matchResult.experience),
    linkedin_profile: toStringOrNull(matchResult.linkedin_profile),
    profile_match_score: {
      overall_match_score: toNumberOrNull(score.overall_match_score),
      skill_match_score: toNumberOrNull(score.skill_match_score),
      experience_match_score: toNumberOrNull(score.experience_match_score),
      education_match_score: toNumberOrNull(score.education_match_score),
      culture_fit: toNumberOrNull(score.culture_fit),
      reasoning: score.reasoning || "",
      strengths: toArray(score.strengths),
      gaps: toArray(score.gaps),
    },
    skills: toArray(matchResult.skills),
    education: toArray(matchResult.education),
    past_projects: toArray(matchResult.past_projects),
    blob_url: metadata.blob_url || "",
    original_filename: file.originalname,
    uploaded_at: new Date(),
    uploaded_by: metadata.uploaded_by || null,
    screening_id: metadata.screening_id || null,
    screening_status: metadata.screening_status || null,
    interview_pipeline: metadata.interview_pipeline || null,
    documents: metadata.documents || null,
    resume_match_job: resumeMatchJobId,
  });

  return candidate;
}

export async function getCandidate(candidateId) {
  const filters = [{ candidate_id: candidateId }];

  if (mongoose.Types.ObjectId.isValid(candidateId)) {
    filters.push({ _id: candidateId });
  }

  const candidate = await Candidate.findOne({ $or: filters }).lean();

  return candidate ? serializeCandidate(candidate) : null;
}

export async function listCandidates(requisitionId) {
  const filter = requisitionId ? { requisition: requisitionId } : {};
  const candidates = await Candidate.find(filter)
    .sort({ uploaded_at: -1, createdAt: -1 })
    .limit(100)
    .lean();

  return candidates.map(serializeCandidate);
}
