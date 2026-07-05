import { getRabbitChannel, RABBITMQ_UPLOAD_QUEUE } from "../config/rabbitmq.js";
import { UploadJob } from "../models/uploadJobModel.js";

function serializeJob(job) {
  return {
    id: job._id.toString(),
    status: job.status,
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
    parsed_jd: job.parsed_jd || undefined,
    requisition: job.requisition || undefined,
  };
}

export async function enqueueUploadedFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("jd_file is required");
  }

  const channel = await getRabbitChannel();
  
  const jobs = await UploadJob.insertMany(
    files.map((file) => ({
      status: "queued",
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
        RABBITMQ_UPLOAD_QUEUE,
        Buffer.from(
          JSON.stringify({
            jobId: job._id.toString(),
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
    await UploadJob.updateMany(
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

  return jobs.map(serializeJob);
}

export async function getUploadJob(jobId) {
  const job = await UploadJob.findById(jobId).lean();
  return job ? serializeJob(job) : null;
}

export async function listUploadJobs() {
  const jobs = await UploadJob.find().sort({ createdAt: -1 }).limit(100).lean();
  return jobs.map(serializeJob);
}
