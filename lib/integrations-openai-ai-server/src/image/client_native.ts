import Groq from "Groq-sdk";

export const openai = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function generateImageBuffer(prompt: string): Promise<Buffer> {
  // Skeleton implementation for Groq compatibility
  throw new Error("Function needs implementation for Groq");
}

