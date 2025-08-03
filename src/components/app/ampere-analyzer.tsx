"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from "@/hooks/use-toast";
import SimulationForm from '@/components/app/simulation-form';
import ResultsDisplay from '@/components/app/results-display';
import { extractTransistorSpecsAction, getAiCalculationsAction, getAiSuggestionsAction } from '@/app/actions';
import type { SimulationResult, ExtractTransistorSpecsOutput, AiCalculatedExpectedResultsOutput, AiOptimizationSuggestionsOutput, CoolingMethod, ManualSpecs } from '@/lib/types';
import { coolingMethods, predefinedTransistors } from '@/lib/constants';

const formSchema = z.object({
  predefinedComponent: z.string().optional(),
  componentName: z.string().optional(),
  inputMode: z.enum(['datasheet', 'manual']).default('datasheet'),
  datasheet: z.instanceof(File).optional(),
  maxCurrent: z.coerce.number().optional(),
  maxVoltage: z.coerce.number().optional(),
  powerDissipation: z.coerce.number().optional(),
  rdsOn: z.coerce.number().optional(),
  riseTime: z.coerce.number().optional(),
  fallTime: z.coerce.number().optional(),
  switchingFrequency: z.coerce.number().min(0, 'Frequency must be positive'),
  maxTemperature: z.coerce.number().min(0, 'Max temperature must be positive'),
  coolingMethod: z.string().min(1, 'Please select a cooling method'),
}).superRefine((data, ctx) => {
    if (data.inputMode === 'datasheet' && (!data.datasheet || data.datasheet.size === 0) && !data.predefinedComponent) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['datasheet'],
            message: 'Datasheet PDF is required if no predefined component is selected.',
        });
    }
    if (data.inputMode === 'manual') {
        const requiredFields: (keyof typeof data)[] = ['maxCurrent', 'maxVoltage', 'powerDissipation', 'rdsOn', 'riseTime', 'fallTime'];
        requiredFields.forEach(field => {
            if (!data[field] || (data[field] as number) <= 0) {
                 ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'This field must be a positive number.' });
            }
        });
    }
    if (!data.componentName && !data.predefinedComponent) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['componentName'], message: 'Device name is required if not selecting a predefined component.' });
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
      inputMode: 'datasheet',
      maxTemperature: 150,
      coolingMethod: 'active-air',
      switchingFrequency: 100, // 100 kHz default
    },
  });

  const selectedCoolingMethodValue = form.watch('coolingMethod');

  const handleTransistorSelect = (value: string) => {
    const transistor = predefinedTransistors.find(t => t.value === value);
    if (transistor) {
      form.setValue('componentName', transistor.name);
      form.setValue('maxCurrent', parseFloat(transistor.specs.maxCurrent));
      form.setValue('maxVoltage', parseFloat(transistor.specs.maxVoltage));
      form.setValue('powerDissipation', parseFloat(transistor.specs.powerDissipation));
      form.setValue('rdsOn', parseFloat(transistor.specs.rdsOn));
      form.setValue('riseTime', parseFloat(transistor.specs.riseTime));
      form.setValue('fallTime', parseFloat(transistor.specs.fallTime));
      form.setValue('inputMode', 'manual');
    }
  };

  const runSimulation = (
    specs: ManualSpecs,
    constraints: FormValues
  ): SimulationResult => {
    const maxCurrent = parseFloat(specs.maxCurrent) || 0;
    const maxVoltage = parseFloat(specs.maxVoltage) || 0;
    const rdsOn = parseFloat(specs.rdsOn) || 0;
    const riseTime = (parseFloat(specs.riseTime) || 0) * 1e-9; // ns to s
    const fallTime = (parseFloat(specs.fallTime) || 0) * 1e-9; // ns to s
    const switchingFrequency = (constraints.switchingFrequency || 0) * 1e3; // kHz to Hz

    const selectedCooling = coolingMethods.find(c => c.value === constraints.coolingMethod) as CoolingMethod;
    const ambientTemp = 25; // Assume 25°C ambient

    let maxSafeCurrent = 0;
    let failureReason: SimulationResult['failureReason'] = null;
    let details = '';
    let finalTemperature = ambientTemp;
    let powerDissipation = { total: 0, conduction: 0, switching: 0 };
    
    //Iterate from 0.01A up to the max current
    for (let current = 0.01; current <= maxCurrent + 0.01; current += 0.01) {
      // 1. Calculate Power Losses
      const conductionLoss = rdsOn * Math.pow(current, 2);
      const switchingLoss = 0.5 * maxVoltage * current * (riseTime + fallTime) * switchingFrequency;
      const totalLoss = conductionLoss + switchingLoss;

      powerDissipation = { total: totalLoss, conduction: conductionLoss, switching: switchingLoss };

      // 2. Calculate Temperature
      const tempRise = totalLoss * selectedCooling.thermalResistance;
      finalTemperature = ambientTemp + tempRise;

      // 3. Check for Failure Conditions
      if (current > maxCurrent) {
        failureReason = 'Current';
        details = `Exceeded max current rating of ${maxCurrent.toFixed(2)}A.`;
        break;
      }
      if (finalTemperature > constraints.maxTemperature) {
        failureReason = 'Thermal';
        details = `Exceeded max temperature of ${constraints.maxTemperature}°C. Reached ${finalTemperature.toFixed(2)}°C.`;
        maxSafeCurrent = current - 0.01; // The last safe current
        break;
      }
      maxSafeCurrent = current;
    }
    
    if (failureReason) {
      return { status: 'failure', maxSafeCurrent, failureReason, details, finalTemperature, powerDissipation };
    } else {
        return { status: 'success', maxSafeCurrent, failureReason: null, details: `Device operates safely up to ${maxSafeCurrent.toFixed(2)}A within all limits.`, finalTemperature, powerDissipation };
    }
  };


  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      // Reset previous results
      setDatasheetSpecs(null);
      setSimulationResult(null);
      setAiCalculatedResults(null);
      setAiOptimizationSuggestions(null);

      let specsToSimulate: ManualSpecs | null = null;
      let datasheetContentForAi = '';
      const componentName = values.predefinedComponent 
        ? predefinedTransistors.find(t => t.value === values.predefinedComponent)?.name || 'N/A'
        : values.componentName || 'N/A';

      if (values.inputMode === 'datasheet' && values.datasheet) {
        const formData = new FormData();
        formData.append('componentName', componentName);
        formData.append('datasheet', values.datasheet);

        const specsResult = await extractTransistorSpecsAction(formData);
        if (specsResult.error || !specsResult.data) {
          toast({ variant: 'destructive', title: 'Error', description: specsResult.error });
          return;
        }
        
        specsToSimulate = specsResult.data;
        setDatasheetSpecs(specsResult.data);
        
        // Auto-populate manual fields
        form.setValue('maxCurrent', parseFloat(specsResult.data.maxCurrent) || undefined);
        form.setValue('maxVoltage', parseFloat(specsResult.data.maxVoltage) || undefined);
        form.setValue('powerDissipation', parseFloat(specsResult.data.powerDissipation) || undefined);
        form.setValue('rdsOn', parseFloat(specsResult.data.rdsOn) || undefined);
        form.setValue('riseTime', parseFloat(specsResult.data.riseTime) || undefined);
        form.setValue('fallTime', parseFloat(specsResult.data.fallTime) || undefined);

        datasheetContentForAi = `Max Current: ${specsResult.data.maxCurrent}, Max Voltage: ${specsResult.data.maxVoltage}, Power Dissipation: ${specsResult.data.powerDissipation}`;

      } else if (values.inputMode === 'manual') {
        specsToSimulate = {
            maxCurrent: String(values.maxCurrent),
            maxVoltage: String(values.maxVoltage),
            powerDissipation: String(values.powerDissipation),
            rdsOn: String(values.rdsOn),
            riseTime: String(values.riseTime),
            fallTime: String(values.fallTime),
        };
        datasheetContentForAi = `Max Current: ${values.maxCurrent}A, Max Voltage: ${values.maxVoltage}V, RDS(on): ${values.rdsOn} Ohms (manual input)`;
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Invalid input mode or missing data.' });
        return;
      }
      
      const simResult = runSimulation(specsToSimulate, values);
      setSimulationResult(simResult);

      const simulationSummary = `Result: ${simResult.status}. Failure Reason: ${simResult.failureReason || 'None'}. Details: ${simResult.details}`;

      const coolingBudget = coolingMethods.find(c => c.value === values.coolingMethod)?.coolingBudget || 0;

      // Fire off AI calls in parallel
      const [aiCalculations, aiSuggestions] = await Promise.all([
        getAiCalculationsAction(componentName, datasheetContentForAi),
        getAiSuggestionsAction(
          componentName,
          values.coolingMethod,
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
          AI-powered transistor analysis and thermal simulation for power electronics.
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
