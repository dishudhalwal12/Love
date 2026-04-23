"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

export async function processAssistantIntent(text: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Analyze the following user voice input for an operations dashboard called "LOVE.".
    The user wants to either add a new lead or record a payment for an order.
    
    Input: "${text}"
    
    Extract the intent and data in JSON format.
    If it's a payment, extract: { "type": "payment", "amount": number, "orderId": string }
    If it's a lead, extract: { "type": "lead", "name": string, "college": string, "phone": string, "budget": number }
    If neither, return: { "type": "unknown" }
    
    Be extremely accurate. Return ONLY the JSON.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonStr = response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Error:", error);
    return { type: "error" };
  }
}
