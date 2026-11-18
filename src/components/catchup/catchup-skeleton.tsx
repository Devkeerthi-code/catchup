/** Mirrors the result layout (header, score, TL;DR, timeline) while the catch-up loads. */
export function CatchUpSkeleton({ label = "Loading the catch-up" }: { label?: string }) {
  return (
    <main id="main" className="shell" aria-busy="true" aria-label={label}>
      <div className="cu-head">
        <div className="grid gap-4">
          <span className="sk h-4 w-40" />
          <span className="sk h-10 w-3/4" />
          <span className="sk h-4 w-2/3" />
          <div className="flex gap-2">
            <span className="sk h-9 w-28" />
            <span className="sk h-9 w-28" />
          </div>
        </div>
        <span className="sk h-40 rounded-lg" />
      </div>
      <div className="skeleton">
        <span className="sk h-6 w-24" />
        {[90, 80, 86, 70, 76].map((w) => (
          <span key={w} className="sk h-5" style={{ width: `${w}%` }} />
        ))}
      </div>
      <span className="sk mt-8 block h-56 rounded-lg" />
    </main>
  );
}
