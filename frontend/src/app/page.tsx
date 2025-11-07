export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Dese Web Platform v6.8
        </h1>
        <p className="text-center text-gray-600 max-w-2xl mx-auto">
          Cloud-native planning suite powered by Next.js 14, TypeScript, Tailwind CSS, and live data from our GKE migration.
          Use the navigation to reach analytics dashboards, FinBot forecasts, and MuBot ingestion tools.
        </p>
      </div>
    </main>
  );
}
