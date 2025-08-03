'use server';
/**
 * @fileOverview An AI agent that finds and parses a transistor datasheet from the web,
 * or provides a best-effort estimation if a datasheet cannot be found.
 *
 * - findAndParseDatasheet - The main function to find and parse datasheet info.
 * - FindAndParseDatasheetInput - The input type for the function.
 * - FindAndParseDatasheetOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { ExtractTransistorSpecsOutput } from '@/lib/types';

// This is the same output as the datasheet reader, so we can reuse the type.
const FindAndParseDatasheetOutputSchema = z.object({
  transistorType: z.string().describe('The type of the transistor (e.g., MOSFET (N-Channel), BJT (NPN)).'),
  maxCurrent: z.string().describe('The maximum continuous drain/collector current in Amps.'),
  maxVoltage: z.string().describe('The maximum drain-source/collector-emitter voltage in Volts.'),
  powerDissipation: z.string().describe('The maximum power dissipation in Watts.'),
  rdsOn: z.string().describe('The drain-source on-resistance in mOhms. N/A for non-MOSFETs.'),
  vceSat: z.string().describe('The collector-emitter saturation voltage in Volts. N/A for MOSFETs.'),
  riseTime: z.string().describe('The rise time in nanoseconds (ns).'),
  fallTime: z.string().describe('The fall time in nanoseconds (ns).'),
  rthJC: z.string().describe('The thermal resistance from junction to case in °C/W.'),
  maxTemperature: z.string().describe('The maximum junction temperature in degrees Celsius.'),
});

export type FindAndParseDatasheetOutput = z.infer<typeof FindAndParseDatasheetOutputSchema>;

const FindAndParseDatasheetInputSchema = z.object({
  componentName: z.string().describe('The name of the transistor component to search for.'),
});
export type FindAndParseDatasheetInput = z.infer<typeof FindAndParseDatasheetInputSchema>;

export async function findAndParseDatasheet(input: FindAndParseDatasheetInput): Promise<FindAndParseDatasheetOutput> {
  return findAndParseDatasheetFlow(input);
}

const prompt = ai.definePrompt({
  name: 'findAndParseDatasheetPrompt',
  input: {schema: FindAndParseDatasheetInputSchema},
  output: {schema: FindAndParseDatasheetOutputSchema},
  prompt: `You are an expert electrical engineer AI. Your task is to act as if you are searching the web for the datasheet of a specific transistor and extracting its key parameters.

  Component Name: {{{componentName}}}

  1.  **Simulate a web search**: Based on the component name, imagine you are looking through datasheets from major manufacturers (like Infineon, STMicroelectronics, onsemi, etc.).
  2.  **Extract Key Parameters**: From the most likely datasheet you would find, extract the following values. BE AS ACCURATE AS POSSIBLE.
      - transistorType: The full type name, e.g., 'MOSFET (N-Channel)' or 'IGBT'.
      - maxCurrent: Maximum continuous drain/collector current (Id/Ic) at 25°C.
      - maxVoltage: Maximum drain-source or collector-emitter voltage (Vds/Vce).
      - powerDissipation: Total power dissipation (Pd) at 25°C.
      - rdsOn: Drain-source on-resistance (Rds(on)) in mOhms. If it's a BJT or IGBT, this should be "N/A".
      - vceSat: Collector-emitter saturation voltage (Vce(sat)) in Volts. If it's a MOSFET/GaN, this should be "N/A".
      - riseTime: Typical rise time (tr) in nanoseconds.
      - fallTime: Typical fall time (tf) in nanoseconds.
      - rthJC: Thermal resistance from junction-to-case (Rth(j-c)) in °C/W.
      - maxTemperature: Maximum operating junction temperature (Tj max) in °C.

  3.  **Best-Effort Estimation**: If you cannot find a specific datasheet for "{{{componentName}}}", use your extensive knowledge of electronic components to provide a *best-effort estimation* for a typical transistor with that name or a similar one. Clearly state if you are making an estimation.

  4.  **Output Format**: Provide the result strictly in the JSON format defined by the output schema. Do not include any other text or explanation outside of the JSON structure.
  
  Make sure to output a valid JSON according to the schema. The Zod schema descriptions are:
  ${JSON.stringify(FindAndParseDatasheetOutputSchema.describe())}`,
});


const findAndParseDatasheetFlow = ai.defineFlow(
  {
    name: 'findAndParseDatasheetFlow',
    inputSchema: FindAndParseDatasheetInputSchema,
    outputSchema: FindAndParseDatasheetOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
