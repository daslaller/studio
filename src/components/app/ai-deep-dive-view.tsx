
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';
import { BrainCircuit, CheckCircle, PackageCheck, Thermometer, Zap } from 'lucide-react';
import type { AiDeepDiveStep, LiveDataPoint } from '@/lib/types';
import LiveSimulationView from './live-simulation-view';
import { coolingMethods } from '@/lib/constants';

interface AiDeepDiveViewProps {
  steps: AiDeepDiveStep[];
  currentStepIndex: number;
  liveData: LiveDataPoint[];
  initialFormValues: any;
}

const StepIcon = ({ index, currentIndex }: { index: number, currentIndex: number }) => {
    const isCompleted = index < currentIndex;
    const isCurrent = index === currentIndex;

    return (
        <div className="relative flex-shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                ${isCompleted ? 'bg-primary' : ''}
                ${isCurrent ? 'bg-accent ring-2 ring-accent/50' : ''}
                ${!isCompleted && !isCurrent ? 'bg-muted border-2 border-border' : ''}
            `}>
                {isCompleted ? <CheckCircle className="w-5 h-5 text-primary-foreground" /> : <span className="font-bold">{index + 1}</span>}
            </div>
        </div>
    );
};

export default function AiDeepDiveView({ steps, currentStepIndex, liveData, initialFormValues }: AiDeepDiveViewProps) {
    const currentStep = steps[currentStepIndex];
    const progress = ((currentStepIndex + 1) / steps.length) * 100;
    const [key, setKey] = useState(0);

    useEffect(() => {
        // Force re-render of LiveSimulationView by changing its key
        setKey(prev => prev + 1);
    }, [currentStepIndex, liveData]);
    
    if (!currentStep) {
        return (
             <Card className="flex flex-col items-center justify-center h-full p-8 text-center border-dashed border-white/20 bg-transparent shadow-none">
                <BrainCircuit className="h-16 w-16 text-muted-foreground/50 mb-4 animate-pulse" />
                <CardTitle className="text-xl">Initializing AI Deep Dive...</CardTitle>
                <CardDescription className="mt-2 max-w-xs mx-auto">
                    The AI is preparing for an iterative analysis. Please wait.
                </CardDescription>
            </Card>
        );
    }

    const getSimDisplayValues = () => {
        if (currentStep.simulationResult) {
            const mode = currentStep.simulationParams.simulationMode || initialFormValues.simulationMode;
            let maxTemp = initialFormValues.maxTemperature;
            if(currentStep.simulationParams.maxTemperature) {
                maxTemp = currentStep.simulationParams.maxTemperature;
            }
            return { simulationMode: mode, maxTemperature: maxTemp };
        }
        return { simulationMode: initialFormValues.simulationMode, maxTemperature: initialFormValues.maxTemperature };
    }

    const { simulationMode, maxTemperature } = getSimDisplayValues();

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit className="text-primary"/> AI Deep Dive Analysis</CardTitle>
                <CardDescription>The AI is performing a live, iterative analysis to find the optimal configuration.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col space-y-4">
                {/* Stepper */}
                <div className="flex items-start">
                    {steps.map((step, index) => (
                        <React.Fragment key={index}>
                            <div className="flex flex-col items-center">
                                <StepIcon index={index} currentIndex={currentStepIndex} />
                                <p className={`mt-1 text-xs text-center transition-colors ${index === currentStepIndex ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>{step.title}</p>
                            </div>
                            {index < steps.length - 1 && <div className={`flex-1 h-px bg-border mt-4 mx-2 transition-all duration-500 ${index < currentStepIndex ? 'bg-primary' : ''}`} />}
                        </React.Fragment>
                    ))}
                </div>
                
                 <div className="relative h-px bg-border my-4">
                    <div className="absolute top-0 left-0 h-px bg-primary transition-all duration-500" style={{width: `${progress}%`}}/>
                </div>
                
                {/* Current Step Info */}
                <div className="bg-background/50 p-4 rounded-lg min-h-[80px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStepIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            <p className="font-semibold text-foreground">{currentStep.title}</p>
                            <p className="text-sm text-muted-foreground">{currentStep.description}</p>
                        </motion.div>
                    </AnimatePresence>
                </div>
                
                {/* Live simulation view for the current step */}
                <div className="flex-grow">
                   <AnimatePresence mode="out-in">
                        <motion.div
                            key={key}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.5 }}
                        >
                             <LiveSimulationView
                                liveData={liveData}
                                simulationMode={simulationMode}
                                maxTemperature={maxTemperature}
                            />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </CardContent>
        </Card>
    );
}

