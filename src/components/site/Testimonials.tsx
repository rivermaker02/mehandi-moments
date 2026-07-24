import { useEffect, useMemo, useRef, useState } from "react";
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
      className="bg-cream rounded-2xl p-5 shadow-[var(--shadow-soft)] border border-border flex flex-col h-full animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-3 border-b border-gold/20 pb-3">
        <p className="font-sans font-medium text-brown uppercase">
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
      <div className="text-gold text-xl tracking-widest mb-4" aria-label={`${r.rating} out of 5 stars`}>
        {stars(r.rating)}
      </div>
      <p className="text-brown leading-relaxed mb-6 flex-1 font-display text-lg italic">
        "{r.review}"
      </p>
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

function pickRandomReviews(reviews: Review[]) {
  const pool = [...reviews];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(10, pool.length));
}

export default function Testimonials() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [activeMobile, setActiveMobile] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const displayedReviews = useMemo(() => {
    if (!reviews) return [];
    return pickRandomReviews(reviews);
  }, [reviews]);

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

  useEffect(() => {
    setActiveMobile(0);
    setIsPaused(false);
  }, [displayedReviews]);

  // Auto-rotate mobile carousel.
  useEffect(() => {
    if (!displayedReviews.length || displayedReviews.length <= 1 || isPaused) return;
    const t = window.setInterval(() => {
      setActiveMobile((i) => (i + 1) % displayedReviews.length);
    }, 5000);
    return () => window.clearInterval(t);
  }, [displayedReviews, isPaused]);

  useEffect(() => {
    if (!isPaused) return;
    const timer = window.setTimeout(() => {
      setIsPaused(false);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [isPaused]);

  const handleManualNavigation = (direction: "prev" | "next") => {
    if (!displayedReviews.length) return;
    const nextIndex =
      direction === "next"
        ? (activeMobile + 1) % displayedReviews.length
        : (activeMobile - 1 + displayedReviews.length) % displayedReviews.length;
    setActiveMobile(nextIndex);
    setIsPaused(true);
  };

  const handleDotNavigation = (index: number) => {
    if (!displayedReviews.length) return;
    setActiveMobile(index);
    setIsPaused(true);
  };

  const updateScrollState = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollState();
    container.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [displayedReviews]);

  const scrollTestimonials = (direction: "prev" | "next") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const firstCard = container.querySelector<HTMLElement>("[data-testimonial-card]");
    const cardWidth = firstCard?.getBoundingClientRect().width ?? 352;
    const gap = 24;

    container.scrollBy({
      left: direction === "next" ? cardWidth + gap : -(cardWidth + gap),
      behavior: "smooth",
    });
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
            {/* Desktop horizontal row */}
            <div className="hidden md:block">
              <div className="flex items-center gap-3 mb-6">
                {canScrollLeft ? (
                  <button
                    onClick={() => scrollTestimonials("prev")}
                    aria-label="Scroll testimonials left"
                    className="p-2 rounded-full hover:bg-brown/10 transition-colors shrink-0"
                  >
                    <ChevronLeft size={24} className="text-brown" />
                  </button>
                ) : (
                  <div className="w-10 shrink-0" />
                )}
                <div
                  ref={scrollContainerRef}
                  className="flex gap-6 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                  {displayedReviews.slice(0, 10).map((r, i) => (
                    <div
                      key={`${r.name}-${i}`}
                      data-testimonial-card
                      className="min-w-[min(100%,22rem)] md:min-w-[22rem] snap-start"
                    >
                      <Card r={r} delay={i * 100} />
                    </div>
                  ))}
                </div>
                {canScrollRight ? (
                  <button
                    onClick={() => scrollTestimonials("next")}
                    aria-label="Scroll testimonials right"
                    className="p-2 rounded-full hover:bg-brown/10 transition-colors shrink-0"
                  >
                    <ChevronRight size={24} className="text-brown" />
                  </button>
                ) : (
                  <div className="w-10 shrink-0" />
                )}
              </div>
            </div>
            {/* Mobile carousel */}
            <div className="md:hidden">
              <div className="flex items-center justify-between gap-3 mb-4">
                <button
                  onClick={() => handleManualNavigation("prev")}
                  aria-label="Previous review"
                  className="p-2 rounded-full hover:bg-brown/10 transition-colors"
                >
                  <ChevronLeft size={24} className="text-brown" />
                </button>
                <div className="text-sm uppercase tracking-[0.25em] text-terracotta-dark">
                  {activeMobile + 1}/{displayedReviews.length}
                </div>
                <button
                  onClick={() => handleManualNavigation("next")}
                  aria-label="Next review"
                  className="p-2 rounded-full hover:bg-brown/10 transition-colors"
                >
                  <ChevronRight size={24} className="text-brown" />
                </button>
              </div>
              <Card r={displayedReviews[activeMobile] ?? displayedReviews[0]} delay={0} />
              <div className="flex justify-center gap-2 mt-6">
                {displayedReviews.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handleDotNavigation(i)}
                    aria-label={`Show review ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      i === activeMobile ? "w-8 bg-terracotta-dark" : "w-2 bg-brown/20"
                    }`}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
