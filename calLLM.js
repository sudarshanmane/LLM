import { openai } from "./openaiclient.js";

export async function callLLM(prompt) {
  const response = await openai.chat.completions.create({
    model:
      process.env.AZURE_OPENAI_MODEL_NAME ||
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    messages: [
      {
        role: "system",
        content:
          "You are a strict JSON generator. Always return only valid JSON. Never return markdown.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 8000,
  });

  const choice = response.choices?.[0];
  const content = choice?.message?.content;
  const text = Array.isArray(content)
    ? content
        .map((part) => (typeof part === "string" ? part : part.text || ""))
        .join("")
    : content;

  if (!text || !text.trim()) {
    throw new Error(
      `LLM returned empty content. finish_reason=${choice?.finish_reason || "unknown"} usage=${JSON.stringify(response.usage || {})}`,
    );
  }

  return text;
}
