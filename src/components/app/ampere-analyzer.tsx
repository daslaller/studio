"use client";

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from "@/hooks/use-toast";
import SimulationForm from '@/components/app/simulation-form';
import ResultsDisplay from '@/components/app/results-display';
import { findOrExtractTransistorSpecsAction, getAiCalculationsAction, getAiSuggestionsAction } from '@/app/actions';
import type { SimulationResult, ExtractTransistorSpecsOutput, AiCalculatedExpectedResultsOutput, AiOptimizationSuggestionsOutput, CoolingMethod, ManualSpecs, LiveDataPoint } from '@/lib/types';
import { coolingMethods, predefinedTransistors } from '@/lib/constants';

const isMosfetType = (type: string) => {
    return type.includes('MOSFET') || type.includes('GaN');
};

const formSchema = z.object({
  predefinedComponent: z.string().optional(),
  componentName: z.string().optional(),
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
  maxTemperature: z.coerce.number().positive(),


  // Simulation Constraints
  simulationMode: z.enum(['ftf', 'temp', 'budget']).default('ftf'),
  switchingFrequency: z.coerce.number().positive(), // kHz
  coolingMethod: z.string().min(1, 'Please select a cooling method'),
  ambientTemperature: z.coerce.number().default(25),
  
  // FTF Limits
  coolingBudget: z.coerce.number().optional(),

}).superRefine((data, ctx) => {
    if (!data.componentName && !data.predefinedComponent) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['componentName'], message: 'Device name is required if not selecting a predefined one.' });
    }
    if (data.transistorType && isMosfetType(data.transistorType) && (!data.rdsOn || data.rdsOn <= 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rdsOn'], message: 'Rds(on) is required for this transistor type and must be positive.' });
    }
    if (data.transistorType && !isMosfetType(data.transistorType) && (!data.vceSat || data.vceSat <= 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vceSat'], message: 'Vce(sat) is required for this transistor type and must be positive.' });
    }
    if (data.simulationMode === 'budget' && (!data.coolingBudget || data.coolingBudget <= 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['coolingBudget'], message: 'Cooling Budget must be a positive number for this mode.' });
    }
});


type FormValues = z.infer<typeof formSchema>;

export default function AmpereAnalyzer() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [aiCalculatedResults, setAiCalculatedResults] = useState<AiCalculatedExpectedResultsOutput | null>(null);
  const [aiOptimizationSuggestions, setAiOptimizationSuggestions] = useState<AiOptimizationSuggestionsOutput | null>(null);
  const [datasheetFile, setDatasheetFile] = useState<File | null>(null);
  const [liveData, setLiveData] = useState<LiveDataPoint[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      predefinedComponent: '',
      componentName: '',
      maxTemperature: 150,
      coolingMethod: 'air-nh-d15',
      switchingFrequency: 100,
      ambientTemperature: 25,
      transistorType: 'MOSFET (N-Channel)',
      simulationMode: 'ftf',
    },
  });

  const handleTransistorSelect = (value: string) => {
    const transistor = predefinedTransistors.find(t => t.value === value);
    if (transistor) {
      form.reset({
        ...form.getValues(),
        predefinedComponent: value,
        componentName: transistor.name,
        transistorType: transistor.specs.transistorType,
        maxCurrent: parseFloat(transistor.specs.maxCurrent),
        maxVoltage: parseFloat(transistor.specs.maxVoltage),
        powerDissipation: parseFloat(transistor.specs.powerDissipation),
        rdsOn: parseFloat(transistor.specs.rdsOn) || undefined,
        vceSat: parseFloat(transistor.specs.vceSat) || undefined,
        riseTime: parseFloat(transistor.specs.riseTime),
        fallTime: parseFloat(transistor.specs.fallTime),
        rthJC: parseFloat(transistor.specs.rthJC),
        maxTemperature: parseFloat(transistor.specs.maxTemperature) || 150,
      });
      toast({ title: "Component Loaded", description: `${transistor.name} specs have been loaded into the manual fields.` });
    }
  };
  
  const handleDatasheetLookup = async () => {
    const componentName = form.getValues('componentName');
    const datasheet = datasheetFile;

     if (!componentName) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a component name.' });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('componentName', componentName);
      if (datasheet) {
        formData.append('datasheet', datasheet);
      }

      const result = await findOrExtractTransistorSpecsAction(formData);

      if (result.error) {
        toast({ variant: 'destructive', title: 'Datasheet Parsing Error', description: result.error });
      } else if (result.data) {
        const { data, source } = result;
        form.setValue('maxCurrent', parseFloat(data.maxCurrent) || 0);
        form.setValue('maxVoltage', parseFloat(data.maxVoltage) || 0);
        form.setValue('powerDissipation', parseFloat(data.powerDissipation) || 0);
        form.setValue('rthJC', parseFloat(data.rthJC) || 0);
        form.setValue('maxTemperature', parseFloat(data.maxTemperature) || 150);
        form.setValue('riseTime', parseFloat(data.riseTime) || 0);
        form.setValue('fallTime', parseFloat(data.fallTime) || 0);
        
        const type = data.transistorType || form.getValues('transistorType');
        form.setValue('transistorType', type);
        
        if (isMosfetType(type)) {
            form.setValue('rdsOn', parseFloat(data.rdsOn) || 0);
            form.setValue('vceSat', undefined);
        } else {
            form.setValue('vceSat', parseFloat(data.vceSat) || 0);
            form.setValue('rdsOn', undefined);
        }
        
        const toastTitle = source === 'pdf' ? 'Datasheet Parsed' : 'AI Analysis Complete';
        const toastDescription = source === 'pdf'
          ? 'Specifications have been extracted and populated.'
          : 'AI has populated the specs based on online data or its best estimate.';
        toast({ title: toastTitle, description: toastDescription });
      }
    });
  };

  const runSimulation = async (values: FormValues, updateCallback: (data: LiveDataPoint[]) => void): Promise<SimulationResult> => {
      const {
        maxCurrent, maxVoltage, powerDissipation, rthJC, riseTime, fallTime,
        switchingFrequency, maxTemperature, ambientTemperature, coolingMethod,
        transistorType, rdsOn, vceSat, simulationMode, coolingBudget
      } = values;

      const selectedCooling = coolingMethods.find(c => c.value === coolingMethod) as CoolingMethod;
      const totalRth = rthJC + selectedCooling.thermalResistance;
      
      const rdsOnOhms = (rdsOn || 0) / 1000;
      const fSwHz = switchingFrequency * 1000;
      const tSwitchingSec = ((riseTime || 0) + (fallTime || 0)) * 1e-9;

      let maxSafeCurrent = 0;
      let failureReason: SimulationResult['failureReason'] = null;
      let details = '';
      let finalTemperature = ambientTemperature;
      let powerLoss = { total: 0, conduction: 0, switching: 0 };
      
      const step = Math.max(0.01, maxCurrent / 2000);
      const dataPoints: LiveDataPoint[] = [];

      for (let current = step; current <= maxCurrent + step; current += step) {
          let conductionLoss = isMosfetType(transistorType)
              ? Math.pow(current, 2) * rdsOnOhms * 0.5
              : current * (vceSat || 0) * 0.5;
          const switchingLoss = 0.5 * maxVoltage * current * tSwitchingSec * fSwHz;
          const totalLoss = conductionLoss + switchingLoss;

          powerLoss = { total: totalLoss, conduction: conductionLoss, switching: switchingLoss };
          const tempRise = totalLoss * totalRth;
          finalTemperature = ambientTemperature + tempRise;
          const effectiveCoolingBudget = (simulationMode === 'budget' && coolingBudget) ? coolingBudget : selectedCooling.coolingBudget;
          
          let progress = 0;
          let limitValue = 0;

          // Check failure conditions based on simulation mode
          let fail = false;
          if (simulationMode === 'ftf') {
            if (finalTemperature > maxTemperature) { failureReason = 'Thermal'; details = `Exceeded max junction temp of ${maxTemperature}°C. Reached ${finalTemperature.toFixed(2)}°C.`; fail = true; }
            else if (totalLoss > powerDissipation) { failureReason = 'Power Dissipation'; details = `Exceeded component's max power dissipation of ${powerDissipation}W. Reached ${totalLoss.toFixed(2)}W.`; fail = true; }
            else if (totalLoss > effectiveCoolingBudget) { failureReason = 'Cooling Budget'; details = `Exceeded cooling budget of ${effectiveCoolingBudget}W. Reached ${totalLoss.toFixed(2)}W.`; fail = true; }
            else if (current > maxCurrent) { failureReason = 'Current'; details = `Exceeded max current rating of ${maxCurrent.toFixed(2)}A.`; fail = true; }
          } else if (simulationMode === 'temp') {
            if (finalTemperature > maxTemperature) { failureReason = 'Thermal'; details = `Exceeded max junction temp of ${maxTemperature}°C. Reached ${finalTemperature.toFixed(2)}°C.`; fail = true; }
          } else if (simulationMode === 'budget') {
            if (totalLoss > effectiveCoolingBudget) { failureReason = 'Cooling Budget'; details = `Exceeded cooling budget of ${effectiveCoolingBudget}W. Reached ${totalLoss.toFixed(2)}W.`; fail = true; }
          }
          
          if (fail) {
              maxSafeCurrent = current - step;
              const lastSafeConductionLoss = isMosfetType(transistorType) ? Math.pow(maxSafeCurrent, 2) * rdsOnOhms * 0.5 : maxSafeCurrent * (vceSat || 0) * 0.5;
              const lastSafeSwitchingLoss = 0.5 * maxVoltage * maxSafeCurrent * tSwitchingSec * fSwHz;
              const lastSafeTotalLoss = lastSafeConductionLoss + lastSafeSwitchingLoss;
              const lastSafeTempRise = lastSafeTotalLoss * totalRth;
              
              return { status: 'failure', maxSafeCurrent, failureReason, details, finalTemperature: ambientTemperature + lastSafeTempRise, powerDissipation: { total: lastSafeTotalLoss, conduction: lastSafeConductionLoss, switching: lastSafeSwitchingLoss } };
          }
          
          switch (failureReason || simulationMode) {
              case 'Thermal':
              case 'temp':
                  progress = (finalTemperature / maxTemperature) * 100;
                  limitValue = maxTemperature;
                  break;
              case 'Cooling Budget':
              case 'budget':
                  progress = (totalLoss / effectiveCoolingBudget) * 100;
                  limitValue = effectiveCoolingBudget;
                  break;
              case 'Power Dissipation':
                  progress = (totalLoss / powerDissipation) * 100;
                  limitValue = powerDissipation;
                  break;
              default: // Current or FTF default
                  progress = (current / maxCurrent) * 100;
                  limitValue = maxCurrent;
          }

          const newPoint: LiveDataPoint = {
              current,
              temperature: finalTemperature,
              powerLoss: totalLoss,
              progress: Math.min(progress, 100),
              limitValue
          };
          
          dataPoints.push(newPoint);
          
          // Update UI periodically to avoid performance issues
          if (dataPoints.length % 10 === 0) {
              updateCallback([...dataPoints]);
              await new Promise(resolve => setTimeout(resolve, 10)); // small delay to allow UI to render
          }

          maxSafeCurrent = current;
      }
      
      updateCallback([...dataPoints]); // Send final data
      const safeCurrent = Math.min(maxSafeCurrent, maxCurrent);
      return { status: 'success', maxSafeCurrent: safeCurrent, failureReason: null, details: `Device operates safely up to its max rating of ${safeCurrent.toFixed(2)}A within all limits.`, finalTemperature, powerDissipation: powerLoss };
  };


  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      setSimulationResult(null);
      setAiCalculatedResults(null);
      setAiOptimizationSuggestions(null);
      setLiveData([]);

      const componentName = values.predefinedComponent 
        ? predefinedTransistors.find(t => t.value === values.predefinedComponent)?.name || 'N/A'
        : values.componentName || 'N/A';

      if (!values.maxCurrent || values.maxCurrent <= 0) {
        toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please populate component specs before running an analysis.' });
        return;
      }

      const simResult = await runSimulation(values, setLiveData);
      setSimulationResult(simResult);

      let specsForAi: Partial<ManualSpecs> = {
          maxCurrent: String(values.maxCurrent),
          maxVoltage: String(values.maxVoltage),
          powerDissipation: String(values.powerDissipation),
      };
      
      const datasheetContentForAi = Object.entries(specsForAi)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');


      const simulationSummary = `Result: ${simResult.status}. Failure Reason: ${simResult.failureReason || 'None'}. Details: ${simResult.details}`;
      const selectedCooling = coolingMethods.find(c => c.value === values.coolingMethod);
      const coolingBudgetVal = values.simulationMode === 'budget' && values.coolingBudget ? values.coolingBudget : (selectedCooling?.coolingBudget || 0);

      const [aiCalculations, aiSuggestions] = await Promise.all([
        getAiCalculationsAction(componentName, datasheetContentForAi),
        getAiSuggestionsAction(
          componentName,
          selectedCooling?.name || "N/A",
          values.maxTemperature,
          coolingBudgetVal,
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
            <SimulationForm 
              form={form} 
              onSubmit={onSubmit} 
              isPending={isPending} 
              onTransistorSelect={handleTransistorSelect}
              onDatasheetLookup={handleDatasheetLookup}
              setDatasheetFile={setDatasheetFile}
            />
        </div>
        <div className="md:col-span-3">
            <ResultsDisplay
                isLoading={isPending}
                simulationResult={simulationResult}
                aiCalculatedResults={aiCalculatedResults}
                aiOptimizationSuggestions={aiOptimizationSuggestions}
                liveData={liveData}
                formValues={form.getValues()}
            />
        </div>
      </div>
    </div>
  );
}
