import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { CLOUDINARY } from "@/lib/site-config";

type Filter = "all" | "bridal" | "arabic" | "traditional" | "festive";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "bridal", label: "Bridal" },
  { id: "arabic", label: "Arabic" },
  { id: "traditional", label: "Traditional" },
  { id: "festive", label: "Festive" },
];

type GalleryImage = {
  id: string;
  thumb: string;
  lqip: string;
  full: string;
  category: Filter;
  alt: string;
};

const cld = (publicId: string, transform: string) =>
  `https://res.cloudinary.com/${CLOUDINARY.cloudName}/image/upload/${transform}/${publicId}`;

function buildPlaceholders(filter: Filter): GalleryImage[] {
  const cats: Filter[] = ["bridal", "arabic", "traditional", "festive"];
  const palette = ["c8956c/faf5ef", "a97550/faf5ef", "d4a853/3d2314", "6b3d25/e8c880"];
  return Array.from({ length: 12 }, (_, i) => {
    const cat = cats[i % cats.length];
    const color = palette[i % palette.length];
    return {
      id: `ph-${i}`,
      thumb: `https://placehold.co/600x800/${color}?font=playfair&text=Mehandi+%23${i + 1}`,
      lqip: `https://placehold.co/20x27/${color}`,
      full: `https://placehold.co/1200x1600/${color}?font=playfair&text=Mehandi+%23${i + 1}`,
      category: cat,
      alt: `Sample ${cat} mehandi design ${i + 1}`,
    };
  }).filter((img) => filter === "all" || img.category === filter);
}

async function fetchCloudinaryPage(
  filter: Filter,
  cursor: string | null
): Promise<{ items: GalleryImage[]; nextCursor: string | null }> {
  const tag = filter === "all" ? CLOUDINARY.folder : filter;
  const url = `https://res.cloudinary.com/${CLOUDINARY.cloudName}/image/list/${tag}.json${
    cursor ? `?next_cursor=${cursor}` : ""
  }`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("list failed");
    const data: { resources: Array<{ public_id: string; context?: { custom?: { alt?: string } } }>; next_cursor?: string } =
      await res.json();
    const items: GalleryImage[] = data.resources.slice(0, CLOUDINARY.pageSize).map((r) => ({
      id: r.public_id,
      thumb: cld(r.public_id, "f_auto,q_auto:good,w_600,ar_3:4,c_fill"),
      lqip: cld(r.public_id, "f_auto,q_1,w_20,e_blur:1000"),
      full: cld(r.public_id, "f_auto,q_auto:best"),
      category: (filter === "all" ? "bridal" : filter) as Filter,
      alt: r.context?.custom?.alt ?? "Mehandi design",
    }));
    return { items, nextCursor: data.next_cursor ?? null };
  } catch {
    return { items: [], nextCursor: null };
  }
}

function GalleryImg({ img }: { img: GalleryImage }) {
  const ref = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const real = new Image();
    real.src = img.thumb;
    real.onload = () => {
      const el = ref.current;
      if (!el) return;
      el.src = img.thumb;
      el.classList.add("loaded");
    };
  }, [img.thumb]);
  return (
    <img
      ref={ref}
      src={img.lqip}
      alt={img.alt}
      width={600}
      height={800}
      loading="lazy"
      className="gallery-img w-full h-full object-cover"
    />
  );
}

export default function Gallery() {
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<GalleryImage[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const usePlaceholders = CLOUDINARY.cloudName === "YOUR_CLOUD_NAME";

  const loadPage = useCallback(
    async (resetting: boolean) => {
      if (loading) return;
      setLoading(true);
      if (usePlaceholders) {
        const ph = buildPlaceholders(filter);
        setItems(resetting ? ph : [...items, ...ph]);
        setExhausted(true);
        setLoading(false);
        return;
      }
      const { items: page, nextCursor } = await fetchCloudinaryPage(filter, resetting ? null : cursor);
      setItems((prev) => (resetting ? page : [...prev, ...page]));
      setCursor(nextCursor);
      if (!nextCursor || page.length === 0) setExhausted(true);
      setLoading(false);
    },
    [filter, cursor, loading, usePlaceholders, items]
  );

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setExhausted(false);
    loadPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || exhausted) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadPage(false);
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [exhausted, loadPage]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((i) => (i === null ? null : Math.min(i + 1, items.length - 1)));
      if (e.key === "ArrowLeft") setLightbox((i) => (i === null ? null : Math.max(i - 1, 0)));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, items.length]);

  const touchStart = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => (touchStart.current = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) setLightbox((i) => (i === null ? null : Math.min(i + 1, items.length - 1)));
      else setLightbox((i) => (i === null ? null : Math.max(i - 1, 0)));
    }
    touchStart.current = null;
  };

  return (
    <section id="gallery" className="py-24 md:py-32 bg-cream" aria-label="Gallery">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-12">
          <p className="divider-ornament font-sans uppercase tracking-[0.3em] text-xs text-terracotta-dark mb-4">
            Portfolio
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-brown mb-4">
            A gallery of <em className="text-terracotta-dark">grace</em>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From timeless bridal masterpieces to bold Arabic flourishes — each design tells its own story.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-12" role="group" aria-label="Filter gallery">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`px-6 py-2.5 rounded-full font-sans text-sm uppercase tracking-wider transition-all ${
                filter === f.id
                  ? "bg-terracotta-dark text-cream shadow-[var(--shadow-warm)]"
                  : "bg-cream-dark text-brown hover:bg-terracotta hover:text-cream"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setLightbox(i)}
              className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-cream-dark shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-warm)] transition-all"
              aria-label={`Open ${img.alt}`}
            >
              <GalleryImg img={img} />
              <div className="absolute inset-0 bg-gradient-to-t from-brown/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span className="text-cream text-xs uppercase tracking-widest font-sans">
                  {img.category}
                </span>
              </div>
            </button>
          ))}
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={`sk-${i}`} className="aspect-[3/4] rounded-2xl skeleton" aria-hidden="true" />
            ))}
        </div>

        <div ref={sentinelRef} className="h-10 mt-8" aria-hidden="true" />

        {exhausted && items.length > 0 && (
          <p className="text-center font-display italic text-xl text-terracotta-dark mt-12">
            ✦  You've seen it all  ✦
          </p>
        )}
        {items.length === 0 && !loading && (
          <p className="text-center text-muted-foreground mt-12">No images yet — check back soon.</p>
        )}
      </div>

      {lightbox !== null && items[lightbox] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          className="fixed inset-0 z-50 bg-brown/95 flex items-center justify-center animate-fade-in"
          onClick={() => setLightbox(null)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
            className="absolute top-6 right-6 text-cream hover:text-gold-light p-2 z-10"
            aria-label="Close"
          >
            <X size={32} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(Math.max(0, lightbox - 1));
            }}
            disabled={lightbox === 0}
            className="absolute left-4 md:left-8 text-cream hover:text-gold-light p-2 disabled:opacity-30"
            aria-label="Previous image"
          >
            <ChevronLeft size={40} />
          </button>
          <img
            src={items[lightbox].full}
            alt={items[lightbox].alt}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(Math.min(items.length - 1, lightbox + 1));
            }}
            disabled={lightbox === items.length - 1}
            className="absolute right-4 md:right-8 text-cream hover:text-gold-light p-2 disabled:opacity-30"
            aria-label="Next image"
          >
            <ChevronRight size={40} />
          </button>
        </div>
      )}
    </section>
  );
}
