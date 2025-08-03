"use client";

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from "@/hooks/use-toast";
import SimulationForm from '@/components/app/simulation-form';
import ResultsDisplay from '@/components/app/results-display';
import { extractTransistorSpecsAction, getAiCalculationsAction, getAiSuggestionsAction } from '@/app/actions';
import type { SimulationResult, ExtractTransistorSpecsOutput, AiCalculatedExpectedResultsOutput, AiOptimizationSuggestionsOutput, CoolingMethod, ManualSpecs } from '@/lib/types';
import { coolingMethods, predefinedTransistors, transistorTypes } from '@/lib/constants';

const isMosfetType = (type: string) => {
    return type.includes('MOSFET') || type.includes('GaN');
};

const formSchema = z.object({
  predefinedComponent: z.string().optional(),
  componentName: z.string().optional(),
  inputMode: z.enum(['datasheet', 'manual']).default('datasheet'),
  datasheet: z.instanceof(File).optional(),
  
  // Core Specs
  transistorType: z.string().min(1, 'Transistor type is required.'),
  maxCurrent: z.coerce.number().positive(),
  maxVoltage: z.coerce.number().positive(),
  powerDissipation: z.coerce.number().positive(),
  rdsOn: z.coerce.number().optional(), // mOhms
  vceSat: z.coerce.number().optional(), // V
  riseTime: z.coerce.number().positive(), // ns
  fallTime: z.coerce.number().positive(), // ns
  rthJC: z.coerce.number().positive("Junction-to-Case Thermal Resistance is required."), // °C/W

  // Simulation Constraints
  switchingFrequency: z.coerce.number().positive(), // kHz
  maxTemperature: z.coerce.number().positive(),
  coolingMethod: z.string().min(1, 'Please select a cooling method'),
  ambientTemperature: z.coerce.number().default(25),
  
  // First-To-Fail: Heating Limit
  enablePowerLimit: z.boolean().default(false),
  maxPowerLoss: z.coerce.number().optional(),

}).superRefine((data, ctx) => {
    if (data.inputMode === 'datasheet' && (!data.datasheet || data.datasheet.size === 0) && !data.predefinedComponent) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['datasheet'],
            message: 'A Datasheet PDF is required when a predefined component is not selected.',
        });
    }
    if (isMosfetType(data.transistorType) && (!data.rdsOn || data.rdsOn <= 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rdsOn'], message: 'Rds(on) is required for this transistor type and must be positive.' });
    }
    if (!isMosfetType(data.transistorType) && (!data.vceSat || data.vceSat <= 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vceSat'], message: 'Vce(sat) is required for this transistor type and must be positive.' });
    }
    if (data.enablePowerLimit && (!data.maxPowerLoss || data.maxPowerLoss <= 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['maxPowerLoss'], message: 'Max Power Loss must be a positive number when enabled.' });
    }
    if (!data.componentName && !data.predefinedComponent) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['componentName'], message: 'Device name is required if not selecting a predefined one.' });
    }
});


type FormValues = z.infer<typeof formSchema>;

export default function AmpereAnalyzer() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [datasheetSpecs, setDatasheetSpecs] = useState<ExtractTransistorSpecsOutput | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [aiCalculatedResults, setAiCalculatedResults] = useState<AiCalculatedExpectedResultsOutput | null>(null);
  const [aiOptimizationSuggestions, setAiOptimizationSuggestions] = useState<AiOptimizationSuggestionsOutput | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inputMode: 'manual',
      maxTemperature: 150,
      coolingMethod: 'air-tower',
      switchingFrequency: 100, // 100 kHz default
      ambientTemperature: 25,
      enablePowerLimit: false,
      transistorType: 'MOSFET (N-Channel)'
    },
  });

  const handleTransistorSelect = (value: string) => {
    const transistor = predefinedTransistors.find(t => t.value === value);
    if (transistor) {
      form.reset({
        ...form.getValues(), // keep simulation constraints
        predefinedComponent: value,
        componentName: transistor.name,
        inputMode: 'manual',
        transistorType: transistor.specs.transistorType,
        maxCurrent: parseFloat(transistor.specs.maxCurrent),
        maxVoltage: parseFloat(transistor.specs.maxVoltage),
        powerDissipation: parseFloat(transistor.specs.powerDissipation),
        rdsOn: parseFloat(transistor.specs.rdsOn) || undefined,
        vceSat: parseFloat(transistor.specs.vceSat) || undefined,
        riseTime: parseFloat(transistor.specs.riseTime),
        fallTime: parseFloat(transistor.specs.fallTime),
        rthJC: parseFloat(transistor.specs.rthJC),
      });
    }
  };

  const runSimulation = (values: FormValues): SimulationResult => {
      const {
        maxCurrent, maxVoltage, rthJC, riseTime, fallTime,
        switchingFrequency, maxTemperature, ambientTemperature, coolingMethod,
        transistorType, rdsOn, vceSat, enablePowerLimit, maxPowerLoss
      } = values;

      const selectedCooling = coolingMethods.find(c => c.value === coolingMethod) as CoolingMethod;
      const totalRth = rthJC + selectedCooling.thermalResistance;

      // Convert units for calculation
      const rdsOnOhms = (rdsOn || 0) / 1000; // mOhms to Ohms
      const fSwHz = switchingFrequency * 1000; // kHz to Hz
      const tSwitchingSec = ((riseTime || 0) + (fallTime || 0)) * 1e-9; // ns to s

      let maxSafeCurrent = 0;
      let failureReason: SimulationResult['failureReason'] = null;
      let details = '';
      let finalTemperature = ambientTemperature;
      let powerDissipation = { total: 0, conduction: 0, switching: 0 };
      
      const step = Math.max(0.01, maxCurrent / 2000); // Dynamic step size

      for (let current = step; current <= maxCurrent + step; current += step) {
          // 1. Calculate Power Losses
          let conductionLoss = 0;
          if (isMosfetType(transistorType)) {
              conductionLoss = Math.pow(current, 2) * rdsOnOhms * 0.5; // Assume 50% duty cycle
          } else { // BJT/IGBT
              conductionLoss = current * (vceSat || 0) * 0.5;
          }
          const switchingLoss = 0.5 * maxVoltage * current * tSwitchingSec * fSwHz;
          const totalLoss = conductionLoss + switchingLoss;

          powerDissipation = { total: totalLoss, conduction: conductionLoss, switching: switchingLoss };

          // 2. Calculate Temperature
          const tempRise = totalLoss * totalRth;
          finalTemperature = ambientTemperature + tempRise;

          // 3. Check for Failure Conditions (First-To-Fail)
          if (enablePowerLimit && maxPowerLoss && totalLoss > maxPowerLoss) {
              failureReason = 'Power Loss';
              details = `Exceeded max power loss limit of ${maxPowerLoss}W. Reached ${totalLoss.toFixed(2)}W.`;
              maxSafeCurrent = current - step;
              break;
          }
          if (current > maxCurrent) {
              failureReason = 'Current';
              details = `Exceeded component's max current rating of ${maxCurrent.toFixed(2)}A.`;
              maxSafeCurrent = current - step;
              break;
          }
          if (finalTemperature > maxTemperature) {
              failureReason = 'Thermal';
              details = `Exceeded max junction temperature of ${maxTemperature}°C. Reached ${finalTemperature.toFixed(2)}°C.`;
              maxSafeCurrent = current - step; 
              break;
          }
          
          maxSafeCurrent = current;
      }
      
      if (failureReason) {
          return { status: 'failure', maxSafeCurrent, failureReason, details, finalTemperature, powerDissipation };
      } else {
          return { status: 'success', maxSafeCurrent: maxCurrent, failureReason: null, details: `Device operates safely up to its max rating of ${maxCurrent.toFixed(2)}A within all limits.`, finalTemperature, powerDissipation };
      }
  };


  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      setDatasheetSpecs(null);
      setSimulationResult(null);
      setAiCalculatedResults(null);
      setAiOptimizationSuggestions(null);

      let specsForAi: Partial<ManualSpecs> = {};
      const componentName = values.predefinedComponent 
        ? predefinedTransistors.find(t => t.value === values.predefinedComponent)?.name || 'N/A'
        : values.componentName || 'N/A';

      if (values.inputMode === 'datasheet' && values.datasheet) {
        // Datasheet logic can be expanded here in the future
        toast({ variant: 'destructive', title: 'Error', description: 'Datasheet parsing is not yet fully implemented in this version.' });
        return;
      }

      specsForAi = {
          maxCurrent: String(values.maxCurrent),
          maxVoltage: String(values.maxVoltage),
          powerDissipation: String(values.powerDissipation),
          rdsOn: String(values.rdsOn),
          riseTime: String(values.riseTime),
          fallTime: String(values.fallTime),
      };
      
      const datasheetContentForAi = Object.entries(specsForAi)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');

      const simResult = runSimulation(values);
      setSimulationResult(simResult);

      const simulationSummary = `Result: ${simResult.status}. Failure Reason: ${simResult.failureReason || 'None'}. Details: ${simResult.details}`;
      const selectedCooling = coolingMethods.find(c => c.value === values.coolingMethod);
      const coolingBudget = selectedCooling?.coolingBudget || 0;

      const [aiCalculations, aiSuggestions] = await Promise.all([
        getAiCalculationsAction(componentName, datasheetContentForAi),
        getAiSuggestionsAction(
          componentName,
          selectedCooling?.name || "N/A",
          values.maxTemperature,
          coolingBudget,
          simulationSummary
        ),
      ]);
      
      if (aiCalculations.data) setAiCalculatedResults(aiCalculations.data);
      if (aiCalculations.error) toast({ variant: 'destructive', title: 'AI Calculation Error', description: aiCalculations.error });

      if (aiSuggestions.data) setAiOptimizationSuggestions(aiSuggestions.data);
      if (aiSuggestions.error) toast({ variant: 'destructive', title: 'AI Suggestion Error', description: aiSuggestions.error });
    });
  };

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-purple-400">Ampere Analyzer</h1>
        <p className="mt-4 text-lg text-purple-200/80 max-w-2xl mx-auto">
          Advanced power transistor analysis with multi-variable thermal simulation.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        <div className="md:col-span-2">
            <SimulationForm form={form} onSubmit={onSubmit} isPending={isPending} onTransistorSelect={handleTransistorSelect} />
        </div>
        <div className="md:col-span-3">
            <ResultsDisplay
                isLoading={isPending}
                simulationResult={simulationResult}
                aiCalculatedResults={aiCalculatedResults}
                aiOptimizationSuggestions={aiOptimizationSuggestions}
            />
        </div>
      </div>
    </div>
  );
}
