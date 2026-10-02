import Groq from "groq-sdk";

export const openai = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

