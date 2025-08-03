'use server';
/**
 * @fileOverview AI-powered PDF reader tool to extract transistor specifications from datasheets.
 *
 * - extractTransistorSpecs - Extracts transistor specifications from a datasheet.
 * - ExtractTransistorSpecsInput - The input type for the extractTransistorSpecs function.
 * - ExtractTransistorSpecsOutput - The return type for the extractTransistorSpecs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractTransistorSpecsInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A transistor datasheet in PDF format, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  componentName: z.string().describe('The name of the transistor component.'),
});
export type ExtractTransistorSpecsInput = z.infer<typeof ExtractTransistorSpecsInputSchema>;

const ExtractTransistorSpecsOutputSchema = z.object({
  maxCurrent: z.string().describe('The maximum current the transistor can handle.'),
  maxVoltage: z.string().describe('The maximum voltage the transistor can handle.'),
  powerDissipation: z.string().describe('The maximum power dissipation of the transistor.'),
});
export type ExtractTransistorSpecsOutput = z.infer<typeof ExtractTransistorSpecsOutputSchema>;

export async function extractTransistorSpecs(input: ExtractTransistorSpecsInput): Promise<ExtractTransistorSpecsOutput> {
  return extractTransistorSpecsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTransistorSpecsPrompt',
  input: {schema: ExtractTransistorSpecsInputSchema},
  output: {schema: ExtractTransistorSpecsOutputSchema},
  prompt: `You are an AI expert in reading transistor datasheets. Given the datasheet and component name, extract the maximum current, maximum voltage, and power dissipation.

Component Name: {{{componentName}}}
Datasheet: {{media url=pdfDataUri}}

Ensure that the output matches the described format. If a value cannot be determined, return "N/A".`,
});

const extractTransistorSpecsFlow = ai.defineFlow(
  {
    name: 'extractTransistorSpecsFlow',
    inputSchema: ExtractTransistorSpecsInputSchema,
    outputSchema: ExtractTransistorSpecsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
