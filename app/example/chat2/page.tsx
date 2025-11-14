"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { processWithAI, analyzeData } from "./actions";

export default function OpenRouterExamplePage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await processWithAI(input);
      if (response.success) {
        setResult(response.data || "");
      } else {
        setResult(`Error: ${response.error}`);
      }
    } catch (error) {
      setResult(`Error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const analysis = await analyzeData(input);
      setResult(JSON.stringify(analysis, null, 2));
    } catch (error) {
      setResult(`Error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">OpenRouter2 Example</h1>

      <div className="space-y-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter your prompt..."
          className="w-full"
        />

        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={isLoading || !input}>
            {isLoading ? "Processing..." : "Process with AI"}
          </Button>
          <Button
            onClick={handleAnalyze}
            disabled={isLoading || !input}
            variant="secondary"
          >
            {isLoading ? "Analyzing..." : "Analyze Data"}
          </Button>
        </div>

        {result && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
            <h2 className="font-semibold mb-2">Result:</h2>
            <pre className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
