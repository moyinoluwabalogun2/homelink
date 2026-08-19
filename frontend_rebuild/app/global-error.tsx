"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "grid",
          placeItems: "center",
          padding: 24,
          fontFamily: "Arial, sans-serif",
          color: "#111214",
          background: "#f6f6f4",
        }}
      >
        <main
          style={{
            width: "min(100%, 560px)",
            padding: 36,
            border: "1px solid #dcdedb",
            borderRadius: 24,
            background: "#ffffff",
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: "0 0 10px" }}>HomeLink needs a quick retry.</h1>
          <p style={{ margin: "0 0 22px", color: "#4c4f56" }}>
            A critical interface error occurred. Reload the application to
            continue.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 46,
              padding: "0 18px",
              border: 0,
              borderRadius: 12,
              color: "#ffffff",
              background: "#2563eb",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Reload HomeLink
          </button>
        </main>
      </body>
    </html>
  );
}