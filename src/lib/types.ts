export interface ExtractTransistorSpecsOutput {
  maxCurrent: string;
  maxVoltage: string;
  powerDissipation: string;
}

export interface AiCalculatedExpectedResultsOutput {
  expectedMaxCurrent: number;
  expectedMaxVoltage: number;
  expectedMaxTemperature: number;
  reasoning: string;
}

export interface AiOptimizationSuggestionsOutput {
  suggestions: string[];
  reasoning: string;
}

export interface SimulationResult {
  status: 'success' | 'failure';
  maxSafeCurrent: number;
  failureReason: 'Thermal' | 'Voltage' | 'Current' | null;
  details: string;
  finalTemperature: number;
  powerDissipation: number;
}

export type CoolingMethod = {
  name: string;
  value: string;
  thermalResistance: number;
  coolingBudget: number;
};
