import {
  createRequisition,
  getRequisitionById,
  listRequisitions,
  parseAndSaveRequisition,
  uploadAndParseRequisition,
} from "../services/requisitionService.js";

const API_BUILD = "llm-chat-json-upload-v3";

export async function uploadJd(req, res) {
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
    const result = await uploadAndParseRequisition(req.file);
    llmResponseText = result.llmResponseText || "";

    return res.status(201).json({
      success: true,
      message: "JD file parsed with LLM and saved successfully",
      extracted_text_preview: result.rawJdText.slice(0, 500),
      parsed_jd: result.parsedJD,
      data: result.requisition,
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
}

export async function parseWithLlm(req, res) {
  try {
    const { raw_jd_text } = req.body;
    const result = await parseAndSaveRequisition(raw_jd_text);

    return res.status(201).json({
      success: true,
      build: API_BUILD,
      message: "JD parsed using LLM and saved successfully",
      raw_llm_response: result.llmResponseText,
      parsed_jd: result.parsedJD,
      data: result.requisition,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      build: API_BUILD,
      message: "Failed to parse JD using LLM",
      error: error.message,
    });
  }
}

export async function createRequisitionHandler(req, res) {
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

    const requisition = await createRequisition({
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
      source: "manual",
    });

    return res.status(201).json({
      success: true,
      message: "Requisition created successfully",
      data: requisition,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create requisition",
      error: error.message,
    });
  }
}

export async function listRequisitionsHandler(req, res) {
  try {
    const requisitions = await listRequisitions();

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
}

export async function getRequisitionHandler(req, res) {
  try {
    const requisition = await getRequisitionById(req.params.id);

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
}
