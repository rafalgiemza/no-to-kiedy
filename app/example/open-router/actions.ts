"use server";

import { OpenRouterService } from "@/utils/open-router";

const openRouter = new OpenRouterService();

interface DataAnalysis {
  summary: string;
  insights: string[];
  recommendation: string;
}

/**
 * Example Server Action that uses OpenRouter to analyze data
 * Returns structured data analysis using JSON Schema
 */
export async function analyzeData(input: string): Promise<DataAnalysis> {
  const response = await openRouter.complete<DataAnalysis>({
    messages: [
      {
        role: "system",
        content:
          "Jesteś asystentem do analizy danych. Zwracasz strukturyzowaną odpowiedź.",
      },
      {
        role: "user",
        content: input,
      },
    ],
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "data_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            insights: {
              type: "array",
              items: { type: "string" },
            },
            recommendation: { type: "string" },
          },
          required: ["summary", "insights", "recommendation"],
          additionalProperties: false,
        },
      },
    },
  });

  // Typ response.choices[0].message.parsed jest automatycznie DataAnalysis
  return response.choices[0].message.parsed!;
}

/**
 * Example Server Action that uses OpenRouter without structured output
 * Returns raw text response
 */
export async function processWithAI(
  input: string
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const response = await openRouter.complete({
      messages: [
        { role: "system", content: "Jesteś pomocnym asystentem." },
        { role: "user", content: input },
      ],
    });
    return { success: true, data: response.choices[0].message.content };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
