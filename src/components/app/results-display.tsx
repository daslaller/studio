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
    <div className="flex items-start space-x-4 rounded-lg p-3 bg-muted/50">
        <div className="flex-shrink-0">
            {React.createElement(icon, { className: "h-6 w-6 text-primary" })}
        </div>
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value} <span className="text-sm font-normal text-muted-foreground">{unit}</span></p>
        </div>
    </div>
);

export default function ResultsDisplay({ isLoading, simulationResult, aiCalculatedResults, aiOptimizationSuggestions }: ResultsDisplayProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!simulationResult) {
    return (
      <Card className="flex flex-col items-center justify-center h-full p-8 text-center border-dashed">
        <Bot className="h-16 w-16 text-muted-foreground mb-4" />
        <CardTitle>Awaiting Analysis</CardTitle>
        <CardDescription className="mt-2">
          Fill out the form and click "Run Analysis" to see the results.
        </CardDescription>
      </Card>
    );
  }

  const isSuccess = simulationResult.status === 'success';

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-200">
      <Card>
        <CardHeader>
          <CardTitle>Simulation Outcome</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant={isSuccess ? 'default' : 'destructive'} className={isSuccess ? 'bg-green-500/10 border-green-500/50' : ''}>
            {isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <AlertTitle>{isSuccess ? 'Analysis Successful' : `Failure: ${simulationResult.failureReason} Limit Reached`}</AlertTitle>
            <AlertDescription>{simulationResult.details}</AlertDescription>
          </Alert>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultMetric icon={Gauge} label="Max Safe Current" value={simulationResult.maxSafeCurrent.toFixed(2)} unit="A" />
            <ResultMetric icon={Thermometer} label="Final Temperature" value={simulationResult.finalTemperature.toFixed(2)} unit="°C" />
            <ResultMetric icon={Zap} label="Power Dissipation" value={simulationResult.powerDissipation.toFixed(2)} unit="W" />
          </div>
        </CardContent>
      </Card>

      {aiCalculatedResults && (
        <Card>
          <CardHeader>
            <CardTitle>AI-Calculated Safe Limits</CardTitle>
            <CardDescription>AI-powered estimation based on the datasheet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ResultMetric icon={Gauge} label="Expected Max Current" value={aiCalculatedResults.expectedMaxCurrent.toFixed(2)} unit="A" />
                <ResultMetric icon={Thermometer} label="Expected Max Temp" value={aiCalculatedResults.expectedMaxTemperature.toFixed(2)} unit="°C" />
            </div>
            <p className="text-sm text-muted-foreground pt-2 italic"><strong>Reasoning:</strong> {aiCalculatedResults.reasoning}</p>
          </CardContent>
        </Card>
      )}

      {aiOptimizationSuggestions && (
        <Card>
          <CardHeader>
            <CardTitle>AI Optimization Advisor</CardTitle>
            <CardDescription>Suggestions to improve performance.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 list-disc list-inside">
              {aiOptimizationSuggestions.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start">
                    <Lightbulb className="h-4 w-4 text-accent mr-2 mt-1 flex-shrink-0" />
                    <span>{suggestion}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground pt-4 italic"><strong>Reasoning:</strong> {aiOptimizationSuggestions.reasoning}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
