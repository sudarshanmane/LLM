import express from "express";
import multer from "multer";
import {
  createRequisitionHandler,
  getCandidateHandler,
  getResumeMatchJobHandler,
  getUploadJobHandler,
  getRequisitionHandler,
  listCandidatesHandler,
  listResumeMatchJobsHandler,
  listUploadJobsHandler,
  listRequisitionsHandler,
  parseWithLlm,
  queueHealthHandler,
  uploadJd,
  uploadResumesForRequisition,
} from "../controllers/requisitionController.js";

const router = express.Router();
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post(
  "/upload-jd",
  (req, res, next) => {
    upload.fields([
      { name: "jd_file", maxCount: 10 },
      { name: "file", maxCount: 10 },
      { name: "upload", maxCount: 10 },
    ])(req, res, (err) => {
      if (err) {
        return next(err);
      }

      const files = req.files || {};
      req.uploadedFiles = [
        ...(Array.isArray(files.jd_file) ? files.jd_file : []),
        ...(Array.isArray(files.file) ? files.file : []),
        ...(Array.isArray(files.upload) ? files.upload : []),
      ];
      req.file = req.uploadedFiles[0] || null;

      next();
    });
  },
  uploadJd,
);

router.post(
  "/:id/upload-resumes",
  (req, res, next) => {
    upload.fields([
      { name: "resume_file", maxCount: 25 },
      { name: "file", maxCount: 25 },
      { name: "upload", maxCount: 25 },
    ])(req, res, (err) => {
      if (err) {
        return next(err);
      }

      const files = req.files || {};
      req.uploadedFiles = [
        ...(Array.isArray(files.resume_file) ? files.resume_file : []),
        ...(Array.isArray(files.file) ? files.file : []),
        ...(Array.isArray(files.upload) ? files.upload : []),
      ];
      req.file = req.uploadedFiles[0] || null;

      next();
    });
  },
  uploadResumesForRequisition,
);

router.get("/upload-jobs", listUploadJobsHandler);
router.get("/upload-jobs/:jobId", getUploadJobHandler);
router.get("/resume-match-jobs", listResumeMatchJobsHandler);
router.get("/resume-match-jobs/:jobId", getResumeMatchJobHandler);
router.get("/candidates", listCandidatesHandler);
router.get("/candidates/:candidateId", getCandidateHandler);
router.get("/queue/health", queueHealthHandler);
router.post("/parse-with-llm", parseWithLlm);
router.post("/", createRequisitionHandler);
router.get("/", listRequisitionsHandler);
router.get("/:id", getRequisitionHandler);

export default router;
