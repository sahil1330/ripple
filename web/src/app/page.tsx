import { apiMode } from "@/lib/api";

// Ripple single-page UI (plan §8). Regions are placeholders until their issues land:
// graph canvas, before/after panel, time-to-harm queue, coverage meter, ask panel, demo mode.
export default function Home() {
  return (
    <main className="min-h-screen p-8 font-sans">
      <header className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-semibold">Ripple</h1>
        <span className="rounded bg-black/5 px-2 py-1 font-mono text-xs">API mode: {apiMode}</span>
      </header>
      <p className="mt-6 max-w-2xl text-sm opacity-80">
        The company brain that remembers what it told you, and comes back to fix it when the truth changes.
        Built on FalkorDB.
      </p>
      <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded border p-4 md:col-span-2">Graph canvas (coming soon)</div>
        <div className="rounded border p-4">Before / after and time-to-harm queue (coming soon)</div>
      </section>
    </main>
  );
}
