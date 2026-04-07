import { GoogleGenAI, Type } from "@google/genai";

export async function parseSmartPayments(
  prompt: string,
  loanContext: { startDate: string; loanAmount: number; paymentsPerYear: number }
) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `User request: ${prompt}\n\nLoan Context: Start Date: ${loanContext.startDate}, Loan Amount: ${loanContext.loanAmount}, Payments Per Year: ${loanContext.paymentsPerYear}. Generate the exact dates and amounts for these extra payments.`,
    config: {
      systemInstruction: "You are a financial assistant. Convert natural language extra payment instructions into a structured list of dates and amounts. Return ONLY valid JSON matching the schema.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "Date of the payment in YYYY-MM-DD format" },
            amount: { type: Type.NUMBER, description: "Amount of the extra payment" }
          },
          required: ["date", "amount"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) return [];
  try {
    return JSON.parse(text) as { date: string; amount: number }[];
  } catch (e) {
    console.error("Failed to parse smart payments", e);
    return [];
  }
}

export async function searchInterestRates(prompt: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    tools: [
      { googleSearch: {} }
    ],
    config: {
      systemInstruction: "You are a helpful financial assistant. Answer the user's question about interest rates using Google Search. Provide a concise, helpful answer."
    }
  });
  return response.text;
}
