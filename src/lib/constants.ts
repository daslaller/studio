import type { CoolingMethod } from './types';

export const coolingMethods: CoolingMethod[] = [
  { name: 'No Cooling (Open Air)', value: 'no-cooling', thermalResistance: 80, coolingBudget: 2 },
  { name: 'Small Passive Heatsink', value: 'passive-small', thermalResistance: 50, coolingBudget: 5 },
  { name: 'Large Passive Heatsink', value: 'passive-large', thermalResistance: 30, coolingBudget: 15 },
  { name: 'Active Air Cooling (Fan & Heatsink)', value: 'active-air', thermalResistance: 10, coolingBudget: 100 },
  { name: 'Water Cooling', value: 'water-cooling', thermalResistance: 1, coolingBudget: 500 },
  { name: 'Liquid Nitrogen (Exotic)', value: 'ln2', thermalResistance: 0.1, coolingBudget: 2000 },
];
