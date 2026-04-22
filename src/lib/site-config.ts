// Centralized site config — update artist details here.
// Update these values to personalize the site.

export const SITE = {
  artistName: "GeethMehandiArts",
  city: "Bangalore",
  state: "Karnataka",
  stateCode: "KA",
  whatsapp: "+91XXXXXXXXXX", // E.164 format, no spaces
  whatsappDisplay: "+91 XXXXX XXXXX",
  instagram: "@geethmehandiarts",
  instagramUrl: "https://instagram.com/geethmehandiarts",
  mapsUrl: "https://maps.google.com/?q=Bangalore",
  yearsExperience: 8,
  totalClients: "500+",
  rating: "4.9",
  email: "hello@geethmehandiarts.com",
  siteUrl: "https://geethmehandiarts.com",
  tagline: "Bridal & Festive Mehandi Artistry",
  description:
    "Award-winning bridal and festive mehandi artist in Bangalore. 100% natural henna, 8+ years of experience in Bridal, Arabic, Traditional & Festive designs.",
  // Coordinates for JSON-LD (Bangalore default)
  geo: { lat: "12.9716", lng: "77.5946" },
};

// Cloudinary — leave as YOUR_CLOUD_NAME to render placeholder gallery
export const CLOUDINARY = {
  cloudName: "YOUR_CLOUD_NAME",
  folder: "mehandi",
  pageSize: 12,
};

// Google Sheets ID — leave as YOUR_SHEET_ID to use fallback testimonials
export const SHEETS = {
  sheetId: "YOUR_SHEET_ID",
  sheetName: "Sheet1",
};

// Formspree endpoint — leave as YOUR_FORM_ID to disable submissions
export const FORMSPREE = {
  formId: "YOUR_FORM_ID",
};

export const NAV_SECTIONS = [
  { id: "home", label: "Home" },
  { id: "gallery", label: "Gallery" },
  { id: "about", label: "About" },
  { id: "testimonials", label: "Reviews" },
  { id: "contact", label: "Book Now" },
];
