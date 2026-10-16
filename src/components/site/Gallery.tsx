import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SITE } from "@/lib/site-config";

/* ---------------- CONFIG ---------------- */

const SHEETS = [
  "our signature designs",
  "bridal",
  "baby shower",
  "engagement",
  "non-bridal",
  "payal designs",
] as const;
type Filter = (typeof SHEETS)[number];

const SHEET_ID = "1B006_n7aaV-uPqHKOIKnGs5bNrdNgjFMwkZPScNMoMU";

const SHEET_GIDS: Record<Filter, string> = {
  bridal: "0",
  "baby shower": "1071213222",
  engagement: "589894922",
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

// Reads the first column of each row. Handles quoted cells ("...,...") and Windows line
// endings, so a URL containing a comma (e.g. Cloudinary's w_600,q_auto) can't break it.
function parseCSV(text: string): string[] {
  return text
    .split(/\r?\n/)
    .slice(1) // remove header
    .map((row) => {
      const m = row.match(/^\s*"((?:[^"]|"")*)"|^([^,]*)/);
      return (m?.[1] !== undefined ? m[1].replace(/""/g, '"') : (m?.[2] ?? "")).trim();
    })
    .filter((url) => /^https?:\/\//i.test(url));
}

/* ---------------- IMAGE SIZING ---------------- */

// Cloudinary resizes on the fly: insert a transformation after "/upload/" so the browser
// gets a right-sized, modern-format image instead of the full-resolution original.
// URLs from any other host, or that already carry a transformation, are left unchanged.
function sized(url: string, width: number): string {
  const m = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/);
  if (!m) return url;
  const rest = m[2];
  if (!/^v\d+\//.test(rest) && rest.includes("/")) return url; // already transformed
  return `${m[1]}f_auto,q_auto,c_limit,w_${width}/${rest}`;
}

// If a resized URL ever fails (e.g. Cloudinary "strict transformations" turned on),
// fall back to the original image once, so the gallery is never worse than before.
const fallBackToOriginal = (original: string) => (e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget;
  if (img.dataset.fallback) return;
  img.dataset.fallback = "1";
  img.src = original;
};

const altFor = (category: string, n: number) => {
  const label = `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
  const what = /design/i.test(category) ? label : `${label} mehndi design`;
  return `${what} by ${SITE.artistName} (${n})`;
};

/* ---------------- FETCH ---------------- */

async function fetchSheet(category: Filter): Promise<GalleryImage[]> {
  try {
    const gid = SHEET_GIDS[category];

    const res = await fetch(
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`,
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
  const [searchTheme, setSearchTheme] = useState("");

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

  const normalizedSearch = searchTheme.trim().toLowerCase();
  const matchingThemes = SHEETS.filter((cat) => cat.toLowerCase().includes(normalizedSearch));

  const currentData = dataMap[filter] || [];
  const currentPage = pageMap[filter] || 1;

  const visibleItems = currentData.slice(0, currentPage * PAGE_SIZE);

  const hasMore = currentData.length > currentPage * PAGE_SIZE;

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!normalizedSearch) {
      setFilter(SHEETS[0]);
      loadCategory(SHEETS[0]);
      return;
    }

    const exactMatch = SHEETS.find((cat) => cat.toLowerCase() === normalizedSearch) as
      | Filter
      | undefined;
    const partialMatch = SHEETS.find((cat) => cat.toLowerCase().includes(normalizedSearch)) as
      | Filter
      | undefined;
    const matchedTheme = exactMatch || partialMatch;

    if (matchedTheme) {
      setFilter(matchedTheme);
      loadCategory(matchedTheme);
    }
  };

  /* -------- LOAD MORE -------- */

  const loadMore = useCallback(() => {
    setPageMap((prev) => {
      const currentPage = prev[filter] || 1;
      const nextPage = currentPage + 1;
      const currentCategoryData = dataMap[filter] || [];

      // Only increment while the next page would still reveal unseen items.
      if (currentPage * PAGE_SIZE < currentCategoryData.length) {
        return {
          ...prev,
          [filter]: nextPage,
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
      { rootMargin: "200px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  /* -------- LIGHTBOX KEYBOARD + SCROLL LOCK -------- */

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      else if (e.key === "ArrowLeft") setLightbox((i) => (i ? i - 1 : 0));
      else if (e.key === "ArrowRight")
        setLightbox((i) => (i !== null && i < visibleItems.length - 1 ? i + 1 : i));
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox, visibleItems.length]);

  /* ---------------- UI ---------------- */

  return (
    <section
      id="gallery"
      className="py-24 md:py-32 bg-gradient-to-b from-white to-cream relative overflow-hidden"
      aria-label="Gallery"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="divider-ornament font-sans uppercase tracking-[0.3em] text-xs text-terracotta-dark mb-4 justify-center">
            Gallery
          </p>
          <h2 className="font-display text-4xl md:text-5xl text-brown mb-4 leading-tight">
            Bridal & festive mehndi designs in Bangalore
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Browse recent bridal, Arabic, traditional, and festive henna artwork created for
            weddings, engagements, and celebrations.
          </p>
        </div>
        {/* SEARCH */}
        <form
          onSubmit={handleSearchSubmit}
          className="mx-auto mb-8 flex w-full max-w-xl items-center gap-3 rounded-full border border-gray-300 bg-white px-4 py-3 shadow-sm"
        >
          <Search size={18} className="text-gray-500" />
          <input
            value={searchTheme}
            onChange={(e) => setSearchTheme(e.target.value)}
            placeholder="Search by theme, e.g. bridal"
            className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
          <button
            type="submit"
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            Search
          </button>
        </form>
        {/* FILTERS */}
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          {matchingThemes.length > 0 ? (
            matchingThemes.map((cat) => (
              <button
                key={cat}
                onClick={() => handleFilterChange(cat)}
                className={`px-4 py-2 rounded-full capitalize ${
                  filter === cat ? "bg-black text-white" : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                {cat}
              </button>
            ))
          ) : (
            <p className="text-sm text-gray-500">No matching themes found</p>
          )}
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
              src={sized(img.url, 600)}
              onError={fallBackToOriginal(img.url)}
              alt={altFor(img.category, i + 1)}
              loading="lazy"
              decoding="async"
              role="button"
              tabIndex={0}
              onClick={() => setLightbox(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setLightbox(i);
                }
              }}
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
          <p className="text-center mt-10 text-gray-500">You've reached the end</p>
        )}
        {/* LIGHTBOX */}
        {lightbox !== null && visibleItems[lightbox] && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3 sm:p-6"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              aria-label="Close gallery image"
              className="absolute top-3 right-3 sm:top-5 sm:right-5 z-20 rounded-full bg-black/50 p-2 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/70"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(null);
              }}
            >
              <X size={24} className="sm:w-8 sm:h-8" />
            </button>

            {lightbox > 0 && (
              <button
                type="button"
                aria-label="Previous gallery image"
                className="absolute left-3 sm:left-5 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/70"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((i) => (i ? i - 1 : 0));
                }}
              >
                <ChevronLeft size={28} className="sm:w-10 sm:h-10" />
              </button>
            )}

            <img
              key={visibleItems[lightbox].url}
              src={sized(visibleItems[lightbox].url, 1600)}
              onError={fallBackToOriginal(visibleItems[lightbox].url)}
              alt={altFor(visibleItems[lightbox].category, lightbox + 1)}
              className="relative z-10 max-h-[90vh] max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {lightbox < visibleItems.length - 1 && (
              <button
                type="button"
                aria-label="Next gallery image"
                className="absolute right-3 sm:right-5 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/70"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((i) => (i !== null && i < visibleItems.length - 1 ? i + 1 : i));
                }}
              >
                <ChevronRight size={28} className="sm:w-10 sm:h-10" />
              </button>
            )}
          </div>
        )}{" "}
      </div>{" "}
    </section>
  );
}
