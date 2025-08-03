"use client";

import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Upload, SlidersHorizontal, Package, Thermometer, Zap, ShieldAlert, Power } from 'lucide-react';
import React, { useRef } from 'react';
import { coolingMethods, predefinedTransistors, transistorTypes } from '@/lib/constants';
import { Checkbox } from '../ui/checkbox';

interface SimulationFormProps {
  form: UseFormReturn<any>;
  onSubmit: (values: any) => void;
  isPending: boolean;
  onTransistorSelect: (value: string) => void;
}

const isMosfetType = (type: string) => {
    return type.includes('MOSFET') || type.includes('GaN');
};

export default function SimulationForm({ form, onSubmit, isPending, onTransistorSelect }: SimulationFormProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const selectedCoolingMethod = coolingMethods.find(m => m.value === form.watch('coolingMethod'));
    const currentTransistorType = form.watch('transistorType');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="text-primary"/> Device & Specifications</CardTitle>
            <CardDescription>Select a predefined component or enter specs manually.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <FormField
                control={form.control}
                name="predefinedComponent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Predefined Component</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      onTransistorSelect(value);
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a predefined transistor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {predefinedTransistors.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="componentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device Name</FormLabel>
                    <FormControl><Input placeholder="e.g. IRFZ44N" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <FormField
              control={form.control}
              name="inputMode"
              render={({ field }) => (
                <FormItem className="pt-2">
                   <Tabs defaultValue={field.value} onValueChange={(val) => {
                       field.onChange(val);
                       if (val === 'datasheet') {
                           form.reset({
                               ...form.getValues(),
                               inputMode: 'datasheet',
                               predefinedComponent: undefined,
                           });
                       }
                   }} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="datasheet" disabled><Upload className="mr-2"/> Datasheet (soon)</TabsTrigger>
                          <TabsTrigger value="manual"><SlidersHorizontal className="mr-2"/> Manual Input</TabsTrigger>
                      </TabsList>
                      <TabsContent value="manual" className="pt-1">
                           <div className="space-y-4 pt-4">
                               <FormField
                                  control={form.control}
                                  name="transistorType"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Transistor Type</FormLabel>
                                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                                              <FormControl>
                                                  <SelectTrigger><SelectValue placeholder="Select transistor type..." /></SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                  {transistorTypes.map(type => (
                                                      <SelectItem key={type} value={type}>{type}</SelectItem>
                                                  ))}
                                              </SelectContent>
                                          </Select>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {isMosfetType(currentTransistorType) ? (
                                    <FormField control={form.control} name="rdsOn" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>RDS(on) (m&#8486;)</FormLabel>
                                            <FormControl><Input type="number" step="any" placeholder="e.g., 17.5" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                ) : (
                                    <FormField control={form.control} name="vceSat" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Vce(sat) (V)</FormLabel>
                                            <FormControl><Input type="number" step="any" placeholder="e.g., 1.2" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                )}
                                <FormField control={form.control} name="rthJC" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Rth (j-c) (°C/W)</FormLabel>
                                        <FormControl><Input type="number" step="any" placeholder="e.g., 1.5" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="maxCurrent" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Max Current (A)</FormLabel>
                                    <FormControl><Input type="number" step="any" placeholder="e.g., 49" {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                                <FormField control={form.control} name="maxVoltage" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Max Voltage (V)</FormLabel>
                                    <FormControl><Input type="number" step="any" placeholder="e.g., 55" {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                                <FormField control={form.control} name="riseTime" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Rise Time (ns)</FormLabel>
                                    <FormControl><Input type="number" step="any" placeholder="e.g., 60" {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                                <FormField control={form.control} name="fallTime" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Fall Time (ns)</FormLabel>
                                    <FormControl><Input type="number" step="any" placeholder="e.g., 45" {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                                <FormField control={form.control} name="powerDissipation" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Max Power (W)</FormLabel>
                                    <FormControl><Input type="number" step="any" placeholder="e.g., 94" {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                              </div>
                           </div>
                      </TabsContent>
                   </Tabs>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Thermometer className="text-primary"/> Simulation Constraints</CardTitle>
            <CardDescription>Set the operational limits for the simulation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="switchingFrequency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Switching Frequency (kHz)</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g., 100" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="coolingMethod" render={({ field }) => (
              <FormItem>
                <FormLabel>Cooling Method</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a cooling method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="air-basic">Basic Air Cooling (Heatsink)</SelectItem>
                      <SelectItem value="air-tower">Tower Air Cooler</SelectItem>
                      <SelectItem value="air-low-profile">Low Profile Air Cooler</SelectItem>
                      <SelectItem value="air-premium">Premium Air Cooler</SelectItem>
                      <SelectItem value="air-industrial">Industrial Heatsink</SelectItem>
                    </SelectGroup>
                     <SelectGroup>
                        <SelectItem value="aio-120">120mm AIO Water Cooler</SelectItem>
                        <SelectItem value="aio-240">240mm AIO Water Cooler</SelectItem>
                        <SelectItem value="aio-280">280mm AIO Water Cooler</SelectItem>
                        <SelectItem value="aio-360">360mm AIO Water Cooler</SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                        <SelectItem value="custom-loop-basic">Basic Custom Water Loop</SelectItem>
                        <SelectItem value="custom-loop-premium">Premium Custom Water Loop</SelectItem>
                        <SelectItem value="custom-loop-extreme">Extreme Custom Water Loop</SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                        <SelectItem value="exotic-tec">Thermoelectric Cooler (TEC)</SelectItem>
                        <SelectItem value="exotic-phase-change">Phase Change Cooling</SelectItem>
                        <SelectItem value="exotic-ln2">Liquid Nitrogen (LN2)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                  {selectedCoolingMethod && <FormDescription>Thermal Resistance (Case-to-Ambient): {selectedCoolingMethod.thermalResistance} °C/W</FormDescription>}
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="ambientTemperature" render={({ field }) => (
              <FormItem>
                <FormLabel>Ambient Temperature (°C)</FormLabel>
                <FormControl><Input type="number" placeholder="e.g., 25" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldAlert className="text-primary"/> First-To-Fail Limits</CardTitle>
                <CardDescription>The simulation will stop when the first of these limits is reached.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField control={form.control} name="maxTemperature" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Max Junction Temperature (°C)</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g. 150" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="enablePowerLimit" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 bg-white/5">
                         <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>Enable Max Power Loss Limit</FormLabel>
                            <FormDescription>End simulation if total power loss exceeds a set value.</FormDescription>
                        </div>
                    </FormItem>
                )} />

                {form.watch('enablePowerLimit') && (
                    <FormField control={form.control} name="maxPowerLoss" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Max Power Loss Limit (W)</FormLabel>
                            <FormControl><Input type="number" placeholder="e.g., 100" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                )}
            </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full text-base font-semibold bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
             <Zap className="mr-2"/>
          )}
           Run Analysis
        </Button>
      </form>
    </Form>
  );
}
