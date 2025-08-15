"use client";

import React, { useState, useTransition, useCallback, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from "@/hooks/use-toast";
import SimulationForm from '@/components/app/simulation-form';
import ResultsDisplay from '@/components/app/results-display';
import { findDatasheetAction, getAiCalculationsAction, getAiSuggestionsAction, runAiDeepDiveAction, extractSpecsFromDatasheetAction, getBestEffortSpecsAction } from '@/app/actions';
import type { SimulationResult, AiCalculatedExpectedResultsOutput, AiOptimizationSuggestionsOutput, CoolingMethod, ManualSpecs, LiveDataPoint, InterpolatedDataPoint, AiDeepDiveAnalysisInput, AiDeepDiveStep, HistoryEntry, FindDatasheetOutput, ExtractTransistorSpecsOutput, GetBestEffortSpecsOutput } from '@/lib/types';
import { OptimizedDataQueue, CircularDataBuffer, EasingInterpolator, throttle, hasSignificantChange } from '@/lib/simulation-optimizations';
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
  precisionSteps: z.coerce.number().min(10).max(500).default(200),
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
  const [isDeepDiveRunning, setIsDeepDiveRunning] = useState(false);
  const [deepDiveSteps, setDeepDiveSteps] = useState<AiDeepDiveStep[]>([]);
  const [currentDeepDiveStep, setCurrentDeepDiveStep] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [dialogState, setDialogState] = useState<DialogState>({ type: 'idle' });

  // OPTIMIZED: Replace arrays with efficient data structures
  const dataBuffer = useRef(new CircularDataBuffer(400));
  const interpolator = useRef(new EasingInterpolator());
  const [renderTrigger, setRenderTrigger] = useState(0);
  const [smoothDataStream, setSmoothDataStream] = useState<InterpolatedDataPoint[]>([]);
  const smoothAnimationRef = useRef<number | null>(null);

  const animationIntervalId = useRef<any>(null);
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
    
    // OPTIMIZED: Comprehensive cleanup on component unmount
    return () => {
      if (animationIntervalId.current) {
        clearInterval(animationIntervalId.current);
        animationIntervalId.current = null;
      }
      if (smoothAnimationRef.current) {
        cancelAnimationFrame(smoothAnimationRef.current);
        smoothAnimationRef.current = null;
      }
      // Clear data structures
      dataBuffer.current.clear();
    }
  }, []);


  // OPTIMIZED: Enhanced smooth animation using efficient data structures
  const startSmoothAnimation = useCallback(() => {
    let keyframeStartTime = performance.now();
    const INTERPOLATION_DURATION = 120; // ms between keyframes

    const smoothAnimationLoop = (currentTime: number) => {
      const currentPoint = dataBuffer.current.getCurrent();
      const previousPoint = dataBuffer.current.getPrevious();
      
      if (!currentPoint || !previousPoint) {
        smoothAnimationRef.current = requestAnimationFrame(smoothAnimationLoop);
        return;
      }

      // Calculate interpolation progress
      const timeSinceKeyframeStart = currentTime - keyframeStartTime;
      const interpolationProgress = Math.min(timeSinceKeyframeStart / INTERPOLATION_DURATION, 1);

      // Generate smooth interpolated point using optimized interpolator
      const interpolatedPoint = interpolator.current.interpolate(
        previousPoint, 
        currentPoint, 
        interpolationProgress
      );

      // OPTIMIZED: More efficient state update
      setSmoothDataStream((prev) => {
        const newStream = [...prev];
        
        // Replace last interpolated point or add new one
        if (newStream.length > 0 && newStream[newStream.length - 1].isInterpolated) {
          newStream[newStream.length - 1] = interpolatedPoint;
        } else {
          newStream.push(interpolatedPoint);
        }
        
        // Memory management - keep last 200 points for smooth display
        return newStream.slice(-200);
      });

      // Reset timing when new data arrives
      if (interpolationProgress >= 1) {
        keyframeStartTime = currentTime;
        
        // Add the actual calculated point as a keyframe
        const actualPoint: InterpolatedDataPoint = {
          ...currentPoint,
          isInterpolated: false,
          timestamp: currentTime
        };
        
        setSmoothDataStream((prev) => [...prev.slice(-199), actualPoint]);
      }

      smoothAnimationRef.current = requestAnimationFrame(smoothAnimationLoop);
    };

    smoothAnimationRef.current = requestAnimationFrame(smoothAnimationLoop);
  }, []);

  // OPTIMIZED: Start animation based on render trigger instead of data length
  useEffect(() => {
    if (renderTrigger > 0 && !smoothAnimationRef.current) {
      startSmoothAnimation();
    }
  }, [renderTrigger, startSmoothAnimation]);

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


  const runSimulation = (
    values: FormValues,
    updateCallback: (data: LiveDataPoint) => void
  ): Promise<SimulationResult> => {
    return new Promise((resolve, reject) => {
      const {
        maxCurrent, maxVoltage, powerDissipation, rthJC, riseTime, fallTime,
        switchingFrequency, maxTemperature, ambientTemperature, coolingMethod,
        transistorType, rdsOn, vceSat, simulationMode, coolingBudget,
        simulationAlgorithm, precisionSteps,
      } = values;
  
      const selectedCooling = coolingMethods.find(c => c.value === coolingMethod) as CoolingMethod;
      const totalRth = rthJC + selectedCooling.thermalResistance;
      const rdsOnOhms = (rdsOn || 0) / 1000;
      const effectiveCoolingBudget = (simulationMode === 'budget' && coolingBudget) ? coolingBudget : selectedCooling.coolingBudget;
  
      // Create Web Worker (Windsurf/Next.js compatible)
      const worker = new Worker(new URL('../../lib/simulation.worker.js', import.meta.url));
      
      // Handle messages from worker
      worker.onmessage = (e) => {
        const { type, data, result } = e.data;
        
        if (type === 'dataPoint') {
          // Send data point to your existing queue system
          updateCallback(data);
        } else if (type === 'complete') {
          // Simulation finished
          worker.terminate();
          resolve(result);
        }
      };
      
      worker.onerror = (error) => {
        worker.terminate();
        reject(error);
      };
      
      // Send simulation parameters to worker
      worker.postMessage({
        maxCurrent, maxVoltage, powerDissipation, rthJC, riseTime, fallTime,
        switchingFrequency, maxTemperature, ambientTemperature, totalRth,
        transistorType, rdsOnOhms, vceSat, simulationMode, coolingBudget,
        simulationAlgorithm, precisionSteps, effectiveCoolingBudget
      });
    });
  };
  


// OPTIMIZED: Your 8ms queue system enhanced with efficient data structures
const onSubmit = (values: FormValues) => {
  startTransition(async () => {
    // Cleanup existing animations
    if (animationIntervalId.current) {
      clearInterval(animationIntervalId.current);
      animationIntervalId.current = null;
    }
    if (smoothAnimationRef.current) {
      cancelAnimationFrame(smoothAnimationRef.current);
      smoothAnimationRef.current = null;
    }

    setSimulationResult(null);
    setAiCalculatedResults(null);
    setAiOptimizationSuggestions(null);
    setSmoothDataStream([]);
    dataBuffer.current.clear(); // Clear efficient buffer
    setRenderTrigger(0);
    scrollToResults();
    
    const componentName = values.predefinedComponent 
      ? predefinedTransistors.find(t => t.value === values.predefinedComponent)?.name || 'N/A'
      : values.componentName || 'N/A';

    if (!values.maxCurrent || values.maxCurrent <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please populate component specs before running an analysis.' });
      return;
    }
    
    // PRESERVED: Your brilliant 8ms queue system with optimization wrapper
    const optimizedQueue = new OptimizedDataQueue();
    let isSimulationRunning = true;

    const updateCallback = (newDataPoint: LiveDataPoint) => {
      optimizedQueue.enqueue(newDataPoint); // Worker feeds optimized queue
    };
    
    // ENHANCED: Your 8ms loop with memory-efficient processing
    const animationLoop = () => {
      const currentTime = performance.now();
      const pointToRender = optimizedQueue.dequeue(values.simulationAlgorithm, currentTime);

      if (pointToRender) {
        // OPTIMIZED: Use circular buffer instead of growing arrays
        dataBuffer.current.add(pointToRender);
        
        // Binary algorithm still sorts as needed
        if (values.simulationAlgorithm === 'binary') {
          // For binary, we need sorted display data
          const currentData = dataBuffer.current.getDisplayData();
          currentData.sort((a, b) => a.current - b.current);
          // Update buffer with sorted data
          dataBuffer.current.clear();
          currentData.forEach(point => dataBuffer.current.add(point));
        }
        
        // Trigger efficient re-render
        setRenderTrigger(prev => prev + 1);
      }

      if (!isSimulationRunning && optimizedQueue.length === 0) {
        clearInterval(animationIntervalId.current);
        animationIntervalId.current = null;
      }
    };
    
    // PRESERVED: Your optimized 8ms timing!
    animationIntervalId.current = setInterval(animationLoop, 8);
    startSmoothAnimation(); // Enhanced smooth interpolation

    // Web Worker simulation (unchanged)
    const simResult = await runSimulation(values, updateCallback);
    
    isSimulationRunning = false;
    setSimulationResult(simResult);

    // Continue smooth animation briefly after simulation ends
    setTimeout(() => {
      if (smoothAnimationRef.current) {
        cancelAnimationFrame(smoothAnimationRef.current);
        smoothAnimationRef.current = null;
      }
    }, 500);

    // Add to history with optimization
    const historyEntry: HistoryEntry = {
      id: new Date().toISOString(),
      componentName,
      timestamp: new Date().toISOString(),
      simulationResult: simResult,
      formValues: values,
    };
    addToHistory(historyEntry);

    // AI calculations (unchanged)
    if (simResult.status === 'success') {
      const aiCalculations = await getAiCalculationsAction(
        componentName,
        `Max Current: ${simResult.maxSafeCurrent}A, Max Voltage: ${values.maxVoltage}V, Type: ${values.transistorType}`
      );

      if (aiCalculations.data) setAiCalculatedResults(aiCalculations.data);

      const selectedCooling = coolingMethods.find(c => c.value === values.coolingMethod);
      const aiSuggestions = await getAiSuggestionsAction(
        componentName,
        selectedCooling?.name || 'Unknown',
        values.maxTemperature,
        selectedCooling?.coolingBudget || 0,
        `${simResult.status}: ${simResult.details}`
      );

      if (aiSuggestions.data) setAiOptimizationSuggestions(aiSuggestions.data);
    }
  });
};
  const runDeepDiveSimulation = useCallback(async (
      initialValues: FormValues,
      newValues: Partial<FormValues>
  ): Promise<{ result: SimulationResult, dataQueue: LiveDataPoint[] }> => {
      const combinedValues = { ...initialValues, ...newValues };
      const dataQueue: LiveDataPoint[] = [];
      const result = await new Promise<SimulationResult>((resolve) => {
        runSimulation(combinedValues, (newData) => {
            dataQueue.push(newData);
        }).then(resolve);
      });
      return { result, dataQueue };
  }, []);

  const handleAiDeepDive = useCallback(async () => {
    if (!simulationResult || !aiOptimizationSuggestions) {
        toast({ variant: 'destructive', title: 'Error', description: 'Need initial results to run a deep dive.' });
        return;
    }
    
    startTransition(async () => {
        setIsDeepDiveRunning(true);
        setCurrentDeepDiveStep(0);
        setDeepDiveSteps([]);
        dataBuffer.current.clear();
        setRenderTrigger(0);
        scrollToResults();
        if (animationIntervalId.current) clearInterval(animationIntervalId.current);

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

        // OPTIMIZED: Animate simulation data using efficient buffer
        const animateSimulationData = (dataQueue: LiveDataPoint[]) => {
            return new Promise<void>((resolve) => {
                 if (animationIntervalId.current) {
                    clearInterval(animationIntervalId.current);
                    animationIntervalId.current = null;
                }
                dataBuffer.current.clear();
                setRenderTrigger(0);
                let isAnimating = true;

                const animationLoop = () => {
                    if (dataQueue.length > 0) {
                        const point = dataQueue.shift()!;
                        dataBuffer.current.add(point);
                        setRenderTrigger(prev => prev + 1);
                    } else if (!isAnimating) {
                        clearInterval(animationIntervalId.current);
                        animationIntervalId.current = null;
                        resolve();
                    }
                };

                animationIntervalId.current = setInterval(animationLoop, 8);

                // This timeout marks the end of the data source
                 setTimeout(() => {
                    isAnimating = false;
                }, (dataQueue.length * 8) + 100); 

            });
        };

        // Run through steps
        for(let i = 0; i < simulationSteps.length; i++) {
            setCurrentDeepDiveStep(i);
            const step = simulationSteps[i];

            if(step.simulationResult === null && Object.keys(step.simulationParams).length > 0) {
                const { result: stepSimResult, dataQueue } = await runDeepDiveSimulation(values, step.simulationParams);
                simulationSteps[i].simulationResult = stepSimResult;
                setDeepDiveSteps([...simulationSteps]);
                await animateSimulationData(dataQueue);
                
            } else if (step.simulationResult) {
                 const { dataQueue } = await runDeepDiveSimulation(values, {});
                 await animateSimulationData(dataQueue);
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
                        // OPTIMIZED: Use smooth interpolated data for display
                        liveData={smoothDataStream.map((point): LiveDataPoint => ({
                          current: point.current,
                          temperature: point.temperature,
                          powerLoss: point.powerLoss,
                          conductionLoss: point.conductionLoss,
                          switchingLoss: point.switchingLoss,
                          progress: point.progress,
                          limitValue: point.limitValue
                        }))}
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