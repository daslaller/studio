
"use client"
import AmpereAnalyzer from '@/components/app/ampere-analyzer';
import { useEffect, useState } from 'react';

// Vibrant color palette inspired by the user's reference image
const vibrantColors = [
  "#8E2DE2", // Purple
  "#4A00E0", // Blue/Purple
  "#FF0080", // Pink/Magenta
  "#00D2FF", // Light Blue
  "#F953C6", // Pink
  "#E44D26", // Orange
  "#6A11CB", // Another Purple
  "#2575FC"  // Royal Blue
];


function getRandomColors() {
    const shuffled = [...vibrantColors].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
}

export default function Home() {
    // Set initial state to null to avoid hydration mismatch
    const [gradientColors, setGradientColors] = useState<string[] | null>(null);

    useEffect(() => {
        // Set colors only on the client-side
        setGradientColors(getRandomColors());
    }, []);

    const pageStyle: React.CSSProperties = gradientColors ? {
        '--gradient-color-1': gradientColors[0],
        '--gradient-color-2': gradientColors[1],
        '--gradient-color-3': gradientColors[2],
    } as React.CSSProperties : {};

  return (
    <main style={pageStyle} className="relative min-h-screen w-full overflow-x-hidden animated-background">
      <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] dark:bg-bottom dark:border-b dark:border-slate-100/5"></div>
      
      <div className="relative container mx-auto px-4 py-8 z-10">
        <AmpereAnalyzer />
      </div>
    </main>
  );
}
