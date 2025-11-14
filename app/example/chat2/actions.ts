"use server";

import { systemPrompt, userPrompt } from "@/utils/atropic/chat-parser/prompts";
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
        content: systemPrompt({
          event_id: "234",
          dateFrom: "2025-11-17T00:00:00.000Z",
          dateTo: "2025-11-18T23:59:59.999Z",
          minDurationInMinutes: 30,
        }),
      },
      {
        role: "user",
        content: userPrompt({
          chatMessages: [
            {
              userId: "456",
              timestamp: "1763161091",
              content: "Mogę w poniedziałek od 9 do 12 i od 15 do 19",
            },
            {
              userId: "789",
              timestamp: Date.now().toString(),
              content: input,
            },
          ],
          event_id: "234",
          dateFrom: "2025-11-17T00:00:00.000Z",
          dateTo: "2025-11-18T23:59:59.999Z",
          minDurationInMinutes: 30,
        }),
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
