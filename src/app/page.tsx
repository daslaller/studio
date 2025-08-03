
"use client"
import AmpereAnalyzer from '@/components/app/ampere-analyzer';
import { useEffect, useState } from 'react';

// Material Design inspired color palette
const materialColors = [
    "#263238", // Blue Grey 900
    "#37474F", // Blue Grey 800
    "#01579B", // Light Blue 900
    "#0277BD", // Light Blue 800
    "#004D40", // Teal 900
    "#00695C", // Teal 800
    "#1A237E", // Indigo 900
    "#283593", // Indigo 800
    "#3E2723", // Brown 900
    "#4E342E", // Brown 800
    "#880E4F", // Pink 900
    "#AD1457", // Pink 800
    "#4A148C", // Purple 900
    "#6A1B9A", // Purple 800
    "#BF360C", // Deep Orange 900
    "#D84315", // Deep Orange 800
];

function getRandomColors() {
    const shuffled = [...materialColors].sort(() => 0.5 - Math.random());
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
