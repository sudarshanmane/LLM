import {
  getRabbitChannel,
  RABBITMQ_RESUME_QUEUE,
} from "../config/rabbitmq.js";
import { Requisition } from "../models/requisitionModel.js";
import { ResumeMatchJob } from "../models/resumeMatchJobModel.js";

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

function normalizeMetadata(metadata = {}) {
  return {
    organization_id: metadata.organization_id || "",
    requisition_number: metadata.requisition_number || "",
    uploaded_by: metadata.uploaded_by || null,
    ingestion_platform: metadata.ingestion_platform || "direct",
    status: metadata.status || "applied",
    blob_url: metadata.blob_url || "",
    screening_id: metadata.screening_id || null,
    screening_status: metadata.screening_status || null,
  };
}

export async function enqueueResumeMatchFiles(requisitionId, files, metadata) {
  if (!requisitionId) {
    throw new Error("requisition id is required");
  }

  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("resume_file is required");
  }

  const requisition = await Requisition.findById(requisitionId).select("_id");
  if (!requisition) {
    const error = new Error("Requisition not found");
    error.statusCode = 404;
    throw error;
  }

  const normalizedMetadata = normalizeMetadata(metadata);
  const channel = await getRabbitChannel();
  await channel.assertQueue(RABBITMQ_RESUME_QUEUE, {
    durable: true,
  });

  const jobs = await ResumeMatchJob.insertMany(
    files.map((file) => ({
      status: "queued",
      requisition: requisition._id,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      filename: file.filename,
      fieldname: file.fieldname,
    })),
  );

  try {
    for (const job of jobs) {
      const published = channel.sendToQueue(
        RABBITMQ_RESUME_QUEUE,
        Buffer.from(
          JSON.stringify({
            jobId: job._id.toString(),
            requisitionId: requisition._id.toString(),
            metadata: normalizedMetadata,
            file: {
              path: job.path,
              originalname: job.originalname,
              mimetype: job.mimetype,
              size: job.size,
              filename: job.filename,
              fieldname: job.fieldname,
            },
          }),
        ),
        {
          contentType: "application/json",
          persistent: true,
          messageId: job._id.toString(),
        },
      );

      if (!published) {
        throw new Error("RabbitMQ write buffer is full");
      }
    }
  } catch (error) {
    await ResumeMatchJob.updateMany(
      { _id: { $in: jobs.map((job) => job._id) } },
      {
        $set: {
          status: "failed",
          failed_at: new Date(),
          error: `Failed to publish RabbitMQ message: ${error.message}`,
        },
      },
    );

    throw error;
  }

  return jobs.map(serializeResumeMatchJob);
}
