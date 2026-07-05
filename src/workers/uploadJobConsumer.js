import { getRabbitChannel, RABBITMQ_UPLOAD_QUEUE } from "../config/rabbitmq.js";
import { UploadJob } from "../models/uploadJobModel.js";
import { uploadAndParseRequisition } from "../services/requisitionService.js";

// Prevents the consumer from being registered more than once in the same process.
let consumerStarted = false;

// Processes one uploaded job by updating its status and running the parsing flow.
async function processUploadPayload(payload) {
  const { jobId, file } = payload;

  const job = await UploadJob.findById(jobId);
  if (!job || job.status === "completed") {
    return;
  }

  job.status = "processing";
  job.started_at = new Date();
  job.error = "";
  await job.save();

  try {
    console.log(`Processing upload job ${jobId} for file ${file.originalname}`);
    const result = await uploadAndParseRequisition(file);

    job.status = "completed";
    job.completed_at = new Date();
    job.extracted_text_preview = result.rawJdText.slice(0, 500);
    job.parsed_jd = result.parsedJD;
    job.requisition = result.requisition._id;
    await job.save();
  } catch (error) {
    job.status = "failed";
    job.failed_at = new Date();
    job.error = error.message;
    await job.save();
  }
}

export async function startUploadJobConsumer() {
  // Skip setup if the consumer has already been registered.
  if (consumerStarted) {
    return;
  }

  // Create or reuse the RabbitMQ channel for queue communication.
  const channel = await getRabbitChannel();
  const prefetch = Number(process.env.RABBITMQ_UPLOAD_PREFETCH || 3);

  // Limit how many messages are processed concurrently by this worker.
  await channel.prefetch(prefetch);

  // Subscribe to the upload queue and process each incoming message.
  await channel.consume(
    RABBITMQ_UPLOAD_QUEUE,
    async (message) => {
      if (!message) {
        return;
      }

      try {
        const payload = JSON.parse(message.content.toString());
        await processUploadPayload(payload);
        channel.ack(message);
      } catch (error) {
        console.error("RabbitMQ upload job failed:", error.message);
        channel.nack(message, false, false);
      }
    },
    { noAck: false },
  );

  // Mark the consumer as started so repeated calls do not re-register it.
  consumerStarted = true;
  console.log(
    `RabbitMQ upload consumer started on queue ${RABBITMQ_UPLOAD_QUEUE}`,
  );
}
