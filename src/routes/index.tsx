import { createFileRoute } from "@tanstack/react-router";
import SiteHeader from "@/components/site/SiteHeader";
import Hero from "@/components/site/Hero";
import StatsStrip from "@/components/site/StatsStrip";
import Gallery from "@/components/site/Gallery";
import About from "@/components/site/About";
import Testimonials from "@/components/site/Testimonials";
import Contact from "@/components/site/Contact";
import SiteFooter from "@/components/site/SiteFooter";
import { SITE } from "@/lib/site-config";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: SITE.artistName,
  description: SITE.description,
  telephone: SITE.whatsapp,
  address: {
    "@type": "PostalAddress",
    addressLocality: SITE.city,
    addressRegion: SITE.state,
    addressCountry: "IN",
  },
  geo: { "@type": "GeoCoordinates", latitude: SITE.geo.lat, longitude: SITE.geo.lng },
  url: SITE.siteUrl,
  image: `${SITE.siteUrl}/og-image.jpg`,
  priceRange: "₹₹",
  openingHours: "Mo-Su 09:00-20:00",
  sameAs: [SITE.instagramUrl, SITE.mapsUrl],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${SITE.artistName} — Bridal & Festive Mehandi Artist in ${SITE.city}` },
      { name: "description", content: SITE.description },
      { name: "robots", content: "index, follow" },
      { name: "geo.region", content: `IN-${SITE.stateCode}` },
      { name: "geo.placename", content: SITE.city },
      { property: "og:title", content: `${SITE.artistName} — Mehandi Artist in ${SITE.city}` },
      { property: "og:description", content: SITE.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE.siteUrl },
      { property: "og:image", content: `${SITE.siteUrl}/og-image.jpg` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${SITE.artistName} — Mehandi Artist in ${SITE.city}` },
      { name: "twitter:description", content: SITE.description },
      { name: "twitter:image", content: `${SITE.siteUrl}/og-image.jpg` },
    ],
    links: [{ rel: "canonical", href: SITE.siteUrl }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(jsonLd),
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <StatsStrip />
        <Gallery />
        <About />
        <Testimonials />
        <Contact />
      </main>
      <SiteFooter />
    </>
  );
}
