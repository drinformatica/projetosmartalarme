import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listActiveAds } from "@/lib/ads.functions";

type Ad = {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
};

const ROTATE_MS = 6000;

export function AdsCarousel() {
  const list = useServerFn(listActiveAds);
  const [ads, setAds] = useState<Ad[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    list()
      .then((data) => setAds(data as Ad[]))
      .catch(() => setAds([]));
  }, [list]);

  useEffect(() => {
    if (ads.length < 2) return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % ads.length), ROTATE_MS);
    return () => window.clearInterval(t);
  }, [ads.length]);

  if (ads.length === 0) return null;

  const current = ads[idx];

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-block rounded-full bg-green-600 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
          Lançamento
        </span>
        <h2 className="text-lg font-bold text-slate-800">Veja agora esse lançamento</h2>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <a
          key={current.id}
          href={current.link_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={current.title}
          className="group block"
        >
          <div className="aspect-[16/9] w-full overflow-hidden bg-slate-50 sm:aspect-[21/9]">
            <img
              src={current.image_url}
              alt={current.title}
              loading="lazy"
              className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.01]"
            />
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm">
            <span className="line-clamp-1 font-semibold text-slate-700">{current.title}</span>
            <span className="whitespace-nowrap text-green-700 group-hover:underline">Saiba mais →</span>
          </div>
        </a>

        {ads.length > 1 && (
          <div className="pointer-events-none absolute bottom-16 left-0 right-0 flex justify-center gap-1.5">
            {ads.map((a, i) => (
              <button
                key={a.id}
                onClick={(e) => {
                  e.preventDefault();
                  setIdx(i);
                }}
                aria-label={`Ir para anúncio ${i + 1}`}
                className={`pointer-events-auto h-2 w-2 rounded-full transition ${
                  i === idx ? "bg-green-600" : "bg-white/80 ring-1 ring-slate-300"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
