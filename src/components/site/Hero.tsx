import heroImg from "@/assets/hero-mehandi.jpg";
import { SITE } from "@/lib/site-config";

export default function Hero() {
  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center ornament-bg overflow-hidden pt-20"
      aria-label="Hero"
    >
      {/* Floating decorative ornaments — purely decorative, hidden from AT */}
      <span
        aria-hidden="true"
        className="absolute top-32 left-8 text-6xl text-gold/30 animate-float"
        style={{ animationDelay: "0s" }}
      >
        ✦
      </span>
      <span
        aria-hidden="true"
        className="absolute bottom-40 right-12 text-7xl text-terracotta/25 animate-float"
        style={{ animationDelay: "1.5s" }}
      >
        ❋
      </span>
      <span
        aria-hidden="true"
        className="absolute top-1/3 right-1/4 text-4xl text-gold/20 animate-float"
        style={{ animationDelay: "3s" }}
      >
        ✦
      </span>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full py-16">
        <div className="order-2 lg:order-1">
          <p
            className="font-sans uppercase tracking-[0.3em] text-sm text-terracotta-dark mb-6 animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            ✦ Your dreams with mehandi creations  ✦
          </p>
          <h1
            className="font-display text-5xl md:text-6xl lg:text-7xl text-brown leading-[1.05] mb-6 animate-fade-up"
            style={{ animationDelay: "0.25s" }}
          >
            Hands adorned with <em className="text-terracotta-dark">timeless</em> stories.
          </h1>
          <p
            className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10 leading-relaxed animate-fade-up"
            style={{ animationDelay: "0.4s" }}
          >
            Intricate bridal & festive henna designs, hand-applied with 100% natural paste.
            Crafted for your most beautiful moments by {SITE.artistName}.
          </p>
          <div
            className="flex flex-wrap gap-4 animate-fade-up"
            style={{ animationDelay: "0.55s" }}
          >
            <button
              onClick={() => goTo("contact")}
              className="px-8 py-4 bg-terracotta-dark text-cream font-sans uppercase tracking-wider text-sm rounded-full hover:bg-brown transition-all shadow-[var(--shadow-warm)] hover:shadow-lg hover:-translate-y-0.5"
            >
              Book Now
            </button>
            <button
              onClick={() => goTo("gallery")}
              className="px-8 py-4 bg-transparent border border-brown text-brown font-sans uppercase tracking-wider text-sm rounded-full hover:bg-brown hover:text-cream transition-all"
            >
              View Gallery
            </button>
          </div>
        </div>

        <div
          className="order-1 lg:order-2 relative animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="relative aspect-[4/5] max-w-md mx-auto">
            <div
              className="absolute -inset-4 rounded-full bg-gradient-to-br from-gold-light/40 to-terracotta/30 blur-2xl"
              aria-hidden="true"
            />
            <img
              src={heroImg}
              alt="Intricate bridal mehandi henna design with paisley and floral patterns on bride's hand"
              width={1600}
              height={1200}
              className="relative w-full h-full object-cover rounded-[2rem] shadow-[var(--shadow-warm)]"
              fetchPriority="high"
            />
            <div
              className="absolute -bottom-6 -left-6 bg-cream rounded-2xl px-6 py-4 shadow-[var(--shadow-warm)] border border-border"
              aria-hidden="true"
            >
              <p className="font-display italic text-2xl text-terracotta-dark">
                {SITE.yearsExperience}+ years
              </p>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
                of artistry
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
