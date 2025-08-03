"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SimulationResult, AiCalculatedExpectedResultsOutput, AiOptimizationSuggestionsOutput } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, Thermometer, Zap, Gauge, Lightbulb, Bot } from 'lucide-react';

interface ResultsDisplayProps {
  isLoading: boolean;
  simulationResult: SimulationResult | null;
  aiCalculatedResults: AiCalculatedExpectedResultsOutput | null;
  aiOptimizationSuggestions: AiOptimizationSuggestionsOutput | null;
}

const ResultMetric = ({ icon, label, value, unit }: { icon: React.ElementType, label: string, value: string | number, unit: string }) => (
    <div className="flex items-start space-x-4 rounded-lg p-4 bg-muted/50 transition-all hover:bg-muted">
        <div className="flex-shrink-0 mt-1">
            {React.createElement(icon, { className: "h-6 w-6 text-primary" })}
        </div>
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value} <span className="text-base font-normal text-muted-foreground">{unit}</span></p>
        </div>
    </div>
);

export default function ResultsDisplay({ isLoading, simulationResult, aiCalculatedResults, aiOptimizationSuggestions }: ResultsDisplayProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="shadow-lg">
            <CardHeader>
              <Skeleton className="h-7 w-1/2" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!simulationResult) {
    return (
      <Card className="flex flex-col items-center justify-center h-full p-8 text-center border-dashed shadow-none">
        <Bot className="h-20 w-20 text-muted-foreground/50 mb-6" />
        <CardTitle className="text-2xl">Awaiting Analysis</CardTitle>
        <CardDescription className="mt-2 max-w-xs mx-auto">
          Enter your component's specifications and desired simulation constraints, then click "Run Analysis" to view the results.
        </CardDescription>
      </Card>
    );
  }

  const isSuccess = simulationResult.status === 'success';

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-500">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Simulation Outcome</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant={isSuccess ? 'default' : 'destructive'} className={isSuccess ? 'bg-green-900/20 border-green-500/60' : ''}>
            <div className="flex items-center">
              {isSuccess ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              <div className="ml-3">
                <AlertTitle className="font-bold text-lg">{isSuccess ? 'Analysis Successful' : `Failure: ${simulationResult.failureReason} Limit Reached`}</AlertTitle>
                <AlertDescription className="mt-1">{simulationResult.details}</AlertDescription>
              </div>
            </div>
          </Alert>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultMetric icon={Gauge} label="Max Safe Current" value={simulationResult.maxSafeCurrent.toFixed(2)} unit="A" />
            <ResultMetric icon={Thermometer} label="Final Temperature" value={simulationResult.finalTemperature.toFixed(2)} unit="°C" />
            <ResultMetric icon={Zap} label="Power Dissipation" value={simulationResult.powerDissipation.toFixed(2)} unit="W" />
          </div>
        </CardContent>
      </Card>

      {aiCalculatedResults && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">AI-Calculated Safe Limits</CardTitle>
            <CardDescription>AI-powered estimation based on the datasheet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ResultMetric icon={Gauge} label="Expected Max Current" value={aiCalculatedResults.expectedMaxCurrent.toFixed(2)} unit="A" />
                <ResultMetric icon={Thermometer} label="Expected Max Temp" value={aiCalculatedResults.expectedMaxTemperature.toFixed(2)} unit="°C" />
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground italic"><strong className="text-foreground not-italic">AI Reasoning:</strong> {aiCalculatedResults.reasoning}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {aiOptimizationSuggestions && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">AI Optimization Advisor</CardTitle>
            <CardDescription>Suggestions to improve performance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {aiOptimizationSuggestions.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start">
                    <Lightbulb className="h-5 w-5 text-accent mr-3 mt-1 flex-shrink-0" />
                    <span>{suggestion}</span>
                </li>
              ))}
            </ul>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground pt-2 italic"><strong className="text-foreground not-italic">AI Reasoning:</strong> {aiOptimizationSuggestions.reasoning}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
