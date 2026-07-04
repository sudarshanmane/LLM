import OpenAI from "openai";

const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/+$/, "");
const baseURL = endpoint?.endsWith("/openai/v1")
  ? endpoint
  : `${endpoint}/openai/v1`;

export const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL,
});
