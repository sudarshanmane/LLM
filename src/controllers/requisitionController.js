import {
  createRequisition,
  getRequisitionById,
  listRequisitions,
  parseAndSaveRequisition,
} from "../services/requisitionService.js";
import {
  enqueueUploadedFiles,
  getUploadJob,
  listUploadJobs,
} from "../services/uploadQueueService.js";
import {
  enqueueResumeMatchFiles,
} from "../services/resumeMatchQueueService.js";
import {
  getResumeMatchJob,
  listResumeMatchJobs,
} from "../services/resumeMatchService.js";
import {
  getCandidate,
  listCandidates,
} from "../services/candidateService.js";
import {
  checkRabbitConnection,
  RabbitConnectionError,
  RABBITMQ_RESUME_QUEUE,
  RABBITMQ_UPLOAD_QUEUE,
  RABBITMQ_URL,
} from "../config/rabbitmq.js";

const API_BUILD = "llm-chat-json-upload-v3";

export async function uploadJd(req, res) {
  try {
    const files = Array.isArray(req.uploadedFiles)
      ? req.uploadedFiles
      : [req.file].filter(Boolean);

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "jd_file is required",
      });
    }

    const jobs = await enqueueUploadedFiles(files);

    return res.status(202).json({
      success: true,
      message: "JD file upload queued for processing",
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    if (error instanceof RabbitConnectionError) {
      return res.status(503).json({
        success: false,
        build: API_BUILD,
        message: "RabbitMQ is unavailable. Start RabbitMQ before uploading JD files.",
        queue: RABBITMQ_UPLOAD_QUEUE,
        rabbitmq_url: RABBITMQ_URL,
        error: error.cause?.message || error.message,
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      build: API_BUILD,
      message: "Failed to queue JD upload",
      error: error.message,
    });
  }
}

export async function queueHealthHandler(req, res) {
  try {
    await checkRabbitConnection();

    return res.status(200).json({
      success: true,
      message: "RabbitMQ is reachable",
      queues: {
        upload: RABBITMQ_UPLOAD_QUEUE,
        resume_match: RABBITMQ_RESUME_QUEUE,
      },
      rabbitmq_url: RABBITMQ_URL,
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: "RabbitMQ is unavailable",
      queues: {
        upload: RABBITMQ_UPLOAD_QUEUE,
        resume_match: RABBITMQ_RESUME_QUEUE,
      },
      rabbitmq_url: RABBITMQ_URL,
      error: error.message,
    });
  }
}

export async function uploadResumesForRequisition(req, res) {
  try {
    const files = Array.isArray(req.uploadedFiles)
      ? req.uploadedFiles
      : [req.file].filter(Boolean);

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "resume_file is required",
      });
    }

    const jobs = await enqueueResumeMatchFiles(req.params.id, files, req.body);

    return res.status(202).json({
      success: true,
      message: "Resume upload queued for matching",
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    if (error instanceof RabbitConnectionError) {
      return res.status(503).json({
        success: false,
        build: API_BUILD,
        message:
          "RabbitMQ is unavailable. Start RabbitMQ before uploading resumes.",
        queue: RABBITMQ_RESUME_QUEUE,
        rabbitmq_url: RABBITMQ_URL,
        error: error.cause?.message || error.message,
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      build: API_BUILD,
      message: "Failed to queue resume upload",
      error: error.message,
    });
  }
}

export async function listResumeMatchJobsHandler(req, res) {
  const jobs = await listResumeMatchJobs(req.query.requisition_id);

  return res.status(200).json({
    success: true,
    count: jobs.length,
    data: jobs,
  });
}

export async function getResumeMatchJobHandler(req, res) {
  const job = await getResumeMatchJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: "Resume match job not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: job,
  });
}

export async function listCandidatesHandler(req, res) {
  const candidates = await listCandidates(req.query.requisition_id);

  return res.status(200).json({
    success: true,
    count: candidates.length,
    data: candidates,
  });
}

export async function getCandidateHandler(req, res) {
  const candidate = await getCandidate(req.params.candidateId);

  if (!candidate) {
    return res.status(404).json({
      success: false,
      message: "Candidate not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: candidate,
  });
}

export async function listUploadJobsHandler(req, res) {
  const jobs = await listUploadJobs();

  return res.status(200).json({
    success: true,
    count: jobs.length,
    data: jobs,
  });
}

export async function getUploadJobHandler(req, res) {
  const job = await getUploadJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: "Upload job not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: job,
  });
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
