"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="text-center py-20">
      <h2 className="text-xl font-bold text-zinc-900 mb-2">
        Algo salió mal
      </h2>
      <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
        {error.message || "Ocurrió un error inesperado"}
      </p>
      <button
        onClick={reset}
        className="px-6 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
