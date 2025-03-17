import { GoogleGenerativeAI } from "@google/generative-ai";

// Init Gemini with API Key from .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

/**
 * Generates a description based on the provided prompt.
 * @param prompt User prompt (e.g., "Write a description about...").
 * @returns The AI-generated description.
 */
export const generateGeminiDescription = async (prompt: string): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent(prompt);
    const response = await result.response;

    const text = response.text();
    return text;
  } catch (error) {
    console.error("Gemini AI generation error:", error);
    throw new Error("Failed to generate description");
  }
};