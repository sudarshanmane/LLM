import amqp from "amqplib";

export const RABBITMQ_UPLOAD_QUEUE =
  process.env.RABBITMQ_UPLOAD_QUEUE || "jd-upload-jobs";

export const RABBITMQ_RESUME_QUEUE =
  process.env.RABBITMQ_RESUME_QUEUE || "resume-match-jobs";

export const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";

let connection;
let channel;
const extraChannels = new Set();

export class RabbitConnectionError extends Error {
  constructor(error) {
    super(`RabbitMQ is unavailable at ${RABBITMQ_URL}`);
    this.name = "RabbitConnectionError";
    this.cause = error;
    this.statusCode = 503;
  }
}

export async function getRabbitChannel() {
  if (channel) {
    return channel;
  }

  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(RABBITMQ_UPLOAD_QUEUE, {
      durable: true,
    });

    connection.on("close", () => {
      connection = null;
      channel = null;
    });

    connection.on("error", () => {
      connection = null;
      channel = null;
    });
  } catch (error) {
    connection = null;
    channel = null;
    throw new RabbitConnectionError(error);
  }

  return channel;
}

export async function createRabbitChannel(queueName) {
  if (!connection) {
    await getRabbitChannel();
  }

  const newChannel = await connection.createChannel();
  await newChannel.assertQueue(queueName, {
    durable: true,
  });
  extraChannels.add(newChannel);

  newChannel.on("close", () => {
    extraChannels.delete(newChannel);
  });

  return newChannel;
}

export async function checkRabbitConnection() {
  const testConnection = await amqp.connect(RABBITMQ_URL);
  await testConnection.close();
}

export async function closeRabbitConnection() {
  for (const extraChannel of extraChannels) {
    await extraChannel.close();
  }
  extraChannels.clear();

  if (channel) {
    await channel.close();
    channel = null;
  }

  if (connection) {
    await connection.close();
    connection = null;
  }
}
