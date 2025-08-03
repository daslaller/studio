"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { LiveDataPoint } from '@/lib/types';
import { Gauge, Power, Thermometer, Info } from 'lucide-react';

interface LiveSimulationViewProps {
  liveData: LiveDataPoint[];
  simulationMode: 'ftf' | 'temp' | 'budget';
  maxTemperature: number;
}

const LiveMetric = ({ icon: Icon, label, value, unit, colorClass }: { icon: React.ElementType, label: string, value: string, unit: string, colorClass: string }) => (
    <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-lg text-center">
        <Icon className={`h-8 w-8 mb-2 ${colorClass}`} />
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label} ({unit})</p>
    </div>
);

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
    const lastPoint = liveData.length > 0 ? liveData[liveData.length - 1] : null;
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
    
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Live Analysis</CardTitle>
                <CardDescription>Visualizing simulation progress in real-time...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="w-full h-60">
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

                <div className="grid grid-cols-3 gap-4">
                    <LiveMetric icon={Gauge} label="Current" value={lastPoint?.current.toFixed(2) ?? '0.00'} unit="A" colorClass="text-green-400" />
                    <LiveMetric icon={Thermometer} label="Junction Temp" value={lastPoint?.temperature.toFixed(2) ?? '0.00'} unit="°C" colorClass="text-orange-400" />
                    <LiveMetric icon={Power} label="Power Loss" value={lastPoint?.powerLoss.toFixed(2) ?? '0.00'} unit="W" colorClass="text-red-400" />
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
