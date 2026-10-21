import Groq from "groq-sdk";

/** Restored from a truncated path in the uploaded archive. */
export const openai = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
