'use server';
/**
 * @fileOverview Provides AI-calculated expected results for a given transistor's specifications.
 *
 * - aiCalculateExpectedResults - A function that returns the AI-calculated results.
 * - AiCalculatedExpectedResultsInput - The input type for the aiCalculateExpectedResults function.
 * - AiCalculatedExpectedResultsOutput - The return type for the aiCalculateExpectedResults function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiCalculatedExpectedResultsInputSchema = z.object({
  componentName: z.string().describe('The name of the transistor component.'),
  datasheet: z.string().describe('The datasheet content of the transistor.'),
});
export type AiCalculatedExpectedResultsInput = z.infer<typeof AiCalculatedExpectedResultsInputSchema>;

const AiCalculatedExpectedResultsOutputSchema = z.object({
  expectedMaxCurrent: z.number().describe('The AI-calculated expected maximum current for the transistor in Amps.'),
  expectedMaxVoltage: z.number().describe('The AI-calculated expected maximum voltage for the transistor in Volts.'),
  expectedMaxTemperature: z.number().describe('The AI-calculated expected maximum temperature for the transistor in Celsius.'),
  reasoning: z.string().describe('The AI reasoning behind the calculated results.'),
});
export type AiCalculatedExpectedResultsOutput = z.infer<typeof AiCalculatedExpectedResultsOutputSchema>;

export async function aiCalculateExpectedResults(input: AiCalculatedExpectedResultsInput): Promise<AiCalculatedExpectedResultsOutput> {
  return aiCalculateExpectedResultsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiCalculateExpectedResultsPrompt',
  input: {schema: AiCalculatedExpectedResultsInputSchema},
  output: {schema: AiCalculatedExpectedResultsOutputSchema},
  prompt: `You are an expert AI assistant for electrical engineers. You will calculate the expected maximum current, voltage and temperature of a transistor based on its datasheet.

  Component Name: {{componentName}}
  Datasheet: {{datasheet}}

  Provide your best estimate for the following:
  - expectedMaxCurrent: The expected maximum current for the transistor in Amps.
  - expectedMaxVoltage: The expected maximum voltage for the transistor in Volts.
  - expectedMaxTemperature: The expected maximum temperature for the transistor in Celsius.
  - reasoning: Your reasoning behind the calculated results. Explain what parameters in the datasheet were most important.
  Be conservative when estimating, err on the side of caution.
  Make sure to output a valid JSON according to the schema.  The Zod schema descriptions are:
  ${JSON.stringify(AiCalculatedExpectedResultsOutputSchema.describe())}`,
});

const aiCalculateExpectedResultsFlow = ai.defineFlow(
  {
    name: 'aiCalculateExpectedResultsFlow',
    inputSchema: AiCalculatedExpectedResultsInputSchema,
    outputSchema: AiCalculatedExpectedResultsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
