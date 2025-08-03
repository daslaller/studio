export interface ManualSpecs {
  transistorType: string;
  maxCurrent: string;
  maxVoltage: string;
  powerDissipation: string;
  rdsOn: string;
  vceSat: string;
  riseTime: string;
  fallTime: string;
  rthJC: string; // Thermal resistance from junction to case
}

export interface ExtractTransistorSpecsOutput extends ManualSpecs {
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
  failureReason: 'Thermal' | 'Voltage' | 'Current' | 'Power Loss' | null;
  details: string;
  finalTemperature: number;
  powerDissipation: {
    total: number;
    conduction: number;
    switching: number;
  };
}

export type CoolingMethod = {
  name: string;
  value: string;
  thermalResistance: number;
  coolingBudget: number;
};

export type PredefinedTransistor = {
  name: string;
  value: string;
  specs: ManualSpecs;
};
