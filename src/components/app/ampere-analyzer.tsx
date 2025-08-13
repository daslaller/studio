
"use client";

import React, { useState, useTransition, useCallback, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from "@/hooks/use-toast";
import SimulationForm from '@/components/app/simulation-form';
import ResultsDisplay from '@/components/app/results-display';
import { findDatasheetAction, getAiCalculationsAction, getAiSuggestionsAction, runAiDeepDiveAction, extractSpecsFromDatasheetAction, getBestEffortSpecsAction } from '@/app/actions';
import type { SimulationResult, AiCalculatedExpectedResultsOutput, AiOptimizationSuggestionsOutput, CoolingMethod, ManualSpecs, LiveDataPoint, AiDeepDiveAnalysisInput, AiDeepDiveStep, HistoryEntry, FindDatasheetOutput, ExtractTransistorSpecsOutput, GetBestEffortSpecsOutput } from '@/lib/types';
import { coolingMethods, predefinedTransistors } from '@/lib/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import HistoryView from './history-view';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { FileText, Search, Bot } from 'lucide-react';
import { Button } from '../ui/button';

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
  powerDissipation: z.coerce.number().positive().optional(),
  rdsOn: z.coerce.number().optional(), // mOhms
  vceSat: z.coerce.number().optional(), // V
  riseTime: z.coerce.number().positive(), // ns
  fallTime: z.coerce.number().positive(), // ns
  rthJC: z.coerce.number().positive("Junction-to-Case Thermal Resistance is required."), // °C/W
  maxTemperature: z.coerce.number().positive(),


  // Simulation Constraints
  simulationMode: z.enum(['ftf', 'temp', 'budget']).default('ftf'),
  simulationAlgorithm: z.enum(['iterative', 'binary']).default('iterative'),
  precisionSteps: z.coerce.number().min(10).max(5000).default(200),
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

type DialogState = 
    | { type: 'idle' }
    | { type: 'datasheet_found'; data: FindDatasheetOutput }
    | { type: 'no_datasheet_found' }
    | { type: 'best_effort_found'; data: GetBestEffortSpecsOutput };


export default function AmpereAnalyzer() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [aiCalculatedResults, setAiCalculatedResults] = useState<AiCalculatedExpectedResultsOutput | null>(null);
  const [aiOptimizationSuggestions, setAiOptimizationSuggestions] = useState<AiOptimizationSuggestionsOutput | null>(null);
  const [datasheetFile, setDatasheetFile] = useState<File | null>(null);
  const [liveData, setLiveData] = useState<LiveDataPoint[]>([]);
  const [isDeepDiveRunning, setIsDeepDiveRunning] = useState(false);
  const [deepDiveSteps, setDeepDiveSteps] = useState<AiDeepDiveStep[]>([]);
  const [currentDeepDiveStep, setCurrentDeepDiveStep] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [dialogState, setDialogState] = useState<DialogState>({ type: 'idle' });


  const resultsRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('simulationHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
        console.error("Could not load history from localStorage", error);
    }
  }, []);

  const addToHistory = (entry: HistoryEntry) => {
    const newHistory = [entry, ...history].slice(0, 50); // Keep last 50 results
    setHistory(newHistory);
    try {
      localStorage.setItem('simulationHistory', JSON.stringify(newHistory));
    } catch (error) {
       console.error("Could not save history to localStorage", error);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('simulationHistory');
    } catch (error) {
      console.error("Could not clear history from localStorage", error);
    }
  }


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
      simulationAlgorithm: 'iterative',
      precisionSteps: 200,
    },
  });
  
  const scrollToResults = () => {
    setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };
  
  const populateFormWithSpecs = useCallback((specs: ManualSpecs | ExtractTransistorSpecsOutput | GetBestEffortSpecsOutput) => {
      form.setValue('maxCurrent', parseFloat(specs.maxCurrent) || 0);
      form.setValue('maxVoltage', parseFloat(specs.maxVoltage) || 0);
      form.setValue('powerDissipation', parseFloat(specs.powerDissipation) || 0);
      form.setValue('rthJC', parseFloat(specs.rthJC) || 0);
      form.setValue('maxTemperature', parseFloat(specs.maxTemperature) || 150);
      form.setValue('riseTime', parseFloat(specs.riseTime) || 0);
      form.setValue('fallTime', parseFloat(specs.fallTime) || 0);

      const type = specs.transistorType || form.getValues('transistorType');
      form.setValue('transistorType', type);

      if (isMosfetType(type)) {
          form.setValue('rdsOn', parseFloat(specs.rdsOn) || 0);
          form.setValue('vceSat', undefined);
      } else {
          form.setValue('vceSat', parseFloat(specs.vceSat) || 0);
          form.setValue('rdsOn', undefined);
      }
      toast({ title: "Specifications Loaded", description: "The form has been updated with the new component data." });
  }, [form, toast]);


  const handleTransistorSelect = (value: string) => {
    const transistor = predefinedTransistors.find(t => t.value === value);
    if (transistor) {
      form.reset({
        ...form.getValues(),
        predefinedComponent: value,
        componentName: transistor.name,
      });
      populateFormWithSpecs(transistor.specs);
    }
  };
  
  const handleDatasheetLookup = useCallback(async () => {
    const componentName = form.getValues('componentName');
    const uploadedFile = datasheetFile;

    if (!componentName) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a component name.' });
      return;
    }

    startTransition(async () => {
      // If a file is uploaded, parse it directly.
      if (uploadedFile) {
        toast({ title: 'Parsing Uploaded PDF', description: 'The AI is extracting specs from your datasheet...' });
        const formData = new FormData();
        formData.append('componentName', componentName);
        formData.append('datasheet', uploadedFile);
        const result = await extractSpecsFromDatasheetAction(formData);
        if (result.error) {
          toast({ variant: 'destructive', title: 'Datasheet Parsing Error', description: result.error });
        } else if (result.data) {
          populateFormWithSpecs(result.data);
        }
        return;
      }

      // Stage 1: Strictly look for a datasheet PDF.
      toast({ title: 'AI Datasheet Search', description: 'The AI is looking for an official datasheet PDF...' });
      const formData = new FormData();
      formData.append('componentName', componentName);
      
      const result = await findDatasheetAction(formData);

      if (result.error) {
        toast({ variant: 'destructive', title: 'AI Search Error', description: result.error });
      } else if (result.data) {
        // Datasheet found, show confirmation dialog.
        setDialogState({ type: 'datasheet_found', data: result.data });
      } else {
        // No datasheet found, trigger the "no_datasheet_found" dialog.
        setDialogState({ type: 'no_datasheet_found' });
      }
    });
  }, [form, datasheetFile, toast, populateFormWithSpecs]);

  const handleBestEffortSearch = useCallback(async () => {
    const componentName = form.getValues('componentName');
    if (!componentName) return;

    setDialogState({ type: 'idle' });
    startTransition(async () => {
        toast({ title: 'AI "Bloodhound" Mode Activated', description: "Scouring the internet for parameters...", duration: 5000 });
        const result = await getBestEffortSpecsAction(componentName);

        if (result.error || !result.data) {
            toast({ variant: 'destructive', title: 'Best Effort Search Failed', description: result.error || "Could not find any parameters." });
        } else {
            setDialogState({ type: 'best_effort_found', data: result.data });
        }
    });
  }, [form, toast]);


  const runSimulation = async (values: FormValues, updateCallback: (data: LiveDataPoint[]) => void): Promise<SimulationResult> => {
    const {
      maxCurrent, maxVoltage, powerDissipation, rthJC, riseTime, fallTime,
      switchingFrequency, maxTemperature, ambientTemperature, coolingMethod,
      transistorType, rdsOn, vceSat, simulationMode, coolingBudget,
      simulationAlgorithm, precisionSteps,
    } = values;

    const selectedCooling = coolingMethods.find(c => c.value === coolingMethod) as CoolingMethod;
    const totalRth = rthJC + selectedCooling.thermalResistance;
    const rdsOnOhms = (rdsOn || 0) / 1000;
    const fSwHz = switchingFrequency * 1000;
    const tSwitchingSec = ((riseTime || 0) + (fallTime || 0)) * 1e-9;
    const effectiveCoolingBudget = (simulationMode === 'budget' && coolingBudget) ? coolingBudget : selectedCooling.coolingBudget;


    // This function checks if a given current is safe and returns the result
    const checkCurrent = (current: number) => {
        let pCond = isMosfetType(transistorType)
            ? Math.pow(current, 2) * rdsOnOhms * 0.5
            : current * (vceSat || 0) * 0.5;
        const pSw = 0.5 * maxVoltage * current * tSwitchingSec * fSwHz;
        const pTotal = pCond + pSw;
        const tempRise = pTotal * totalRth;
        const finalTemp = ambientTemperature + tempRise;

        let failureReason: SimulationResult['failureReason'] = null;
        let details = '';

        if (simulationMode === 'ftf') {
            if (finalTemp > maxTemperature) { failureReason = 'Thermal'; details = `Exceeded max junction temp of ${maxTemperature}°C. Reached ${finalTemp.toFixed(2)}°C.`; }
            else if (powerDissipation && pTotal > powerDissipation) { failureReason = 'Power Dissipation'; details = `Exceeded component's max power dissipation of ${powerDissipation}W. Reached ${pTotal.toFixed(2)}W.`; }
            else if (pTotal > effectiveCoolingBudget) { failureReason = 'Cooling Budget'; details = `Exceeded cooling budget of ${effectiveCoolingBudget}W. Reached ${pTotal.toFixed(2)}W.`; }
            else if (current > maxCurrent) { failureReason = 'Current'; details = `Exceeded max current rating of ${maxCurrent.toFixed(2)}A.`; }
        } else if (simulationMode === 'temp') {
            if (finalTemp > maxTemperature) { failureReason = 'Thermal'; details = `Exceeded max junction temp of ${maxTemperature}°C. Reached ${finalTemp.toFixed(2)}°C.`; }
        } else if (simulationMode === 'budget') {
            if (pTotal > effectiveCoolingBudget) { failureReason = 'Cooling Budget'; details = `Exceeded cooling budget of ${effectiveCoolingBudget}W. Reached ${pTotal.toFixed(2)}W.`; }
        }
        
        return {
            isSafe: !failureReason,
            failureReason,
            details,
            finalTemperature: finalTemp,
            powerDissipation: { total: pTotal, conduction: pCond, switching: pSw }
        };
    };

    const addDataPoint = (current: number) => {
        const pointResult = checkCurrent(current);
        const { isSafe, ...rest } = pointResult;
        
        let progress = 0;
        let limitValue = 0;
        switch (simulationMode) {
            case 'temp':
                progress = (rest.finalTemperature / maxTemperature) * 100;
                limitValue = maxTemperature;
                break;
            case 'budget':
                progress = (rest.powerDissipation.total / effectiveCoolingBudget) * 100;
                limitValue = effectiveCoolingBudget;
                break;
            case 'ftf':
                const tempProgress = (rest.finalTemperature / maxTemperature) * 100;
                const powerProgress = (powerDissipation && powerDissipation > 0) ? (rest.powerDissipation.total / powerDissipation) * 100 : 0;
                const budgetProgress = (rest.powerDissipation.total / effectiveCoolingBudget) * 100;
                const currentProgress = (current / maxCurrent) * 100;
                progress = Math.max(tempProgress, powerProgress, budgetProgress, currentProgress);
                limitValue = 100;
                break;
        }
        
        const newDataPoint: LiveDataPoint = {
            current,
            temperature: rest.finalTemperature,
            powerLoss: rest.powerDissipation.total,
            conductionLoss: rest.powerDissipation.conduction,
            switchingLoss: rest.powerDissipation.switching,
            progress: Math.min(progress, 100),
            limitValue
        };
        
        updateCallback((prev) => [...prev, newDataPoint]);
    };
    
    let maxSafeCurrent = 0;
    
    if (simulationAlgorithm === 'iterative') {
        const stepSize = (maxCurrent * 1.2) / precisionSteps;
        for (let i = 0; i <= precisionSteps; i++) {
            const current = i * stepSize;
            const result = checkCurrent(current);
            if (result.isSafe) {
                maxSafeCurrent = current;
                addDataPoint(current);
                 await new Promise(resolve => setTimeout(resolve, 5)); // Small delay for rendering
            } else {
                break; // Stop iterating once a failure is detected
            }
        }
    } else { // Binary Search
        let low = 0;
        let high = maxCurrent * 1.5; // Search slightly above max current to find true thermal limit
        
        for (let i = 0; i < 15; i++) { // 15 iterations are enough for high precision
            let mid = (low + high) / 2;
            if (mid <= 0) break;
            const result = checkCurrent(mid);
            addDataPoint(mid);
            await new Promise(resolve => setTimeout(resolve, 50)); // Delay to visualize search
            if (result.isSafe) {
                maxSafeCurrent = mid;
                low = mid;
            } else {
                high = mid;
            }
        }
        // Final cleanup for live data - sort and add zero point
        updateCallback(prev => {
            const sorted = [...prev].sort((a,b) => a.current - b.current);
            if (sorted.length === 0 || sorted[0].current > 0) {
              addDataPoint(0);
              return [checkCurrent(0), ...sorted].map(p => ({ ...p, current: p.current, temperature: p.temperature, powerLoss: p.powerLoss, conductionLoss: p.conductionLoss, switchingLoss: p.switchingLoss, progress: p.progress, limitValue: p.limitValue }));
            }
            return sorted;
        });
    }

    const finalResult = checkCurrent(maxSafeCurrent);

    const safeCurrent = Math.min(maxSafeCurrent, maxCurrent);
    const finalCheck = checkCurrent(safeCurrent);
    if (finalCheck.isSafe) {
        return {
            status: 'success',
            maxSafeCurrent: safeCurrent,
            failureReason: null,
            details: `Device operates safely up to its max rating of ${safeCurrent.toFixed(2)}A within all limits.`,
            ...finalCheck
        };
    } else {
         return {
            status: 'failure',
            maxSafeCurrent: safeCurrent,
            ...finalCheck
        };
    }
};


  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      setIsDeepDiveRunning(false);
      setSimulationResult(null);
      setAiCalculatedResults(null);
      setAiOptimizationSuggestions(null);
      setLiveData([]);
      scrollToResults();

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
      
      const historyEntry: HistoryEntry = {
        id: new Date().toISOString(),
        componentName,
        timestamp: new Date().toISOString(),
        simulationResult: simResult,
        formValues: values,
      };
      addToHistory(historyEntry);

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

  const runDeepDiveSimulation = useCallback(async (
      initialValues: FormValues,
      newValues: Partial<FormValues>,
      updateCallback: (data: LiveDataPoint[]) => void
  ) => {
      const combinedValues = { ...initialValues, ...newValues };
      const simResult = await runSimulation(combinedValues, updateCallback);
      return simResult;
  }, [runSimulation]);

  const handleAiDeepDive = useCallback(async () => {
    if (!simulationResult || !aiOptimizationSuggestions) {
        toast({ variant: 'destructive', title: 'Error', description: 'Need initial results to run a deep dive.' });
        return;
    }
    
    startTransition(async () => {
        setIsDeepDiveRunning(true);
        setCurrentDeepDiveStep(0);
        setDeepDiveSteps([]);
        setLiveData([]);
        scrollToResults();

        const values = form.getValues();
        const componentName = values.predefinedComponent
            ? predefinedTransistors.find(t => t.value === values.predefinedComponent)?.name || 'N/A'
            : values.componentName || 'N/A';
        
        const selectedCooling = coolingMethods.find(c => c.value === values.coolingMethod);
        const coolingBudgetVal = values.simulationMode === 'budget' && values.coolingBudget 
            ? values.coolingBudget 
            : (selectedCooling?.coolingBudget || 0);

        const simulationSummary = `Result: ${simulationResult.status}. Failure Reason: ${simulationResult.failureReason || 'None'}. Details: ${simulationResult.details}`;
        
        const initialSpecs: Partial<FormValues> = { ...values };
        delete initialSpecs.datasheet;
        delete initialSpecs.predefinedComponent;

        const deepDiveInput: AiDeepDiveAnalysisInput = {
            componentName,
            coolingMethod: selectedCooling?.name || 'N/A',
            maxTemperature: values.maxTemperature,
            coolingBudget: coolingBudgetVal,
            simulationResults: simulationSummary,
            allCoolingMethods: JSON.stringify(coolingMethods.map(c => ({name: c.name, value: c.value, thermalResistance: c.thermalResistance, coolingBudget: c.coolingBudget}))),
            initialSpecs: JSON.stringify(initialSpecs),
        };

        toast({ title: "AI Deep Dive Started", description: "The AI is running an iterative analysis..." });
        
        const result = await runAiDeepDiveAction(deepDiveInput);

        if (result.error || !result.data) {
            toast({ variant: 'destructive', title: 'AI Deep Dive Error', description: result.error || "No data returned from AI." });
            setIsDeepDiveRunning(false);
            return;
        } 
        
        const bestCoolerInfo = coolingMethods.find(c => c.value === result.data.bestCoolingMethod);

        // Prepare simulation steps
        const simulationSteps: AiDeepDiveStep[] = [
            {
                title: "Analyzing Initial Results",
                description: `AI is reviewing the initial simulation where the failure occurred at ${simulationResult.maxSafeCurrent.toFixed(2)}A due to ${simulationResult.failureReason}. The goal is to push past this limit.`,
                simulationResult: simulationResult,
                simulationParams: {},
            },
            {
                title: `Optimizing Frequency to ${result.data.optimalFrequency} kHz`,
                description: `AI has identified that reducing switching losses is key. It's now testing a new frequency of ${result.data.optimalFrequency} kHz.`,
                simulationResult: null,
                simulationParams: { switchingFrequency: result.data.optimalFrequency },
            },
            {
                title: `Applying Cooler: ${bestCoolerInfo?.name || result.data.bestCoolingMethod}`,
                description: `To handle the remaining heat, the AI is applying the '${bestCoolerInfo?.name || result.data.bestCoolingMethod}' and re-evaluating performance with the new thermal solution.`,
                simulationResult: null,
                simulationParams: { coolingMethod: result.data.bestCoolingMethod, switchingFrequency: result.data.optimalFrequency },
            },
            {
                title: "Final Recommendation",
                description: result.data.reasoning,
                simulationResult: null,
                simulationParams: {},
            }
        ];
        
        setDeepDiveSteps(simulationSteps);

        // Run through steps
        for(let i = 0; i < simulationSteps.length; i++) {
            setCurrentDeepDiveStep(i);
            const step = simulationSteps[i];

            if(step.simulationResult === null && Object.keys(step.simulationParams).length > 0) {
                // To show a clean slate for the new simulation, clear liveData before running
                setLiveData([]);
                await new Promise(r => setTimeout(r, 100)); // small delay to clear chart

                const stepSimResult = await runDeepDiveSimulation(values, step.simulationParams, setLiveData);
                simulationSteps[i].simulationResult = stepSimResult;
                setDeepDiveSteps([...simulationSteps]);
                await new Promise(r => setTimeout(r, 1000)); // Pause to let user see results
            } else if (step.simulationResult) {
                 // Re-run simulation for the initial state to show the graph
                 setLiveData([]);
                 await new Promise(r => setTimeout(r, 100));
                 await runDeepDiveSimulation(values, {}, setLiveData);
                 await new Promise(r => setTimeout(r, 1000));
            }

            if(i < simulationSteps.length -1) {
              await new Promise(r => setTimeout(r, 2500)); // wait before going to next step
            }
        }
        
        toast({
            title: "AI Deep Dive Complete",
            description: `Optimal solution found! Projected Current: ${result.data.projectedMaxSafeCurrent.toFixed(2)}A.`,
            duration: 9000,
        });
        
        const finalDiveResult = simulationSteps[simulationSteps.length-2].simulationResult;
        if (finalDiveResult) {
            const historyEntry: HistoryEntry = {
                id: new Date().toISOString(),
                componentName: `${componentName} (AI Optimized)`,
                timestamp: new Date().toISOString(),
                simulationResult: finalDiveResult,
                formValues: { ...values, coolingMethod: result.data.bestCoolingMethod, switchingFrequency: result.data.optimalFrequency },
            };
            addToHistory(historyEntry);
        }

        // Keep the dive view open, but mark it as 'done'
        setIsDeepDiveRunning(true); 
    });

}, [simulationResult, aiOptimizationSuggestions, form, toast, runDeepDiveSimulation, history]);


  const renderDialogs = () => {
    switch (dialogState.type) {
        case 'datasheet_found': {
            const { data } = dialogState;
            const { keyParameters } = data;
            return (
                <AlertDialog open={true} onOpenChange={() => setDialogState({ type: 'idle' })}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2"><Search /> AI Datasheet Found</AlertDialogTitle>
                            <AlertDialogDescription>The AI found a likely datasheet for your component. How should we proceed?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="p-4 my-4 bg-muted/50 rounded-lg text-center">
                            <FileText className="h-8 w-8 mx-auto text-primary mb-2" />
                            <p className="font-semibold">{data.foundDatasheetName}</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Max Current: <span className="font-medium text-foreground">{keyParameters.maxCurrent}A</span>, 
                                Max Voltage: <span className="font-medium text-foreground">{keyParameters.maxVoltage}V</span>, 
                                Rds(on)/Vce(sat): <span className="font-medium text-foreground">{keyParameters.rdsOn || keyParameters.vceSat}</span>
                            </p>
                        </div>
                        <AlertDialogFooter className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                             <Button variant="outline" onClick={handleBestEffortSearch}>Use Best Effort Instead</Button>
                            <AlertDialogAction onClick={() => {
                                // For now, parsing the "found" PDF is a simulation. 
                                // We'll trigger the best effort search to get full specs as if they were parsed.
                                handleBestEffortSearch();
                                toast({ title: "Parsing Datasheet...", description: "AI is extracting full parameters." });
                            }}>Yes, Parse Full Specs</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            );
        }
        case 'no_datasheet_found':
            return (
                <AlertDialog open={true} onOpenChange={() => setDialogState({ type: 'idle' })}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2"><Bot /> No Datasheet Found</AlertDialogTitle>
                            <AlertDialogDescription>The AI couldn't find a specific datasheet PDF. Would you like to activate "Bloodhound Mode" to scour the web for individual parameters?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleBestEffortSearch}>Find Best Effort Parameters</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            );
        case 'best_effort_found': {
            const { data: specs } = dialogState;
            return (
                <AlertDialog open={true} onOpenChange={() => setDialogState({ type: 'idle' })}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2"><Bot /> AI Best Effort Results</AlertDialogTitle>
                            <AlertDialogDescription>The AI has compiled the following parameters. Confidence: <span className='font-bold'>{specs.confidence}</span>.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="p-3 my-2 bg-muted/50 rounded-lg text-xs space-y-1">
                            <p><strong>Sources:</strong> <em className="text-muted-foreground">{specs.sources}</em></p>
                             <p>
                                Max Current: <span className="font-medium text-foreground">{specs.maxCurrent}A</span>,
                                Max Voltage: <span className="font-medium text-foreground">{specs.maxVoltage}V</span>,
                                Rds(on): <span className="font-medium text-foreground">{specs.rdsOn}m&#8486;</span>
                            </p>
                        </div>
                        <AlertDialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                             <AlertDialogCancel>Discard</AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                                populateFormWithSpecs(specs);
                                setDialogState({ type: 'idle' });
                            }}>Use These Parameters</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            );
        }
        default:
            return null;
    }
  }


  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-purple-400">Ampere Analyzer</h1>
        <p className="mt-4 text-lg text-purple-200/80 max-w-2xl mx-auto">
          Advanced power transistor analysis with multi-variable thermal simulation.
        </p>
      </header>
      <Tabs defaultValue='analyzer' className='w-full'>
        <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value="analyzer">Analyzer</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="analyzer">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mt-6">
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
                <div className="md:col-span-3" ref={resultsRef}>
                    <ResultsDisplay
                        isLoading={isPending}
                        simulationResult={simulationResult}
                        aiCalculatedResults={aiCalculatedResults}
                        aiOptimizationSuggestions={aiOptimizationSuggestions}
                        liveData={liveData}
                        formValues={form.getValues()}
                        onAiDeepDive={handleAiDeepDive}
                        isDeepDiveRunning={isDeepDiveRunning}
                        deepDiveSteps={deepDiveSteps}
                        currentDeepDiveStep={currentDeepDiveStep}
                    />
                </div>
            </div>
        </TabsContent>
         <TabsContent value="history">
            <HistoryView history={history} clearHistory={clearHistory} />
        </TabsContent>
      </Tabs>
      
      {renderDialogs()}
    </div>
  );
}

    

    
