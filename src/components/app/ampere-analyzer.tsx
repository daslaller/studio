"use client";

import React, { useState, useTransition } from 'react';
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
  datasheet: z.instanceof(File).refine(file => file.size > 0, 'Datasheet PDF is required.'),
  coolingBudget: z.coerce.number().min(0, 'Cooling budget must be positive'),
  maxTemperature: z.coerce.number().min(0, 'Max temperature must be positive'),
  coolingMethod: z.string().min(1, 'Please select a cooling method'),
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
      coolingBudget: 100,
      maxTemperature: 125,
      coolingMethod: 'active-air',
    },
  });

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

      const formData = new FormData();
      formData.append('componentName', values.componentName);
      formData.append('datasheet', values.datasheet);

      const specsResult = await extractTransistorSpecsAction(formData);
      if (specsResult.error || !specsResult.data) {
        toast({ variant: 'destructive', title: 'Error', description: specsResult.error });
        return;
      }
      setDatasheetSpecs(specsResult.data);
      
      const simResult = runSimulation(specsResult.data, values);
      setSimulationResult(simResult);

      const simulationSummary = `Result: ${simResult.status}. Failure Reason: ${simResult.failureReason || 'None'}. Details: ${simResult.details}`;
      const datasheetContent = `Max Current: ${specsResult.data.maxCurrent}, Max Voltage: ${specsResult.data.maxVoltage}, Power Dissipation: ${specsResult.data.powerDissipation}`;

      // Fire off AI calls in parallel
      const [aiCalculations, aiSuggestions] = await Promise.all([
        getAiCalculationsAction(values.componentName, datasheetContent),
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
        <h1 className="text-4xl font-bold tracking-tight text-primary">Ampere Analyzer</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          AI-powered transistor analysis and thermal simulation.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2">
            <SimulationForm form={form} onSubmit={onSubmit} isPending={isPending} />
        </div>
        <div className="lg:col-span-3">
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
