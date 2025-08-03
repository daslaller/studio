# **App Name**: Ampere Analyzer

## Core Features:

- Device Search: Device lookup with a search button within the device name input field to allow for easy component data retrieval.
- AI Datasheet Reader: AI-powered PDF reader tool capable of extracting transistor specifications from datasheets based on the component name. This is a tool.
- Simulation Constraints: Configurable parameters for the simulation include cooling budget, max temperature and First-To-Fail, where the first parameter to hit it's limit will stop the simulation.
- AI Optimization Advisor: An AI powered suggestion tool offering insights for improvements such as lowering the frequency or better cooling to prevent failure or improve the outcome of the simulation. This is a tool.
- Dynamic Result Presentation: Displays comprehensive analysis, clearly showing the maximum safe current alongside the reasoning or limitations met, such as thermal limits, voltage limits, and/or current limits. Results shows what will fail first.
- Cooling Simulation: Selectable cooling methods with pre-defined thermal resistance values for different cooling solutions from basic air cooling to exotic liquid nitrogen setups.
- AI-Calculated Results: After a successful analysis, the program also shows AI-calculated results. These results are based upon what the AI thinks is correct for the given transistor. This is a tool.

## Style Guidelines:

- Primary color: Saturated blue (#4299E1), reflecting reliability and precision in engineering contexts.
- Background color: Dark gray (#2D3748) providing a professional backdrop that reduces eye strain and enhances the visibility of other elements.
- Accent color: Vibrant orange (#F6AD55), used to highlight important data points and interactive elements such as call-to-action buttons.
- Body and headline font: 'Inter' sans-serif for a modern, machined, objective look and feel, as well as readability.
- Icons should be minimalistic and geometric, using a single line weight. They will use the primary or accent color based on their importance.
- A grid-based layout providing a clear visual hierarchy. It should separate input parameters, real-time measurements, and the cooling selection UI, making it accessible and user-friendly.
- Subtle transitions and animations will be implemented. Use a 200ms fade transition.