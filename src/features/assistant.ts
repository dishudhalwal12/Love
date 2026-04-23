"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

export async function processAssistantIntent(text: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    Analyze the following user voice input for an operations dashboard called "LOVE.".
    The user wants to either add a new lead or record a payment for an order.
    
    Input: "${text}"
    
    Extract the intent and data in JSON format.
    
    Rules:
    1. If it's a payment, provide:
    { 
      "type": "payment", 
      "amount": number, 
      "orderId": string,
      "summary": "Record a payment of ₹[amount] for order #[orderId]" 
    }
    
    2. If it's a lead, provide:
    { 
      "type": "lead", 
      "name": string, 
      "college": string, 
      "phone": string, 
      "budget": number,
      "summary": "Add a new lead: [name] from [college]" 
    }
    
    3. If the intent is unclear or missing fields, try to infer them or mark as "unknown".
    
    4. If it's none of the above, return: { "type": "unknown", "summary": "I couldn't identify the action from: ${text}" }
    
    Be extremely accurate. Return ONLY the JSON object.
  `;

  try {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      throw new Error("Gemini API Key is missing in environment variables.");
    }
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonStr = response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return { 
      type: "error", 
      summary: `Gemini Error: ${error.message || "Failed to process voice input."}` 
    };
  }
}
