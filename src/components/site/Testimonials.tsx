import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SHEETS } from "@/lib/site-config";

type Review = {
  name: string;
  rating: number;
  review: string;
  occasion: string;
  link?: string;
};

const FALLBACK: Review[] = [
  {
    name: "Priya Sharma",
    rating: 5,
    review:
      "Absolutely breathtaking bridal mehandi! The detail and patience were unmatched — every guest at my wedding asked who did it. The stain came out so deep and rich.",
    occasion: "Bridal",
  },
  {
    name: "Anita Krishnan",
    rating: 5,
    review:
      "Booked her for our family Karva Chauth and she was a joy to have over. Beautiful Arabic designs for everyone, finished on time. Will rebook every year.",
    occasion: "Festive",
  },
  {
    name: "Meera Iyer",
    rating: 5,
    review:
      "The most professional mehandi artist I've worked with. Pure natural henna, gorgeous traditional patterns, and she made my engagement day so special.",
    occasion: "Engagement",
  },
];

function parseSheetsResponse(text: string): Review[] {
  // Google Sheets gviz wraps JSON in /*O_o*/google.visualization.Query.setResponse({...});
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?/);
  if (!match) throw new Error("Unexpected response format");
  const json = JSON.parse(match[1]);
  const rows: Array<{ c: Array<{ v: string | number | null } | null> }> = json.table.rows ?? [];
  return rows
    .map((row) => {
      const c = row.c;
      const name = c[0]?.v?.toString() ?? "";
      const rating = Number(c[1]?.v ?? 5);
      const review = c[2]?.v?.toString() ?? "";
      const occasion = c[3]?.v?.toString() ?? "";
      const link = c[4]?.v?.toString();
      return { name, rating: Math.max(1, Math.min(5, rating)), review, occasion, link };
    })
    .filter((r) => r.name && r.review);
}

const stars = (n: number) => "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(n);

function Card({ r, delay }: { r: Review; delay: number }) {
  return (
    <article
      className="bg-cream rounded-2xl p-7 shadow-[var(--shadow-soft)] border border-border flex flex-col h-full animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-gold text-xl tracking-widest mb-4" aria-label={`${r.rating} out of 5 stars`}>
        {stars(r.rating)}
      </div>
      <p className="text-brown leading-relaxed mb-6 flex-1 font-display text-lg italic">
        "{r.review}"
      </p>
      <div className="border-t border-gold/20 pt-4">
        <p className="font-sans font-medium text-brown">
          {r.link ? (
            <a
              href={r.link}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-terracotta-dark underline-offset-4 hover:underline"
            >
              {r.name}
            </a>
          ) : (
            r.name
          )}
        </p>
        {r.occasion && (
          <p className="text-xs uppercase tracking-widest text-terracotta-dark mt-1">{r.occasion}</p>
        )}
      </div>
    </article>
  );
}

function Skeleton() {
  return (
    <div className="bg-cream rounded-2xl p-7 border border-border h-64">
      <div className="h-4 w-24 skeleton rounded mb-4" />
      <div className="h-3 w-full skeleton rounded mb-2" />
      <div className="h-3 w-full skeleton rounded mb-2" />
      <div className="h-3 w-3/4 skeleton rounded mb-6" />
      <div className="h-4 w-32 skeleton rounded" />
    </div>
  );
}

export default function Testimonials() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [activeMobile, setActiveMobile] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (SHEETS.sheetId === "YOUR_SHEET_ID") {
        setReviews(FALLBACK);
        return;
      }
      try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEETS.sheetId}/gviz/tq?tqx=out:json&sheet=${SHEETS.sheetName}`;
        const res = await fetch(url);
        const text = await res.text();
        const parsed = parseSheetsResponse(text);
        if (!cancelled) setReviews(parsed.length ? parsed : FALLBACK);
      } catch (err) {
        // Silent graceful fallback — site never breaks if sheet is offline.
        console.warn("Testimonials fetch failed, using fallback:", err);
        if (!cancelled) setReviews(FALLBACK);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-rotate mobile carousel.
  useEffect(() => {
    if (!reviews || reviews.length <= 1 || isPaused) return;
    const t = setInterval(() => {
      setActiveMobile((i) => (i + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(t);
  }, [reviews, isPaused]);

  const handleManualNavigation = (newIndex: number) => {
    setActiveMobile(newIndex);
    setIsPaused(true);
    // Resume auto-rotation after 8 seconds of manual interaction
    const timer = setTimeout(() => {
      setIsPaused(false);
    }, 8000);
    return () => clearTimeout(timer);
  };

  return (
    <section id="testimonials" className="py-24 md:py-32 bg-cream-dark ornament-bg" aria-label="Testimonials">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-14">
          <p className="divider-ornament font-sans uppercase tracking-[0.3em] text-xs text-terracotta-dark mb-4">
            Kind Words
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-brown mb-4">
            From the hands I've had the <em className="text-terracotta-dark">honour</em> to adorn
          </h2>
        </div>

        {!reviews ? (
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        ) : (
          <>
            {/* Desktop grid */}
            <div className="hidden md:grid md:grid-cols-3 gap-6">
              {reviews.slice(0, 6).map((r, i) => (
                <Card key={`${r.name}-${i}`} r={r} delay={i * 100} />
              ))}
            </div>
            {/* Mobile carousel */}
            <div className="md:hidden">
              <Card r={reviews[activeMobile]} delay={0} />
              <div className="flex justify-center items-center gap-4 mt-6">
                <button
                  onClick={() => handleManualNavigation((activeMobile - 1 + reviews.length) % reviews.length)}
                  aria-label="Previous review"
                  className="p-2 rounded-full hover:bg-brown/10 transition-colors"
                >
                  <ChevronLeft size={24} className="text-brown" />
                </button>
                <div className="flex justify-center gap-2">
                  {reviews.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => handleManualNavigation(i)}
                      aria-label={`Show review ${i + 1}`}
                      className={`h-2 rounded-full transition-all ${
                        i === activeMobile ? "w-8 bg-terracotta-dark" : "w-2 bg-brown/20"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => handleManualNavigation((activeMobile + 1) % reviews.length)}
                  aria-label="Next review"
                  className="p-2 rounded-full hover:bg-brown/10 transition-colors"
                >
                  <ChevronRight size={24} className="text-brown" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
