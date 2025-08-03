
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { HistoryEntry } from "@/lib/types";
import { format } from "date-fns";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";

interface HistoryViewProps {
  history: HistoryEntry[];
  clearHistory: () => void;
}

export default function HistoryView({ history, clearHistory }: HistoryViewProps) {
  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Simulation History</CardTitle>
            <CardDescription>Review your past analysis results. Data is stored locally in your browser.</CardDescription>
        </div>
        <Button variant="destructive" size="sm" onClick={clearHistory} disabled={history.length === 0}>Clear History</Button>
      </CardHeader>
      <CardContent>
        {history.length > 0 ? (
          <ScrollArea className="h-[600px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Max Safe Current (A)</TableHead>
                  <TableHead className="text-right">Final Temp (°C)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.componentName}</TableCell>
                    <TableCell>{format(new Date(entry.timestamp), "PPp")}</TableCell>
                    <TableCell>
                      <Badge variant={entry.simulationResult.status === 'success' ? 'default' : 'destructive'} className={entry.simulationResult.status === 'success' ? 'bg-green-600' : ''}>
                        {entry.simulationResult.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{entry.simulationResult.maxSafeCurrent.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{entry.simulationResult.finalTemperature.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No simulation history found.</p>
            <p className="text-sm">Run an analysis to see your results here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
