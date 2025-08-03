'use server';
/**
 * @fileOverview An AI agent that finds a transistor datasheet from the web,
 * and can either provide the found document's info for parsing or give a best-effort estimation.
 *
 * - findDatasheet - The main function to find datasheet info.
 * - FindDatasheetInput - The input type for the function.
 * - FindDatasheetOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FindDatasheetOutputSchema = z.object({
  foundDatasheetName: z.string().optional().describe("The simulated filename of a likely datasheet PDF if one is found (e.g., 'IRFZ44N-datasheet.pdf')."),
  bestEffort: z.object({
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
  }).describe("The AI's best-effort estimation of the component's parameters. This should always be filled out."),
});

export type FindDatasheetOutput = z.infer<typeof FindDatasheetOutputSchema>;

const FindDatasheetInputSchema = z.object({
  componentName: z.string().describe('The name of the transistor component to search for.'),
});
export type FindDatasheetInput = z.infer<typeof FindDatasheetInputSchema>;

export async function findDatasheet(input: FindDatasheetInput): Promise<FindDatasheetOutput> {
  return findDatasheetFlow(input);
}

const prompt = ai.definePrompt({
  name: 'findDatasheetPrompt',
  input: {schema: FindDatasheetInputSchema},
  output: {schema: FindDatasheetOutputSchema},
  prompt: `You are an expert electrical engineer AI. Your task is to act as if you are searching the web for the datasheet of a specific transistor.

  Component Name: {{{componentName}}}

  1.  **Simulate a web search**: Based on the component name, imagine you are looking through datasheets from major manufacturers (like Infineon, STMicroelectronics, onsemi, etc.).
  2.  **Identify Datasheet**: If you find a highly probable datasheet PDF, set the 'foundDatasheetName' to a realistic filename for it (e.g., "STP60NF06-datasheet.pdf").
  3.  **Best-Effort Estimation (Always)**: Whether you find a specific datasheet or not, you MUST ALWAYS use your extensive knowledge to provide a best-effort estimation for a typical transistor with that name or a similar one. Fill out all the fields in the 'bestEffort' object. This is your primary task.
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

  4.  **Output Format**: Provide the result strictly in the JSON format defined by the output schema. Do not include any other text or explanation outside of the JSON structure. If you don't find a datasheet, 'foundDatasheetName' should be omitted, but 'bestEffort' must be complete.
  
  Make sure to output a valid JSON according to the schema. The Zod schema descriptions are:
  ${JSON.stringify(FindDatasheetOutputSchema.describe())}`,
});


const findDatasheetFlow = ai.defineFlow(
  {
    name: 'findDatasheetFlow',
    inputSchema: FindDatasheetInputSchema,
    outputSchema: FindDatasheetOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
