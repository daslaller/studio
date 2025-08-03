
"use client"
import AmpereAnalyzer from '@/components/app/ampere-analyzer';
import { useEffect, useState } from 'react';

const materialColors = [
  ['#311B92', '#512DA8', '#673AB7'], // Deep Purple
  ['#0D47A1', '#1976D2', '#2196F3'], // Blue
  ['#004D40', '#00796B', '#009688'], // Teal
  ['#880E4F', '#C2185B', '#E91E63'], // Pink
  ['#BF360C', '#E64A19', '#FF5722'], // Deep Orange
];

export default function Home() {
    const [colors, setColors] = useState(materialColors[0]);

    useEffect(() => {
        setColors(materialColors[Math.floor(Math.random() * materialColors.length)]);
    }, []);

    const pageStyle = {
        '--color1': colors[0],
        '--color2': colors[1],
        '--color3': colors[2],
    } as React.CSSProperties;

  return (
    <main className="relative min-h-screen w-full overflow-hidden" style={pageStyle}>
      <style jsx global>{`
        .animated-gradient {
            background: linear-gradient(-45deg, var(--color1), var(--color2), var(--color3));
            background-size: 400% 400%;
            animation: gradient 15s ease infinite;
        }

        @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
      `}</style>
      <div className="animated-gradient absolute inset-0 opacity-80"></div>
      <div className="absolute inset-0 backdrop-blur-2xl"></div>
      
      <div className="relative container mx-auto px-4 py-8 z-10">
        <AmpereAnalyzer />
      </div>
    </main>
  );
}
