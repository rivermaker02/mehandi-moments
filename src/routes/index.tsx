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

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE.siteUrl}/#mehandi-artist`,
    name: SITE.artistName,
    description: SITE.description,
    telephone: SITE.whatsapp,
    email: SITE.email,
    url: SITE.siteUrl,
    image: `${SITE.siteUrl}/og-image.jpg`,
    priceRange: "₹₹",
    openingHours: SITE.openingHours,
    areaServed: {
      "@type": "City",
      name: SITE.city,
      addressRegion: SITE.state,
      addressCountry: "IN",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: SITE.city,
      addressRegion: SITE.state,
      addressCountry: "IN",
    },
    geo: { "@type": "GeoCoordinates", latitude: SITE.geo.lat, longitude: SITE.geo.lng },
    sameAs: [SITE.instagramUrl, SITE.facebookUrl, SITE.mapsUrl],
    makesOffer: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Bridal Mehndi Design",
          description: "Traditional bridal mehndi for weddings, engagements, and festive celebrations.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Festive and Arabic Mehndi",
          description: "Decorative festive, Arabic, and custom henna artwork for events and celebrations.",
        },
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.artistName,
    url: SITE.siteUrl,
    description: SITE.description,
    inLanguage: "en-IN",
  },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${SITE.artistName} | Bridal & Festive Mehndi Artist in ${SITE.city}, ${SITE.state}` },
      { name: "description", content: SITE.description },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "geo.region", content: `IN-${SITE.stateCode}` },
      { name: "geo.placename", content: SITE.city },
      { property: "og:title", content: `${SITE.artistName} | Bridal & Festive Mehndi Artist in ${SITE.city}` },
      { property: "og:description", content: SITE.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE.siteUrl },
      { property: "og:image", content: `${SITE.siteUrl}/og-image.jpg` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${SITE.artistName} | Bridal & Festive Mehndi Artist in ${SITE.city}` },
      { name: "twitter:description", content: SITE.description },
      { name: "twitter:image", content: `${SITE.siteUrl}/og-image.jpg` },
    ],
    links: [{ rel: "canonical", href: SITE.siteUrl }],
    scripts: jsonLd.map((schema) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
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
