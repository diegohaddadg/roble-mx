"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 bg-[var(--danger-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-[var(--danger)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-[var(--text)] mb-1">
          Algo salió mal
        </h2>
        <p className="text-sm text-[var(--muted)] mb-6">
          {error.message || "Ocurrió un error inesperado"}
        </p>
        <button
          onClick={reset}
          className="px-5 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
