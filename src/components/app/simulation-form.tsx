
"use client";

import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Upload, SlidersHorizontal, Package, Thermometer, Zap, ShieldAlert, Search } from 'lucide-react';
import React from 'react';
import { coolingMethods, predefinedTransistors, transistorTypes } from '@/lib/constants';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { AnimatePresence, motion } from 'framer-motion';

interface SimulationFormProps {
  form: UseFormReturn<any>;
  onSubmit: (values: any) => void;
  isPending: boolean;
  onTransistorSelect: (value: string) => void;
  onDatasheetLookup: () => void;
  setDatasheetFile: (file: File | null) => void;
}

const isMosfetType = (type: string) => {
    return type.includes('MOSFET') || type.includes('GaN');
};

const endConditionDescriptions: Record<string, string> = {
    ftf: "Default and most realistic mode. Stops when any limit (Temp, Current, Cooling Budget, etc.) is hit.",
    temp: "Isolates for thermal performance. Stops only when the Max Junction Temp is exceeded.",
    budget: "Isolates for cooler performance. Stops only when power loss exceeds the cooling budget.",
};

export default function SimulationForm({ form, onSubmit, isPending, onTransistorSelect, onDatasheetLookup, setDatasheetFile }: SimulationFormProps) {
    const selectedCoolingMethod = coolingMethods.find(m => m.value === form.watch('coolingMethod'));
    const currentTransistorType = form.watch('transistorType');
    const simulationMode = form.watch('simulationMode');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="text-primary"/> Device & Specifications</CardTitle>
            <CardDescription>Select a component, upload a datasheet, or use the AI to search for one.</CardDescription>
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
                    <FormDescription>Select a component to auto-fill its specs.</FormDescription>
                  </FormItem>
                )}
              />
             <div className="text-center text-xs text-muted-foreground">OR</div>
             <FormField
                control={form.control}
                name="componentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device Name</FormLabel>
                    <div className="flex gap-2">
                        <FormControl><Input placeholder="e.g. IRFZ44N" {...field} value={field.value ?? ''} /></FormControl>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button type="button" onClick={onDatasheetLookup} disabled={isPending} aria-label="Look up datasheet">
                                  <Search />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Search online or parse uploaded PDF</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
             <FormField
              control={form.control}
              name="datasheet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Upload Datasheet (Optional)</FormLabel>
                  <FormControl>
                     <Input 
                        type="file" 
                        accept=".pdf"
                        onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            field.onChange(file);
                            setDatasheetFile(file);
                        }}
                        />
                  </FormControl>
                  <FormDescription>If you provide a PDF, the AI will use it instead of searching online.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  <div className='flex items-center gap-2'>
                    <SlidersHorizontal className='h-4 w-4' />
                    Advanced Specifications
                  </div>
                </AccordionTrigger>
                <AccordionContent>
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
                       <FormField control={form.control} name="powerDissipation" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Power (W)</FormLabel>
                          <FormControl><Input type="number" step="any" placeholder="e.g., 94" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="maxTemperature" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Max Junction Temp (°C)</FormLabel>
                            <FormControl><Input type="number" placeholder="e.g. 150" {...field} /></FormControl>
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
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Thermometer className="text-primary"/> Simulation Constraints</CardTitle>
            <CardDescription>Set the operational environment and failure limits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="switchingFrequency" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Switching Frequency (kHz)</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g., 100" {...field} /></FormControl>
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
            </div>
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
                    {Object.entries({
                        'Air Cooling': coolingMethods.filter(c => c.value.startsWith('air')),
                        'AIO Water Cooling': coolingMethods.filter(c => c.value.startsWith('aio')),
                        'Custom Water Cooling': coolingMethods.filter(c => c.value.startsWith('custom-loop')),
                        'Exotic Cooling': coolingMethods.filter(c => c.value.startsWith('exotic')),
                    }).map(([group, options]) => (
                        <SelectGroup key={group}>
                            <SelectLabel>{group}</SelectLabel>
                            {options.map(method => (
                                <SelectItem key={method.value} value={method.value}>
                                    <div className="flex justify-between w-full">
                                        <span>{method.name}</span>
                                        <span className="text-muted-foreground ml-4">{method.coolingBudget}W</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                  {selectedCoolingMethod && <FormDescription>Thermal Resistance (Case-to-Ambient): {selectedCoolingMethod.thermalResistance} °C/W</FormDescription>}
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldAlert className="text-primary"/> Simulation End Condition</CardTitle>
                <CardDescription>Choose what limit will stop the simulation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="simulationMode"
                    render={({ field }) => (
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2">
                           <FormItem className="flex items-center space-x-2">
                               <FormControl>
                                   <RadioGroupItem value="ftf" id="ftf" />
                               </FormControl>
                               <FormLabel htmlFor="ftf" className="font-normal text-xs sm:text-sm">First-To-Fail</FormLabel>
                           </FormItem>
                           <FormItem className="flex items-center space-x-2">
                               <FormControl>
                                   <RadioGroupItem value="temp" id="temp" />
                               </FormControl>
                               <FormLabel htmlFor="temp" className="font-normal text-xs sm:text-sm">Temperature Limit</FormLabel>
                           </FormItem>
                           <FormItem className="flex items-center space-x-2">
                               <FormControl>
                                   <RadioGroupItem value="budget" id="budget" />
                               </FormControl>
                               <FormLabel htmlFor="budget" className="font-normal text-xs sm:text-sm">Cooling Budget</FormLabel>
                           </FormItem>
                        </RadioGroup>
                    )}
                />
                 
                <div className="relative min-h-[60px]">
                    <AnimatePresence initial={false}>
                        <motion.div
                            key={simulationMode}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="p-3 bg-white/5 rounded-md border border-white/10"
                        >
                            <p className='text-sm text-muted-foreground'>{endConditionDescriptions[simulationMode]}</p>
                        </motion.div>
                    </AnimatePresence>
                </div>
                 
                 {simulationMode === 'budget' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <FormField control={form.control} name="coolingBudget" render={({ field }) => (
                            <FormItem className="mt-4">
                                <FormLabel>Manual Cooling Budget (W)</FormLabel>
                                <FormControl><Input type="number" placeholder={`e.g., ${selectedCoolingMethod?.coolingBudget || 250}`} {...field} /></FormControl>
                                <FormDescription>Override the selected cooler's budget.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </motion.div>
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
             <>
                <Zap className="mr-2 h-5 w-5"/>
                Run Analysis
             </>
          )}
        </Button>
      </form>
    </Form>
  );
}

