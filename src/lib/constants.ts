import type { CoolingMethod, PredefinedTransistor } from './types';

export const coolingMethods: CoolingMethod[] = [
  // Air Cooling
  { name: 'Basic Air Cooling', value: 'air-basic', thermalResistance: 5.0, coolingBudget: 20 },
  { name: 'Tower Air Cooler', value: 'air-tower', thermalResistance: 1.5, coolingBudget: 45 },
  { name: 'Low Profile Air Cooler', value: 'air-low-profile', thermalResistance: 3.0, coolingBudget: 30 },
  { name: 'Premium Air Cooler', value: 'air-premium', thermalResistance: 1.2, coolingBudget: 60 },
  { name: 'Industrial Heatsink', value: 'air-industrial', thermalResistance: 2.5, coolingBudget: 40 },
  // AIO Water Cooling
  { name: '120mm AIO', value: 'aio-120', thermalResistance: 0.8, coolingBudget: 150 },
  { name: '240mm AIO', value: 'aio-240', thermalResistance: 0.5, coolingBudget: 250 },
  { name: '280mm AIO', value: 'aio-280', thermalResistance: 0.4, coolingBudget: 300 },
  { name: '360mm AIO', value: 'aio-360', thermalResistance: 0.3, coolingBudget: 350 },
  // Custom Water Cooling
  { name: 'Basic Custom Loop', value: 'custom-loop-basic', thermalResistance: 0.25, coolingBudget: 500 },
  { name: 'Premium Custom Loop', value: 'custom-loop-premium', thermalResistance: 0.08, coolingBudget: 1000 },
  { name: 'Extreme Custom Loop', value: 'custom-loop-extreme', thermalResistance: 0.05, coolingBudget: 1500 },
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
      rthJC: '1.5', // °C/W
      maxTemperature: '175',
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
      rthJC: '312.5',
      maxTemperature: '150',
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
      rthJC: '1.36',
      maxTemperature: '175',
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
      rthJC: '150',
      maxTemperature: '150',
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
      rthJC: '3.12',
      maxTemperature: '150',
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

    