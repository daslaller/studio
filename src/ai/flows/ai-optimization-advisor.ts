'use server';

/**
 * @fileOverview An AI agent that provides suggestions for optimizing simulation results.
 *
 * - getAiOptimizationSuggestions - A function that provides optimization suggestions.
 * - AiOptimizationSuggestionsInput - The input type for the getAiOptimizationSuggestions function.
 * - AiOptimizationSuggestionsOutput - The return type for the getAiOptimizationSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiOptimizationSuggestionsInputSchema = z.object({
  componentName: z.string().describe('The name of the component being simulated.'),
  coolingMethod: z.string().describe('The current cooling method being used.'),
  maxTemperature: z.number().describe('The maximum allowed temperature in degrees Celsius.'),
  coolingBudget: z.number().describe('The cooling budget available in Watts.'),
  simulationResults: z.string().describe('The results of the simulation, including any failure conditions.'),
});
export type AiOptimizationSuggestionsInput = z.infer<typeof AiOptimizationSuggestionsInputSchema>;

const AiOptimizationSuggestionsOutputSchema = z.object({
  suggestions: z.array(
    z.string().describe('A suggestion for improving the simulation results.')
  ).describe('A list of suggestions for optimizing the simulation.'),
  reasoning: z.string().describe('The reasoning behind the suggestions.'),
});
export type AiOptimizationSuggestionsOutput = z.infer<typeof AiOptimizationSuggestionsOutputSchema>;

export async function getAiOptimizationSuggestions(
  input: AiOptimizationSuggestionsInput
): Promise<AiOptimizationSuggestionsOutput> {
  return aiOptimizationSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiOptimizationSuggestionsPrompt',
  input: {schema: AiOptimizationSuggestionsInputSchema},
  output: {schema: AiOptimizationSuggestionsOutputSchema},
  prompt: `You are an AI simulation expert, skilled in providing optimization suggestions for electronic component simulations.

  Based on the following simulation details, provide a list of suggestions to improve the simulation results and prevent component failure. Also include the reasoning behind the suggestions.

  Component Name: {{{componentName}}}
  Cooling Method: {{{coolingMethod}}}
  Maximum Temperature: {{{maxTemperature}}} °C
  Cooling Budget: {{{coolingBudget}}} W
  Simulation Results: {{{simulationResults}}}

  Consider adjustments to the cooling method, frequency, voltage, or other relevant parameters.
  Format your response as a list of suggestions, followed by a detailed reasoning section.

  Example:
  Suggestions:
  - Reduce the frequency by 10% to lower heat generation.
  - Upgrade the cooling method to liquid cooling for better heat dissipation.

  Reasoning: Reducing the frequency will decrease power consumption and heat generation. Upgrading to liquid cooling will provide significantly better thermal performance, allowing the component to operate at higher power levels without exceeding the maximum temperature.
  `,
});

const aiOptimizationSuggestionsFlow = ai.defineFlow(
  {
    name: 'aiOptimizationSuggestionsFlow',
    inputSchema: AiOptimizationSuggestionsInputSchema,
    outputSchema: AiOptimizationSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
