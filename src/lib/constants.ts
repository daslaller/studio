import type { CoolingMethod, PredefinedTransistor } from './types';

export const coolingMethods: CoolingMethod[] = [
  // Air Cooling - Low Profile
  { name: 'Noctua NH-L9i/a', value: 'air-nh-l9', thermalResistance: 3.5, coolingBudget: 95 },
  { name: 'Cryorig C7', value: 'air-c7', thermalResistance: 3.2, coolingBudget: 100 },
  { name: 'Scythe Big Shuriken 3', value: 'air-shuriken-3', thermalResistance: 2.8, coolingBudget: 125 },

  // Air Cooling - Mid-Range Tower
  { name: 'Cooler Master Hyper 212 EVO', value: 'air-hyper-212', thermalResistance: 2.0, coolingBudget: 150 },
  { name: 'be quiet! Pure Rock 2', value: 'air-pure-rock-2', thermalResistance: 1.8, coolingBudget: 150 },
  { name: 'ARCTIC Freezer 34 eSports DUO', value: 'air-freezer-34', thermalResistance: 1.6, coolingBudget: 210 },
  
  // Air Cooling - High-End Tower
  { name: 'Noctua NH-D15', value: 'air-nh-d15', thermalResistance: 1.1, coolingBudget: 220 },
  { name: 'be quiet! Dark Rock Pro 4', value: 'air-dark-rock-pro-4', thermalResistance: 1.0, coolingBudget: 250 },
  { name: 'Deepcool Assassin IV', value: 'air-assassin-iv', thermalResistance: 0.95, coolingBudget: 280 },
  
  // AIO Water Cooling
  { name: 'Corsair H60 (120mm)', value: 'aio-120-h60', thermalResistance: 0.8, coolingBudget: 170 },
  { name: 'ARCTIC Liquid Freezer III (240mm)', value: 'aio-240-lf3', thermalResistance: 0.5, coolingBudget: 280 },
  { name: 'Corsair H115i (280mm)', value: 'aio-280-h115i', thermalResistance: 0.45, coolingBudget: 320 },
  { name: 'Lian Li Galahad (360mm)', value: 'aio-360-galahad', thermalResistance: 0.35, coolingBudget: 360 },
  { name: 'EK-Nucleus AIO CR360 Lux (360mm)', value: 'aio-360-ek-nucleus', thermalResistance: 0.3, coolingBudget: 400 },
  { name: 'ARCTIC Liquid Freezer III (420mm)', value: 'aio-420-lf3', thermalResistance: 0.25, coolingBudget: 450 },

  // Custom Water Cooling
  { name: 'Custom Loop (Single 240mm Slim Rad)', value: 'custom-loop-single-240', thermalResistance: 0.28, coolingBudget: 450 },
  { name: 'Custom Loop (Single 360mm Thick Rad)', value: 'custom-loop-single-360', thermalResistance: 0.15, coolingBudget: 700 },
  { name: 'Custom Loop (Dual 360mm Rads)', value: 'custom-loop-dual-360', thermalResistance: 0.08, coolingBudget: 1200 },
  { name: 'Custom Loop (Dual 480mm Rads)', value: 'custom-loop-dual-480', thermalResistance: 0.06, coolingBudget: 1500 },
  { name: 'Extreme Custom Loop (Triple+ Rads)', value: 'custom-loop-extreme', thermalResistance: 0.04, coolingBudget: 2000 },

  // Exotic & Industrial Cooling
  { name: 'Industrial Heatsink (Large Passive)', value: 'industrial-passive', thermalResistance: 4.0, coolingBudget: 50 },
  { name: 'Thermoelectric Cooler (TEC/Peltier)', value: 'exotic-tec', thermalResistance: 0.15, coolingBudget: 800 },
  { name: 'Phase Change Cooling', value: 'exotic-phase-change', thermalResistance: 0.02, coolingBudget: 2500 },
  { name: 'Liquid Nitrogen (LN2 Pot)', value: 'exotic-ln2', thermalResistance: 0.001, coolingBudget: 5000 },
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
