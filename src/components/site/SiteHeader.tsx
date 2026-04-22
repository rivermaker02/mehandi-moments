import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { NAV_SECTIONS, SITE } from "@/lib/site-config";

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("home");

  useEffect(() => {
    // Throttle via rAF — no raw scroll spam.
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 60);
        raf = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // IntersectionObserver tracks the visible section for active-link styling.
    const sections = NAV_SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean
    ) as HTMLElement[];
    if (sections.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const goTo = (id: string) => {
    setOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-cream/85 backdrop-blur-md shadow-[var(--shadow-soft)]"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group" aria-label="Home">
          <span className="text-2xl text-gold" aria-hidden="true">✦</span>
          <span className="font-display text-xl md:text-2xl text-brown tracking-wide">
            {SITE.artistName}
          </span>
        </Link>

        <ul className="hidden md:flex items-center gap-8">
          {NAV_SECTIONS.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => goTo(s.id)}
                className={`font-sans text-sm tracking-wide uppercase transition-colors relative pb-1 ${
                  active === s.id ? "text-terracotta-dark" : "text-brown hover:text-terracotta-dark"
                }`}
                aria-current={active === s.id ? "page" : undefined}
              >
                {s.label}
                {active === s.id && (
                  <span className="absolute left-0 right-0 -bottom-0.5 h-px bg-gold" />
                )}
              </button>
            </li>
          ))}
        </ul>

        <button
          className="md:hidden text-brown p-2 -mr-2"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-cream border-t border-border animate-fade-in">
          <ul className="px-6 py-4 space-y-1">
            {NAV_SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => goTo(s.id)}
                  className="w-full text-left py-3 px-2 text-brown font-sans uppercase text-sm tracking-wide hover:bg-cream-dark rounded"
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
