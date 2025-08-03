"use client";

import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, Upload, SlidersHorizontal } from 'lucide-react';
import React, { useRef } from 'react';
import { coolingMethods, predefinedTransistors } from '@/lib/constants';

interface SimulationFormProps {
  form: UseFormReturn<any>;
  onSubmit: (values: any) => void;
  isPending: boolean;
  onTransistorSelect: (value: string) => void;
}

export default function SimulationForm({ form, onSubmit, isPending, onTransistorSelect }: SimulationFormProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const selectedCoolingMethod = coolingMethods.find(m => m.value === form.watch('coolingMethod'));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Device & Specifications</CardTitle>
            <CardDescription>Select a predefined component, upload a datasheet, or enter specs manually.</CardDescription>
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
              name="inputMode"
              render={({ field }) => (
                <FormItem className="pt-2">
                   <Tabs defaultValue={field.value} onValueChange={field.onChange} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="datasheet"><Upload className="mr-2"/> Datasheet</TabsTrigger>
                          <TabsTrigger value="manual"><SlidersHorizontal className="mr-2"/> Manual</TabsTrigger>
                      </TabsList>
                      <TabsContent value="datasheet" className="pt-4">
                          <FormField
                              control={form.control}
                              name="datasheet"
                              render={({ field: fileField }) => (
                                  <FormItem>
                                      <FormLabel>Datasheet (PDF)</FormLabel>
                                      <FormControl>
                                          <div>
                                              <Input
                                                  type="file"
                                                  accept=".pdf"
                                                  ref={fileInputRef}
                                                  className="hidden"
                                                  onChange={(e) => fileField.onChange(e.target.files?.[0])}
                                              />
                                              <Button
                                                  type="button"
                                                  variant="outline"
                                                  className="w-full justify-start text-left font-normal bg-white/5"
                                                  onClick={() => fileInputRef.current?.click()}
                                              >
                                                  <Upload className="mr-2 h-4 w-4" />
                                                  {fileField.value ? fileField.value.name : 'Upload PDF'}
                                              </Button>
                                          </div>
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                      </TabsContent>
                      <TabsContent value="manual" className="pt-1">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                              <FormField
                                control={form.control}
                                name="maxCurrent"
                                render={({ field: manualField }) => (
                                  <FormItem>
                                    <FormLabel>Max Current (A)</FormLabel>
                                    <FormControl><Input type="number" step="any" placeholder="e.g., 8" {...manualField} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="maxVoltage"
                                render={({ field: manualField }) => (
                                  <FormItem>
                                    <FormLabel>Max Voltage (V)</FormLabel>
                                    <FormControl><Input type="number" step="any" placeholder="e.g., 30" {...manualField} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="powerDissipation"
                                render={({ field: manualField }) => (
                                  <FormItem>
                                    <FormLabel>Max Power (W)</FormLabel>
                                    <FormControl><Input type="number" step="any" placeholder="e.g., 0.625" {...manualField} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                               <FormField
                                control={form.control}
                                name="rdsOn"
                                render={({ field: manualField }) => (
                                  <FormItem>
                                    <FormLabel>RDS(on) (&#8486;)</FormLabel>
                                    <FormControl><Input type="number" step="any" placeholder="e.g., 0.018" {...manualField} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="riseTime"
                                render={({ field: manualField }) => (
                                  <FormItem>
                                    <FormLabel>Rise Time (ns)</FormLabel>
                                    <FormControl><Input type="number" step="any" placeholder="e.g., 50" {...manualField} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="fallTime"
                                render={({ field: manualField }) => (
                                  <FormItem>
                                    <FormLabel>Fall Time (ns)</FormLabel>
                                    <FormControl><Input type="number" step="any" placeholder="e.g., 50" {...manualField} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
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
            <CardTitle>Simulation Constraints</CardTitle>
            <CardDescription>Set the operational limits for the simulation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <FormField
                control={form.control}
                name="switchingFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Switching Frequency (kHz)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <FormField
              control={form.control}
              name="coolingMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cooling Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a cooling method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {coolingMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                           <div className="flex justify-between w-full">
                                <span>{method.name}</span>
                                <span className="text-muted-foreground ml-4">{method.coolingBudget}W Budget</span>
                            </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                   {selectedCoolingMethod && <FormDescription>Thermal Resistance: {selectedCoolingMethod.thermalResistance} K/W</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxTemperature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Junction Temp (°C)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="125" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full text-base font-semibold bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Run Analysis'
          )}
        </Button>
      </form>
    </Form>
  );
}
