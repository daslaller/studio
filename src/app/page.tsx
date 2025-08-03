import AmpereAnalyzer from '@/components/app/ampere-analyzer';

export default function Home() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 opacity-70"></div>
      <div className="absolute inset-0 backdrop-blur-2xl"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      <div className="relative container mx-auto px-4 py-8 z-10">
        <AmpereAnalyzer />
      </div>
    </main>
  );
}
