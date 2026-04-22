import artistImg from "@/assets/artist-portrait.jpg";
import { SITE } from "@/lib/site-config";

const services = ["Bridal", "Arabic", "Traditional", "Festive", "Home Visits", "Group Bookings"];

export default function About() {
  return (
    <section id="about" className="py-24 md:py-32 bg-gradient-to-b from-cream to-cream-dark relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div className="relative max-w-md mx-auto lg:mx-0 w-full">
          <div className="absolute -top-6 -left-6 w-full h-full border-2 border-gold rounded-[2rem]" aria-hidden="true" />
          <img
            src={artistImg}
            alt={`${SITE.artistName}, professional mehandi artist applying henna design`}
            width={1000}
            height={1200}
            loading="lazy"
            className="relative aspect-[5/6] w-full object-cover rounded-[2rem] shadow-[var(--shadow-warm)]"
          />
          <div className="absolute -bottom-6 -right-6 bg-terracotta-dark text-cream rounded-full w-28 h-28 flex flex-col items-center justify-center shadow-[var(--shadow-warm)]">
            <span className="font-display text-3xl leading-none">{SITE.yearsExperience}+</span>
            <span className="text-[10px] uppercase tracking-widest mt-1">Years</span>
          </div>
        </div>

        <div>
          <p className="divider-ornament font-sans uppercase tracking-[0.3em] text-xs text-terracotta-dark mb-4 justify-start">
            About the Artist
          </p>
          <h2 className="font-display text-4xl md:text-5xl text-brown mb-6 leading-tight">
            Where tradition meets <em className="text-terracotta-dark">artistry</em>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-4">
            Hello, I'm the artist behind {SITE.artistName}. For over {SITE.yearsExperience} years, I've
            been blessed to adorn the hands of brides, families, and friends across {SITE.city} —
            celebrating life's most cherished moments with henna.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            Every design I create uses 100% natural, hand-mixed henna paste — no chemicals, no shortcuts.
            From intricate bridal masterpieces to bold Arabic patterns, each piece is crafted with care,
            patience, and a deep love for the craft.
          </p>

          <div className="flex flex-wrap gap-2.5 mb-10">
            {services.map((s) => (
              <span
                key={s}
                className="px-4 py-2 bg-cream border border-gold/40 text-brown rounded-full text-sm font-sans"
              >
                {s}
              </span>
            ))}
          </div>

          <button
            onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
            className="px-8 py-4 bg-brown text-cream font-sans uppercase tracking-wider text-sm rounded-full hover:bg-terracotta-dark transition-all shadow-[var(--shadow-warm)]"
          >
            Book Your Date
          </button>
        </div>
      </div>
    </section>
  );
}
