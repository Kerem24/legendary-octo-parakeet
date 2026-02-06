import { useEffect, useMemo, useRef, useState } from "react";

type CryptoItem = {
  id: string;
  name: string;
  symbol: string;
  image: string;
  price: number;
  change_24h: number | null;
  market_cap: number | null;
};

type StreamPayload =
  | { status: "ok"; data: CryptoItem[] }
  | { status: "error"; message: string };

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1 ? 2 : 6,
  }).format(value);

const formatCompact = (value: number | null) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(value);

export default function App() {
  const [data, setData] = useState<CryptoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flashMap, setFlashMap] = useState<Record<string, "up" | "down" | null>>(
    {},
  );
  const previousPrices = useRef<Record<string, number>>({});

  useEffect(() => {
    const source = new EventSource("http://localhost:8000/api/crypto/stream");

    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as StreamPayload;
      if (payload.status === "error") {
        setError(payload.message);
        return;
      }

      setError(null);
      setData(payload.data);

      setFlashMap((current) => {
        const next: Record<string, "up" | "down" | null> = { ...current };
        payload.data.forEach((item) => {
          const previous = previousPrices.current[item.id];
          if (previous !== undefined && previous !== item.price) {
            next[item.id] = item.price > previous ? "up" : "down";
            setTimeout(() => {
              setFlashMap((latest) => ({ ...latest, [item.id]: null }));
            }, 600);
          }
          previousPrices.current[item.id] = item.price;
        });
        return next;
      });
    };

    source.onerror = () => {
      setError("Live connection lost. Attempting to reconnect...");
    };

    return () => {
      source.close();
    };
  }, []);

  const skeletons = useMemo(() => Array.from({ length: 10 }), []);
  const hasData = data.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
              Live Market
            </p>
            <h1 className="text-3xl font-semibold text-slate-50 sm:text-4xl">
              Crypto Pulse
            </h1>
          </div>
          <div className="rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-xs text-slate-400">
            Streaming updates every 10 seconds
          </div>
        </header>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 shadow-lg shadow-rose-500/10">
            {error}
          </div>
        ) : null}

        <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {!hasData
            ? skeletons.map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="animate-pulse rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-800" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 rounded-full bg-slate-800" />
                      <div className="h-3 w-16 rounded-full bg-slate-800" />
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="h-6 w-32 rounded-full bg-slate-800" />
                    <div className="h-4 w-24 rounded-full bg-slate-800" />
                  </div>
                </div>
              ))
            : data.map((coin) => {
                const flash = flashMap[coin.id];
                const flashClass =
                  flash === "up"
                    ? "ring-2 ring-emerald-400/70 shadow-[0_0_35px_rgba(16,185,129,0.45)]"
                    : flash === "down"
                      ? "ring-2 ring-rose-400/70 shadow-[0_0_35px_rgba(244,63,94,0.35)]"
                      : "ring-1 ring-slate-800";
                const changeClass =
                  coin.change_24h === null
                    ? "text-slate-400"
                    : coin.change_24h >= 0
                      ? "text-emerald-400"
                      : "text-rose-400";

                return (
                  <div
                    key={coin.id}
                    className={`rounded-3xl border border-slate-800/60 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 transition ${flashClass}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <img
                          src={coin.image}
                          alt={coin.name}
                          className="h-12 w-12 rounded-2xl bg-slate-800/60 p-2"
                        />
                        <div>
                          <p className="text-lg font-semibold text-slate-100">
                            {coin.name}
                          </p>
                          <p className="text-sm text-slate-400">
                            {coin.symbol}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${changeClass}`}>
                        {coin.change_24h === null
                          ? "—"
                          : `${coin.change_24h.toFixed(2)}%`}
                      </span>
                    </div>

                    <div className="mt-6">
                      <p className="text-2xl font-semibold text-white">
                        {formatCurrency(coin.price)}
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        Market Cap: {formatCompact(coin.market_cap)}
                      </p>
                    </div>
                  </div>
                );
              })}
        </section>
      </div>
    </div>
  );
}
