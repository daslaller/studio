
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import type { LiveDataPoint } from '@/lib/types';
import { Info } from 'lucide-react';

interface LiveSimulationViewProps {
  liveData: LiveDataPoint[];
  simulationMode: 'ftf' | 'temp' | 'budget';
  maxTemperature: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-background/80 border border-border rounded-lg shadow-lg">
        <p className="label text-sm font-bold">{`Current: ${payload[0].payload.current.toFixed(2)} A`}</p>
        <p className="intro text-xs text-primary">{`Temperature: ${payload[0].value.toFixed(2)} °C`}</p>
        <p className="intro text-xs text-red-400">{`Power Loss: ${payload[0].payload.powerLoss.toFixed(2)} W`}</p>
      </div>
    );
  }
  return null;
};

export default function LiveSimulationView({ liveData, simulationMode, maxTemperature }: LiveSimulationViewProps) {
    const lastPoint = liveData.length > 0 ? liveData[liveData.length - 1] : {
        current: 0,
        temperature: 0,
        powerLoss: 0,
        conductionLoss: 0,
        switchingLoss: 0,
        progress: 0,
    };
    const progress = lastPoint ? lastPoint.progress : 0;
    
    const progressLabelMap = {
        ftf: "Progress to First Limit",
        temp: "Progress to Temp Limit",
        budget: "Progress to Budget Limit"
    };

    const progressDescriptionMap = {
        ftf: "Test will stop when any parameter (temp, power, budget, etc.) exceeds its limit.",
        temp: `Test will stop when junction temperature exceeds ${maxTemperature}°C.`,
        budget: `Test will stop when total power loss exceeds the defined cooling budget.`
    };

    const barChartData = [
        { name: 'Current (A)', value: lastPoint.current, fill: 'var(--color-current)' },
        { name: 'Junction Temp (°C)', value: lastPoint.temperature, fill: 'var(--color-temp)' },
        { name: 'Total Heat (W)', value: lastPoint.powerLoss, fill: 'var(--color-heat)' },
        { name: 'Conduction (W)', value: lastPoint.conductionLoss, fill: 'var(--color-conduction)' },
        { name: 'Switching (W)', value: lastPoint.switchingLoss, fill: 'var(--color-switching)' },
    ];
    
    return (
        <Card className="h-full bg-card/80 backdrop-blur-sm">
            <style jsx global>{`
                :root {
                    --color-current: hsl(var(--chart-1));
                    --color-temp: hsl(var(--chart-2));
                    --color-heat: hsl(var(--chart-3));
                    --color-conduction: hsl(var(--chart-4));
                    --color-switching: hsl(var(--chart-5));
                }
            `}</style>
            <CardHeader>
                <CardTitle>Live Analysis</CardTitle>
                <CardDescription>Visualizing simulation progress in real-time...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={liveData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                            <XAxis 
                                dataKey="current" 
                                type="number"
                                domain={['dataMin', 'dataMax']}
                                unit="A"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickFormatter={(val) => val.toFixed(1)}
                            />
                            <YAxis 
                                yAxisId="left" 
                                dataKey="temperature" 
                                unit="°C" 
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                            />
                            <Tooltip content={<CustomTooltip />}/>
                            <Area 
                                yAxisId="left" 
                                type="monotone" 
                                dataKey="temperature" 
                                stroke="hsl(var(--primary))"
                                fillOpacity={1} 
                                fill="url(#colorTemp)" 
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                
                 <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={barChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                            <XAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={0} angle={-30} textAnchor='end' height={60} />
                            <YAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip cursor={{fill: 'hsl(var(--muted) / 0.5)'}} contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                            <Bar dataKey="value" isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                
                <div>
                   <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">{progressLabelMap[simulationMode]}</span>
                        <span className="text-sm font-bold text-primary">{progress.toFixed(1)}%</span>
                   </div>
                   <Progress value={progress} className="w-full h-3" />
                   <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                        <Info className="h-3 w-3" />
                        {progressDescriptionMap[simulationMode]}
                   </p>
                </div>
            </CardContent>
        </Card>
    );
}
