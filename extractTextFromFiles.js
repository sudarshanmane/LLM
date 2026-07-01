import fs from "fs/promises";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export async function extractTextFromFile(file) {
  const mimetype = file.mimetype;
  const filePath = file.path;

  if (mimetype === "application/pdf") {
    const buffer = await fs.readFile(filePath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  }

  if (
    mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  if (mimetype === "text/plain") {
    return await fs.readFile(filePath, "utf-8");
  }

  throw new Error(
    "Unsupported file type. Only PDF, DOCX, and TXT are allowed.",
  );
}
