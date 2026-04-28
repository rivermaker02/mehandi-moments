import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/* ---------------- CONFIG ---------------- */

const SHEETS = ["bridal", "baby shower", "engagement", "non-bridal", "payal designs", "our signature designs"] as const;
type Filter = (typeof SHEETS)[number];

const SHEET_ID = "1B006_n7aaV-uPqHKOIKnGs5bNrdNgjFMwkZPScNMoMU";

const SHEET_GIDS: Record<Filter, string> = {
  "bridal": "0",
  "baby shower": "1071213222",
  "engagement": "589894922",
  "non-bridal": "1004138673",
  "payal designs": "552544545",
  "our signature designs": "335488088",
  // 🔴 replace with actual gid
};

const PAGE_SIZE = 6;

/* ---------------- TYPES ---------------- */

type GalleryImage = {
  id: string;
  url: string;
  category: Filter;
};

/* ---------------- CSV PARSER ---------------- */

function parseCSV(text: string): string[] {
  return text
    .split("\n")
    .slice(1) // remove header
    .map((row) => row.split(",")[0]?.trim())
    .filter(Boolean);
}

/* ---------------- FETCH ---------------- */

async function fetchSheet(category: Filter): Promise<GalleryImage[]> {
  try {
    const gid = SHEET_GIDS[category];

    const res = await fetch(
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`
    );

    if (!res.ok) throw new Error("Fetch failed");

    const text = await res.text();
    const urls = parseCSV(text);

    return urls.map((url, i) => ({
      id: `${category}-${i}`,
      url,
      category,
    }));
  } catch (e) {
    console.error("Sheet fetch error:", category, e);
    return [];
  }
}

/* ---------------- COMPONENT ---------------- */

export default function Gallery() {
  const [filter, setFilter] = useState<Filter>(SHEETS[0]);
  const [dataMap, setDataMap] = useState<Record<string, GalleryImage[]>>({});
  const [pageMap, setPageMap] = useState<Record<string, number>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [lightbox, setLightbox] = useState<number | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  /* -------- INITIAL LOAD -------- */

  useEffect(() => {
    loadCategory(SHEETS[0]);
  }, []);

  /* -------- LOAD CATEGORY -------- */

  const loadCategory = async (category: Filter) => {
    if (dataMap[category]) return;

    setLoadingMap((prev) => ({ ...prev, [category]: true }));

    const data = await fetchSheet(category);

    setDataMap((prev) => ({ ...prev, [category]: data }));
    setPageMap((prev) => ({ ...prev, [category]: 1 }));
    setLoadingMap((prev) => ({ ...prev, [category]: false }));
  };

  /* -------- FILTER CHANGE -------- */

  const handleFilterChange = (cat: Filter) => {
    setFilter(cat);
    loadCategory(cat);
  };

  /* -------- CURRENT DATA -------- */

  const currentData = dataMap[filter] || [];
  const currentPage = pageMap[filter] || 1;

  const visibleItems = currentData.slice(0, currentPage * PAGE_SIZE);

  const hasMore = currentData.length > currentPage * PAGE_SIZE;

  /* -------- LOAD MORE -------- */

  const loadMore = useCallback(() => {
    setPageMap((prev) => {
      const newPage = (prev[filter] || 1) + 1;
      const currentCategoryData = dataMap[filter] || [];
      // Only increment if there's more data to load
      if (currentCategoryData.length > newPage * PAGE_SIZE) {
        return {
          ...prev,
          [filter]: newPage,
        };
      }
      return prev;
    });
  }, [filter, dataMap]);

  /* -------- INTERSECTION OBSERVER -------- */

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  /* ---------------- UI ---------------- */

  return (
    <section id="gallery" className="py-24 md:py-32 bg-gradient-to-b from-white to-cream relative overflow-hidden" aria-label="Gallery">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* FILTERS */}
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          {SHEETS.map((cat) => (
            <button
              key={cat}
              onClick={() => handleFilterChange(cat)}
              className={`px-4 py-2 rounded-full capitalize ${filter === cat
                ? "bg-black text-white"
                : "bg-gray-200 hover:bg-gray-300"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* LOADING */}
        {loadingMap[filter] && visibleItems.length === 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <Skeleton key={`skeleton-${i}`} className="w-full aspect-[3/4] rounded-lg" />
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!loadingMap[filter] && visibleItems.length === 0 && (
          <p className="text-center text-gray-500">No images found</p>
        )}

        {/* GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {visibleItems.map((img, i) => (
            <img
              key={img.id}
              src={img.url}
              loading="lazy"
              onClick={() => setLightbox(i)}
              className="cursor-pointer rounded-lg object-cover aspect-[3/4]"
            />
          ))}
          {/* Show skeleton loaders while loading more items */}
          {loadingMap[filter] && visibleItems.length > 0 && (
            <>
              {Array.from({
                length: Math.min(PAGE_SIZE, currentData.length - visibleItems.length),
              }).map((_, i) => (
                <Skeleton
                  key={`skeleton-loading-${i}`}
                  className="w-full aspect-[3/4] rounded-lg"
                />
              ))}
            </>
          )}
        </div>

        {/* SENTINEL */}
        {hasMore && <div ref={sentinelRef} className="h-10"></div>}

        {/* END MESSAGE */}
        {!hasMore && visibleItems.length > 0 && !loadingMap[filter] && (
          <p className="text-center mt-10 text-gray-500">
            You've reached the end
          </p>
        )}

        {/* LIGHTBOX */}
        {lightbox !== null && visibleItems[lightbox] && (
          <div
            className="fixed inset-0 bg-black/90 flex items-center justify-center"
            onClick={() => setLightbox(null)}
          >
            <button
              className="absolute top-5 right-5 text-white"
              onClick={() => setLightbox(null)}
            >
              <X size={32} />
            </button>

            <button
              className="absolute left-5 text-white"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox((i) => (i ? i - 1 : 0));
              }}
            >
              <ChevronLeft size={40} />
            </button>

            <img
              src={visibleItems[lightbox].url}
              className="max-h-[90vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            <button
              className="absolute right-5 text-white"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox((i) =>
                  i !== null && i < visibleItems.length - 1 ? i + 1 : i
                );
              }}
            >
              <ChevronRight size={40} />
            </button>
          </div>
        )}      </div>    </section>
  );
}
