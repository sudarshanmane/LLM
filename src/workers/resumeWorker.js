import "dotenv/config";
import { connectDB } from "../config/database.js";
import { closeRabbitConnection } from "../config/rabbitmq.js";
import { startResumeMatchConsumer } from "./resumeMatchConsumer.js";

const RETRY_DELAY_MS = Number(process.env.RABBITMQ_WORKER_RETRY_MS || 5000);

await connectDB();

async function startWorkerWithRetry() {
  while (true) {
    try {
      await startResumeMatchConsumer();
      return;
    } catch (error) {
      console.error(
        `RabbitMQ resume worker connection failed: ${error.message}. Retrying in ${RETRY_DELAY_MS}ms...`,
      );
      await new Promise((resolve) => {
        setTimeout(resolve, RETRY_DELAY_MS);
      });
    }
  }
}

await startWorkerWithRetry();

async function shutdown(signal) {
  console.log(`${signal} received. Stopping resume worker...`);
  await closeRabbitConnection();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
