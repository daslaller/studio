"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from "@/hooks/use-toast";
import SimulationForm from '@/components/app/simulation-form';
import ResultsDisplay from '@/components/app/results-display';
import { extractTransistorSpecsAction, getAiCalculationsAction, getAiSuggestionsAction } from '@/app/actions';
import type { SimulationResult, ExtractTransistorSpecsOutput, AiCalculatedExpectedResultsOutput, AiOptimizationSuggestionsOutput, CoolingMethod } from '@/lib/types';
import { coolingMethods } from '@/lib/constants';

const formSchema = z.object({
  componentName: z.string().min(1, 'Component name is required'),
  inputMode: z.enum(['datasheet', 'manual']).default('datasheet'),
  datasheet: z.instanceof(File).optional(),
  maxCurrent: z.coerce.number().optional(),
  maxVoltage: z.coerce.number().optional(),
  powerDissipation: z.coerce.number().optional(),
  coolingBudget: z.coerce.number().min(0, 'Cooling budget must be positive'),
  maxTemperature: z.coerce.number().min(0, 'Max temperature must be positive'),
  coolingMethod: z.string().min(1, 'Please select a cooling method'),
}).superRefine((data, ctx) => {
    if (data.inputMode === 'datasheet' && (!data.datasheet || data.datasheet.size === 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['datasheet'],
            message: 'Datasheet PDF is required in Datasheet Mode.',
        });
    }
    if (data.inputMode === 'manual') {
        if (!data.maxCurrent || data.maxCurrent <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['maxCurrent'], message: 'Max current must be a positive number.' });
        }
        if (!data.maxVoltage || data.maxVoltage <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['maxVoltage'], message: 'Max voltage must be a positive number.' });
        }
        if (!data.powerDissipation || data.powerDissipation <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['powerDissipation'], message: 'Power dissipation must be a positive number.' });
        }
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
      componentName: '',
      inputMode: 'datasheet',
      coolingBudget: 100,
      maxTemperature: 125,
      coolingMethod: 'active-air',
    },
  });

  const selectedCoolingMethodValue = form.watch('coolingMethod');

  useEffect(() => {
    const selectedCooling = coolingMethods.find(c => c.value === selectedCoolingMethodValue);
    if (selectedCooling) {
      form.setValue('coolingBudget', selectedCooling.coolingBudget);
    }
  }, [selectedCoolingMethodValue, form]);


  const runSimulation = (
    specs: ExtractTransistorSpecsOutput,
    constraints: FormValues
  ): SimulationResult => {
    const maxCurrent = parseFloat(specs.maxCurrent) || 0;
    const maxVoltage = parseFloat(specs.maxVoltage) || 0;
    const selectedCooling = coolingMethods.find(c => c.value === constraints.coolingMethod) as CoolingMethod;
    const ambientTemp = 25; // Assume 25°C ambient

    let maxSafeCurrent = 0;
    let failureReason: SimulationResult['failureReason'] = null;
    let details = '';
    let finalTemperature = ambientTemp;
    let powerDissipation = 0;

    for (let current = 0.01; current <= maxCurrent + 0.01; current += 0.01) {
      powerDissipation = maxVoltage * current;
      const tempRise = powerDissipation * selectedCooling.thermalResistance;
      finalTemperature = ambientTemp + tempRise;

      if (current > maxCurrent) {
        failureReason = 'Current';
        details = `Exceeded max current rating of ${maxCurrent.toFixed(2)}A.`;
        break;
      }
      if (finalTemperature > constraints.maxTemperature) {
        failureReason = 'Thermal';
        details = `Exceeded max temperature of ${constraints.maxTemperature}°C. Reached ${finalTemperature.toFixed(2)}°C.`;
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

      let specsToSimulate: ExtractTransistorSpecsOutput | null = null;
      let datasheetContentForAi = '';

      if (values.inputMode === 'datasheet' && values.datasheet) {
        const formData = new FormData();
        formData.append('componentName', values.componentName);
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

        datasheetContentForAi = `Max Current: ${specsResult.data.maxCurrent}, Max Voltage: ${specsResult.data.maxVoltage}, Power Dissipation: ${specsResult.data.powerDissipation}`;

      } else if (values.inputMode === 'manual') {
        specsToSimulate = {
            maxCurrent: String(values.maxCurrent),
            maxVoltage: String(values.maxVoltage),
            powerDissipation: String(values.powerDissipation),
        };
        datasheetContentForAi = `Max Current: ${values.maxCurrent}A, Max Voltage: ${values.maxVoltage}V, Power Dissipation: ${values.powerDissipation}W (manual input)`;
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Invalid input mode or missing data.' });
        return;
      }
      
      const simResult = runSimulation(specsToSimulate, values);
      setSimulationResult(simResult);

      const simulationSummary = `Result: ${simResult.status}. Failure Reason: ${simResult.failureReason || 'None'}. Details: ${simResult.details}`;

      // Fire off AI calls in parallel
      const [aiCalculations, aiSuggestions] = await Promise.all([
        getAiCalculationsAction(values.componentName, datasheetContentForAi),
        getAiSuggestionsAction(
          values.componentName,
          values.coolingMethod,
          values.maxTemperature,
          values.coolingBudget,
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
          AI-powered transistor analysis and thermal simulation.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        <div className="md:col-span-2">
            <SimulationForm form={form} onSubmit={onSubmit} isPending={isPending} />
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
