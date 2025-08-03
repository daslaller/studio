import type { CoolingMethod } from './types';

export const coolingMethods: CoolingMethod[] = [
  { name: 'No Cooling (Open Air)', value: 'no-cooling', thermalResistance: 80 },
  { name: 'Small Passive Heatsink', value: 'passive-small', thermalResistance: 50 },
  { name: 'Large Passive Heatsink', value: 'passive-large', thermalResistance: 30 },
  { name: 'Active Air Cooling (Fan & Heatsink)', value: 'active-air', thermalResistance: 10 },
  { name: 'Water Cooling', value: 'water-cooling', thermalResistance: 1 },
  { name: 'Liquid Nitrogen (Exotic)', value: 'ln2', thermalResistance: 0.1 },
];
