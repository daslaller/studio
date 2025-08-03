"use client";

import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, Upload } from 'lucide-react';
import React, { useRef } from 'react';
import { coolingMethods } from '@/lib/constants';

interface SimulationFormProps {
  form: UseFormReturn<any>;
  onSubmit: (values: any) => void;
  isPending: boolean;
}

export default function SimulationForm({ form, onSubmit, isPending }: SimulationFormProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const selectedCoolingMethod = coolingMethods.find(m => m.value === form.watch('coolingMethod'));


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Device & Specifications</CardTitle>
            <CardDescription>Enter component details via datasheet or manual input.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="componentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Device Name</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input placeholder="e.g., 2N2222A" {...field} className="pr-10 h-11 text-base" />
                    </FormControl>
                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  </div>
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
                          <TabsTrigger value="datasheet">Datasheet Upload</TabsTrigger>
                          <TabsTrigger value="manual">Manual Input</TabsTrigger>
                      </TabsList>
                      <TabsContent value="datasheet" className="pt-6">
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
                                                  className="w-full justify-start text-left font-normal h-11 text-base"
                                                  onClick={() => fileInputRef.current?.click()}
                                              >
                                                  <Upload className="mr-2 h-5 w-5" />
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
                          <div className="space-y-6 pt-6 p-1">
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
                                    <FormLabel>Power Dissipation (W)</FormLabel>
                                    <FormControl><Input type="number" step="any" placeholder="e.g., 0.625" {...manualField} /></FormControl>
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

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Simulation Constraints</CardTitle>
            <CardDescription>Set the operational limits for the simulation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="coolingMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cooling Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 text-base">
                        <SelectValue placeholder="Select a cooling method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {coolingMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value} className="py-2">
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
              name="coolingBudget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cooling Budget (W)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxTemperature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Temperature (°C)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="125" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full text-lg font-semibold bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
