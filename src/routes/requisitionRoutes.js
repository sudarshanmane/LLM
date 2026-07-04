import express from "express";
import multer from "multer";
import {
  createRequisitionHandler,
  getRequisitionHandler,
  listRequisitionsHandler,
  parseWithLlm,
  uploadJd,
} from "../controllers/requisitionController.js";

const router = express.Router();

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post("/upload-jd", upload.single("jd_file"), uploadJd);
router.post("/parse-with-llm", parseWithLlm);
router.post("/", createRequisitionHandler);
router.get("/", listRequisitionsHandler);
router.get("/:id", getRequisitionHandler);

export default router;
