'use server';

/**
 * @fileOverview An AI agent that performs an in-depth, iterative analysis to find optimal parameters.
 *
 * - runAiDeepDiveAnalysis - The main function to start the deep dive.
 */

import {ai} from '@/ai/genkit';
import { AiDeepDiveAnalysisInputSchema, AiDeepDiveAnalysisOutputSchema, type AiDeepDiveAnalysisInput, type AiDeepDiveAnalysisOutput } from '@/lib/types';


export async function runAiDeepDiveAnalysis(
  input: AiDeepDiveAnalysisInput
): Promise<AiDeepDiveAnalysisOutput> {
  return aiDeepDiveAnalysisFlow(input);
}


const prompt = ai.definePrompt({
    name: 'aiDeepDiveAnalysisPrompt',
    input: {schema: AiDeepDiveAnalysisInputSchema},
    output: {schema: AiDeepDiveAnalysisOutputSchema},
    prompt: `You are a world-class electrical engineer AI, specializing in power electronics and thermal simulation. You will be given the results of a simulation and asked to perform a "deep dive" analysis to find the absolute optimal parameters.

    **Your Goal:** Find the best combination of cooling and operating frequency to maximize the "Max Safe Current" of the component, without exceeding its thermal or power limits.

    **Available Tools & Data:**
    - Initial Simulation Results: {{{simulationResults}}}
    - Component Name: {{{componentName}}}
    - Initial Specs: {{{initialSpecs}}}
    - Available Cooling Methods (JSON): {{{allCoolingMethods}}}

    **Your Thought Process (Simulated):**
    1.  **Analyze the Failure:** First, understand why the initial simulation failed or where the bottleneck is. Was it thermal throttling? Power dissipation? Cooling budget?
    2.  **Iterate on Cooling:** Examine the list of available coolers. If the failure was thermal, select a more powerful cooler. If the simulation was successful but you think you can push it further, select a better cooler. Consider the trade-off between thermal resistance and cooling budget.
    3.  **Iterate on Frequency:** Lowering the switching frequency reduces switching losses, which generates less heat. This might allow for a higher current. Find the sweet spot.
    4.  **Synthesize and Recommend:** Based on your iterative analysis, determine the *single best* combination of a cooling solution and switching frequency.

    **Output:**
    Provide your final recommendation in the specified JSON format. Your reasoning should be clear and explain the trade-offs you considered.
    `,
});


const aiDeepDiveAnalysisFlow = ai.defineFlow(
  {
    name: 'aiDeepDiveAnalysisFlow',
    inputSchema: AiDeepDiveAnalysisInputSchema,
    outputSchema: AiDeepDiveAnalysisOutputSchema,
  },
  async input => {
    // In the future, this flow will become stateful and iterative.
    // For now, it performs a single, powerful analysis to find a better configuration.
    const {output} = await prompt(input);
    return output!;
  }
);
