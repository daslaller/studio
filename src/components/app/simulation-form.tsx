"use client";

import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Device & Datasheet</CardTitle>
            <CardDescription>Enter component details to begin analysis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="componentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Device Name</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input placeholder="e.g., 2N2222A" {...field} className="pr-10" />
                    </FormControl>
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
                  <FormLabel>Datasheet (PDF)</FormLabel>
                  <FormControl>
                    <>
                      <Input
                        type="file"
                        accept=".pdf"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={(e) => field.onChange(e.target.files?.[0])}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {field.value ? field.value.name : 'Upload PDF'}
                      </Button>
                    </>
                  </FormControl>
                  <FormMessage />
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
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isPending}>
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
