import type { CoolingMethod, PredefinedTransistor } from './types';

export const coolingMethods: CoolingMethod[] = [
  // Air Cooling
  { name: 'Basic Air Cooling (Heatsink)', value: 'air-basic', thermalResistance: 5.0, coolingBudget: 5 },
  { name: 'Tower Air Cooler (e.g., Noctua NH-D15)', value: 'air-tower', thermalResistance: 1.5, coolingBudget: 25 },
  { name: 'Low Profile Air Cooler (e.g., Noctua NH-L9)', value: 'air-low-profile', thermalResistance: 3.0, coolingBudget: 10 },
  { name: 'Premium Air Cooler (e.g., Dark Rock Pro 4)', value: 'air-premium', thermalResistance: 1.2, coolingBudget: 30 },
  { name: 'Industrial Heatsink', value: 'air-industrial', thermalResistance: 2.5, coolingBudget: 15 },
  // AIO Water Cooling
  { name: '120mm AIO Water Cooler', value: 'aio-120', thermalResistance: 0.8, coolingBudget: 150 },
  { name: '240mm AIO Water Cooler', value: 'aio-240', thermalResistance: 0.5, coolingBudget: 250 },
  { name: '280mm AIO Water Cooler', value: 'aio-280', thermalResistance: 0.4, coolingBudget: 300 },
  { name: '360mm AIO Water Cooler', value: 'aio-360', thermalResistance: 0.3, coolingBudget: 350 },
  // Custom Water Cooling
  { name: 'Basic Custom Water Loop (Single 240mm Rad)', value: 'custom-loop-basic', thermalResistance: 0.25, coolingBudget: 500 },
  { name: 'Premium Custom Water Loop (Dual 360mm Rads)', value: 'custom-loop-premium', thermalResistance: 0.08, coolingBudget: 1000 },
  { name: 'Extreme Custom Water Loop (Triple 360mm Rads)', value: 'custom-loop-extreme', thermalResistance: 0.05, coolingBudget: 1500 },
  // Exotic Cooling
  { name: 'Thermoelectric Cooler (TEC)', value: 'exotic-tec', thermalResistance: 0.15, coolingBudget: 800 },
  { name: 'Phase Change Cooling', value: 'exotic-phase-change', thermalResistance: 0.02, coolingBudget: 2000 },
  { name: 'Liquid Nitrogen (LN2)', value: 'exotic-ln2', thermalResistance: 0.001, coolingBudget: 5000 },
];


export const predefinedTransistors: PredefinedTransistor[] = [
  {
    name: 'IRFZ44N (General Purpose MOSFET)',
    value: 'IRFZ44N',
    specs: {
      transistorType: 'MOSFET (N-Channel)',
      maxCurrent: '49',
      maxVoltage: '55',
      powerDissipation: '94',
      rdsOn: '17.5', // in mOhms
      vceSat: '',
      riseTime: '60',
      fallTime: '45',
      rthJC: '1.5' // °C/W
    }
  },
  {
    name: '2N7000 (Small Signal MOSFET)',
    value: '2N7000',
    specs: {
      transistorType: 'MOSFET (N-Channel)',
      maxCurrent: '0.2',
      maxVoltage: '60',
      powerDissipation: '0.4',
      rdsOn: '5000', // 5 Ohms in mOhms
      vceSat: '',
      riseTime: '20',
      fallTime: '20',
      rthJC: '312.5'
    }
  },
  {
    name: 'STP60NF06 (Automotive MOSFET)',
    value: 'STP60NF06',
    specs: {
      transistorType: 'MOSFET (N-Channel)',
      maxCurrent: '60',
      maxVoltage: '60',
      powerDissipation: '110',
      rdsOn: '14',
      vceSat: '',
      riseTime: '100',
      fallTime: '35',
      rthJC: '1.36'
    }
  },
  {
    name: 'BS170 (N-Channel MOSFET)',
    value: 'BS170',
    specs: {
      transistorType: 'MOSFET (N-Channel)',
      maxCurrent: '0.5',
      maxVoltage: '60',
      powerDissipation: '0.83',
      rdsOn: '1200',
      vceSat: '',
      riseTime: '10',
      fallTime: '10',
      rthJC: '150'
    }
  },
  {
    name: 'TIP31C (NPN BJT)',
    value: 'TIP31C',
    specs: {
      transistorType: 'BJT (NPN)',
      maxCurrent: '3',
      maxVoltage: '100',
      powerDissipation: '40',
      rdsOn: '',
      vceSat: '1.2', // V
      riseTime: '30',
      fallTime: '25',
      rthJC: '3.12'
    }
  }
];

export const transistorTypes = [
    'MOSFET (N-Channel)',
    'MOSFET (P-Channel)',
    'SiC MOSFET',
    'GaN FET',
    'IGBT',
    'BJT (NPN)',
    'BJT (PNP)'
];
