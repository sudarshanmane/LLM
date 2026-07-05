import {
  createRabbitChannel,
  RABBITMQ_RESUME_QUEUE,
} from "../config/rabbitmq.js";
import { ResumeMatchJob } from "../models/resumeMatchJobModel.js";
import {
  createCandidateFromMatch,
  serializeCandidate,
} from "../services/candidateService.js";
import { matchResumeAgainstRequisition } from "../services/resumeMatchService.js";

let consumerStarted = false;

async function processResumeMatchPayload(payload) {
  const { jobId, requisitionId, file, metadata = {} } = payload;

  const job = await ResumeMatchJob.findById(jobId);
  if (!job || job.status === "completed") {
    return;
  }

  job.status = "processing";
  job.started_at = new Date();
  job.error = "";
  await job.save();

  try {
    console.log(
      `Processing resume match job ${jobId} for file ${file.originalname}`,
    );
    const result = await matchResumeAgainstRequisition(
      file,
      requisitionId,
      metadata,
    );
    const candidate = await createCandidateFromMatch({
      matchResult: result.matchResult,
      requisition: result.requisition,
      file,
      metadata,
      resumeMatchJobId: job._id,
    });

    job.status = "completed";
    job.completed_at = new Date();
    job.extracted_text_preview = result.rawResumeText.slice(0, 500);
    job.candidate = candidate._id;
    job.candidate_snapshot = serializeCandidate(candidate);
    job.match_score =
      typeof result.matchResult.profile_match_score?.overall_match_score ===
      "number"
        ? result.matchResult.profile_match_score.overall_match_score
        : null;
    job.match_result = result.matchResult;
    await job.save();
  } catch (error) {
    job.status = "failed";
    job.failed_at = new Date();
    job.error = error.message;
    await job.save();
  }
}

export async function startResumeMatchConsumer() {
  if (consumerStarted) {
    return;
  }

  const channel = await createRabbitChannel(RABBITMQ_RESUME_QUEUE);
  const prefetch = Number(process.env.RABBITMQ_RESUME_PREFETCH || 3);

  await channel.prefetch(prefetch);

  await channel.consume(
    RABBITMQ_RESUME_QUEUE,
    async (message) => {
      if (!message) {
        return;
      }

      try {
        const payload = JSON.parse(message.content.toString());
        await processResumeMatchPayload(payload);
        channel.ack(message);
      } catch (error) {
        console.error("RabbitMQ resume match job failed:", error.message);
        channel.nack(message, false, false);
      }
    },
    { noAck: false },
  );

  consumerStarted = true;
  console.log(
    `RabbitMQ resume match consumer started on queue ${RABBITMQ_RESUME_QUEUE}`,
  );
}
