"use server";

import { z } from "zod";
import { extractTransistorSpecs } from "@/ai/flows/ai-datasheet-reader";
import { aiCalculateExpectedResults } from "@/ai/flows/ai-calculate-expected-results";
import { getAiOptimizationSuggestions } from "@/ai/flows/ai-optimization-advisor";
import { findAndParseDatasheet } from "@/ai/flows/ai-datasheet-finder";
import { runAiDeepDiveAnalysis } from "@/ai/flows/ai-deep-dive-analysis";
import type { AiDeepDiveAnalysisInput } from "@/lib/types";


const datasheetSchema = z.object({
  componentName: z.string().min(1, "Component name is required."),
  datasheet: z.instanceof(File).optional(),
});

export async function findOrExtractTransistorSpecsAction(formData: FormData) {
  try {
    const validated = datasheetSchema.safeParse({
      componentName: formData.get('componentName'),
      datasheet: formData.get('datasheet'),
    });

    if (!validated.success) {
      return { error: "Invalid input.", details: validated.error.format() };
    }
    
    const { componentName, datasheet } = validated.data;

    // If a datasheet is provided, use the existing extraction flow
    if (datasheet && datasheet.size > 0) {
      const buffer = await datasheet.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const pdfDataUri = `data:${datasheet.type};base64,${base64}`;
      const specs = await extractTransistorSpecs({ pdfDataUri, componentName });
      return { data: specs, source: 'pdf' };
    }

    // If no datasheet, use the new finder flow
    const specs = await findAndParseDatasheet({ componentName });
    return { data: specs, source: 'web' };

  } catch (e) {
    console.error(e);
    return { error: "Failed to find or extract specs from datasheet." };
  }
}

export async function getAiCalculationsAction(componentName: string, datasheet: string) {
   try {
    const results = await aiCalculateExpectedResults({ componentName, datasheet });
    return { data: results };
  } catch (e) {
    console.error(e);
    return { error: "Failed to get AI calculations." };
  }
}

export async function getAiSuggestionsAction(
  componentName: string,
  coolingMethod: string,
  maxTemperature: number,
  coolingBudget: number,
  simulationResults: string
) {
  try {
    const suggestions = await getAiOptimizationSuggestions({
      componentName,
      coolingMethod,
      maxTemperature,
      coolingBudget,
      simulationResults,
    });
    return { data: suggestions };
  } catch (e) {
    console.error(e);
    return { error: "Failed to get AI optimization suggestions." };
  }
}

export async function runAiDeepDiveAction(input: AiDeepDiveAnalysisInput) {
    try {
        const results = await runAiDeepDiveAnalysis(input);
        return { data: results };
    } catch (e) {
        console.error(e);
        return { error: "Failed to run AI Deep Dive analysis." };
    }
}
