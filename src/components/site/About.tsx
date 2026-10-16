import artistImg from "@/assets/artist-portrait.jpeg";
import { SITE } from "@/lib/site-config";

const services = ["Bridal", "Arabic", "Traditional", "Festive", "Home Visits", "Group Bookings"];

export default function About() {
  return (
    <section id="about" className="pb-24 md:pb-32 bg-gradient-to-b from-cream to-cream-dark relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div className="relative max-w-md mx-auto lg:mx-0 w-full">
          <div className="absolute -top-6 -left-6 w-full h-full border-2 border-gold rounded-[2rem]" aria-hidden="true" />
          <img
            src={artistImg}
            alt={`${SITE.artistName}, professional mehandi artist applying henna design`}
            width={1600}
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
          <p className="text-base leading-relaxed text-muted-foreground">
            Hi, I’m the artist behind {SITE.artistName}. My journey didn’t start in art — it started in tech.
            After spending over 5 years as a Cyber Security Consultant, I chose to turn my lifelong
            passion for drawing into a full-time profession. Today, I combine technical precision
            with traditional Indian artistry to create designs that are both structured and expressive.
          </p>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            With over {SITE.yearsExperience} years of experience, I specialize in detailed bridal mehndi,
            miniature figures, and story-driven compositions. My work is backed by intensive,
            structured training — including a 48-day advanced certification covering everything
            from foundational techniques to full bridal layouts and intricate figure work.
          </p>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Whether it’s an intimate celebration or a full bridal canvas, my focus is simple:
            precision, balance, and designs that don’t just look beautiful — they feel intentional.
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
