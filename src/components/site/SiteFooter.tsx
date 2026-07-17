import { Instagram, MessageCircle, MapPin, Facebook } from "lucide-react";
import { SITE, NAV_SECTIONS } from "@/lib/site-config";

export default function SiteFooter() {
  const waLink = `https://wa.me/${SITE.whatsapp.replace(/\D/g, "")}`;
  return (
    <footer className="bg-cream-dark border-t border-border py-14">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 grid md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl text-gold" aria-hidden="true">✦</span>
            <span className="font-display text-xl text-brown">{SITE.artistName}</span>
          </div>
          <p className="font-display italic text-muted-foreground text-lg">{SITE.tagline}</p>
        </div>
        <div>
          <p className="font-sans uppercase text-xs tracking-widest text-terracotta-dark mb-4">Explore</p>
          <ul className="space-y-2">
            {NAV_SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" })}
                  className="text-brown hover:text-terracotta-dark transition-colors text-sm"
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-sans uppercase text-xs tracking-widest text-terracotta-dark mb-4">Connect</p>
          <ul className="space-y-3">
            <li>
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-brown hover:text-terracotta-dark text-sm">
                <MessageCircle size={16} /> {SITE.whatsappDisplay}
              </a>
            </li>
            <li>
              <a href={SITE.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-brown hover:text-terracotta-dark text-sm">
                <Instagram size={16} /> {SITE.instagram}
              </a>
            </li>
            <li>
              <a href={SITE.facebookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-brown hover:text-terracotta-dark text-sm">
                <Facebook size={16} /> GeethMehandiArts
              </a>
            </li>
            <li>
              <a href={SITE.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-brown hover:text-terracotta-dark text-sm">
                <MapPin size={16} /> {SITE.city}, {SITE.state}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 mt-10 pt-6 border-t border-border text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {SITE.artistName}. All rights reserved.
      </div>
    </footer>
  );
}
