import express from "express";
import cors from "cors";
import router from "./routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "LLM learning backend is running",
  });
});

app.use("/api/v1/requisitions", router);

export default app;
