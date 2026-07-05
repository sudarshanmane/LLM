# RabbitMQ Upload Queue

## Flow

1. `POST /api/v1/requisitions/upload-jd` receives one or more uploaded JD files.
2. The API creates `UploadJob` records in MongoDB with `queued` status.
3. The API publishes one persistent RabbitMQ message per file to the `jd-upload-jobs` queue.
4. A separate upload worker process consumes messages from RabbitMQ with manual acknowledgements.
5. The worker marks the job `processing`, extracts file text, calls the LLM, saves the requisition, and marks the job `completed`.
6. If processing fails, the worker marks the job `failed` with the error message and acknowledges the message so it does not loop forever.

## System Design

```txt
Client/Postman
  -> API Service
    -> MongoDB UploadJob(status=queued)
    -> RabbitMQ Queue(jd-upload-jobs)
      -> Worker Service
        -> MongoDB UploadJob(status=processing)
        -> File text extraction
        -> LLM parsing
        -> MongoDB Requisition
        -> MongoDB UploadJob(status=completed/failed)
```

The API service and worker service are separate Node.js processes. This keeps the upload API fast and lets worker capacity scale independently from request traffic.

## Responsibilities

- Express route: accepts multipart files and normalizes uploaded files.
- Controller: validates request and returns `202 Accepted`.
- Queue service: creates Mongo job rows and publishes RabbitMQ messages.
- RabbitMQ: buffers upload jobs between the API and worker.
- Worker process: runs the slow JD parsing and LLM workflow.
- MongoDB: stores job status, result metadata, and requisitions.

## Delivery Semantics

- Messages are published as persistent RabbitMQ messages.
- The queue is durable.
- The worker uses manual acknowledgement.
- The worker acknowledges a message after it updates MongoDB to `completed` or `failed`.
- `RABBITMQ_UPLOAD_PREFETCH` controls how many jobs a worker can process at once.

## Local RabbitMQ

Start RabbitMQ:

```bash
docker compose up -d rabbitmq
```

RabbitMQ management UI:

```txt
http://localhost:15672
username: guest
password: guest
```

Required environment variables:

```bash
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_UPLOAD_QUEUE=jd-upload-jobs
RABBITMQ_UPLOAD_PREFETCH=1
RABBITMQ_WORKER_RETRY_MS=5000
```

## API

Start API:

```bash
npm run dev
```

Start worker in a second terminal:

```bash
npm run dev:worker
```

Check RabbitMQ connectivity:

```bash
curl http://localhost:5000/api/v1/requisitions/queue/health
```

If RabbitMQ is not running, uploads return `503 Service Unavailable` instead of exposing a raw socket error.

Upload files:

```bash
curl -X POST http://localhost:5000/api/v1/requisitions/upload-jd \
  -F "jd_file=@/path/to/job-description.pdf"
```

List jobs:

```bash
curl http://localhost:5000/api/v1/requisitions/upload-jobs
```

Get one job:

```bash
curl http://localhost:5000/api/v1/requisitions/upload-jobs/<jobId>
```
