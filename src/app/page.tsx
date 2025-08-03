
"use client"
import AmpereAnalyzer from '@/components/app/ampere-analyzer';
import { useEffect, useState } from 'react';

// Lighter, complementary color palette
const vibrantColors = [
  "#81C784", // Light Green
  "#64B5F6", // Light Blue
  "#9575CD", // Deep Purple
  "#4DB6AC", // Teal
  "#7986CB", // Indigo
  "#F06292", // Light Pink
  "#FFD54F", // Amber
  "#BA68C8"  // Purple
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
