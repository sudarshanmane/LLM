export function parseLLMJson(text) {
  try {
    if (!text || typeof text !== "string") {
      throw new Error("Empty LLM response");
    }

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const jsonStart = cleaned.indexOf("{");
      const jsonEnd = cleaned.lastIndexOf("}");

      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        throw new Error("No JSON object found");
      }

      return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    }
  } catch (error) {
    console.error("Invalid LLM JSON:", text);

    throw new Error("LLM returned invalid JSON");
  }
}
