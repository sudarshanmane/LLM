import "dotenv/config";
import { connectDB } from "../config/database.js";
import { closeRabbitConnection } from "../config/rabbitmq.js";
import { startUploadJobConsumer } from "./uploadJobConsumer.js";

const RETRY_DELAY_MS = Number(process.env.RABBITMQ_WORKER_RETRY_MS || 5000);

await connectDB();

// it is just to register the consumer and start processing messages from the queue. It will retry if RabbitMQ is not available.
async function startWorkerWithRetry() {
  while (true) {
    try {
      await startUploadJobConsumer();
      return;
    } catch (error) {
      console.error(
        `RabbitMQ worker connection failed: ${error.message}. Retrying in ${RETRY_DELAY_MS}ms...`,
      );
      await new Promise((resolve) => {
        setTimeout(resolve, RETRY_DELAY_MS);
      });
    }
  }
}

await startWorkerWithRetry();

async function shutdown(signal) {
  console.log(`${signal} received. Stopping upload worker...`);
  await closeRabbitConnection();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
