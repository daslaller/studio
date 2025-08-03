import type { CoolingMethod, PredefinedTransistor } from './types';

export const coolingMethods: CoolingMethod[] = [
  { name: 'No Cooling (Open Air)', value: 'no-cooling', thermalResistance: 80, coolingBudget: 2 },
  { name: 'Small Passive Heatsink', value: 'passive-small', thermalResistance: 50, coolingBudget: 5 },
  { name: 'Large Passive Heatsink', value: 'passive-large', thermalResistance: 30, coolingBudget: 15 },
  { name: 'Active Air Cooling (Fan & Heatsink)', value: 'active-air', thermalResistance: 10, coolingBudget: 100 },
  { name: 'Water Cooling', value: 'water-cooling', thermalResistance: 1, coolingBudget: 500 },
  { name: 'Liquid Nitrogen (Exotic)', value: 'ln2', thermalResistance: 0.1, coolingBudget: 2000 },
];

export const predefinedTransistors: PredefinedTransistor[] = [
  { 
    name: 'IRFZ44N (General Purpose)', 
    value: 'IRFZ44N',
    specs: {
      maxCurrent: '49',
      maxVoltage: '55',
      powerDissipation: '94',
      rdsOn: '0.0175',
      riseTime: '60',
      fallTime: '45',
    } 
  },
  { 
    name: '2N7000 (Small Signal)', 
    value: '2N7000',
    specs: {
      maxCurrent: '0.2',
      maxVoltage: '60',
      powerDissipation: '0.4',
      rdsOn: '5',
      riseTime: '20',
      fallTime: '20',
    } 
  },
  { 
    name: 'STP60NF06 (Automotive)', 
    value: 'STP60NF06',
    specs: {
      maxCurrent: '60',
      maxVoltage: '60',
      powerDissipation: '110',
      rdsOn: '0.014',
      riseTime: '100',
      fallTime: '35',
    } 
  },
  {
    name: 'BS170 (N-Channel MOSFET)',
    value: 'BS170',
    specs: {
      maxCurrent: '0.5',
      maxVoltage: '60',
      powerDissipation: '0.83',
      rdsOn: '1.2',
      riseTime: '10',
      fallTime: '10',
    }
  },
  {
    name: 'RFP30N06LE (Logic Level)',
    value: 'RFP30N06LE',
    specs: {
      maxCurrent: '30',
      maxVoltage: '60',
      powerDissipation: '60',
      rdsOn: '0.047',
      riseTime: '190',
      fallTime: '65',
    }
  }
];