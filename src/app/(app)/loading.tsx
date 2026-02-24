export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 bg-zinc-200/60 rounded-lg w-48" />
      <div className="h-4 bg-zinc-100 rounded w-72" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 bg-white rounded-2xl border border-zinc-100"
          />
        ))}
      </div>
      <div className="h-64 bg-white rounded-2xl border border-zinc-100" />
    </div>
  );
}
