# Setup Guide

This site is built with React (TanStack Start). All artist details and integrations live in **`src/lib/site-config.ts`** — this is the only file you need to edit to personalise the site.

---

## 1. Personalise content (5 min)

Open `src/lib/site-config.ts` and update:

- `artistName`, `city`, `state`, `stateCode`
- `whatsapp` (E.164, e.g. `+919876543210`) and `whatsappDisplay`
- `instagram` handle and `instagramUrl`
- `mapsUrl` — paste your Google Maps share link
- `email`, `siteUrl`, `tagline`, `description`
- `geo` — your studio coordinates for SEO

Replace `src/assets/hero-mehandi.jpg` and `src/assets/artist-portrait.jpg` with your own images (keep filenames or update imports).

---

## 2. Cloudinary (Gallery) — 10 min

1. Sign up at [cloudinary.com](https://cloudinary.com) (free plan).
2. In **Settings → Security**, enable **"Resource list"** under Restricted media types (set to *Allowed*).
3. Create folders: `mehandi/bridal`, `mehandi/arabic`, `mehandi/traditional`, `mehandi/festive`.
4. Upload images and **tag** each with the category name (`bridal`, `arabic`, etc.).
5. Copy your **Cloud name** from the dashboard.
6. Open `src/lib/site-config.ts` → set `CLOUDINARY.cloudName`.

> Until you do this, the gallery shows 12 styled placeholders — site stays beautiful.

**Adding new photos later:** Just upload + tag in Cloudinary. The site picks them up automatically on next page load.

---

## 3. Google Sheets (Testimonials) — 5 min

1. Create a new Google Sheet with these headers in row 1:

   | name | rating | review | occasion | review_link |
   |------|--------|--------|----------|-------------|

2. Add reviews row by row.
3. **File → Share → Anyone with the link → Viewer**.
4. Copy the Sheet ID from the URL: `docs.google.com/spreadsheets/d/`**`SHEET_ID`**`/edit`.
5. Paste into `SHEETS.sheetId` in `src/lib/site-config.ts`.

**Adding reviews later:** Open the sheet → add a row → done. Site updates on next load. Zero deploy.

---

## 4. Formspree (Booking Form) — 3 min

1. Sign up at [formspree.io](https://formspree.io) (free: 50 submissions/mo).
2. Create a new form. Copy the form ID (last segment of `https://formspree.io/f/XXXXXXX`).
3. Paste into `FORMSPREE.formId` in `src/lib/site-config.ts`.

> While left as `YOUR_FORM_ID`, the form runs in demo mode (shows success without submitting).

---

## 5. Deployment

This project deploys via the Lovable platform — click **Publish** in the top-right of the editor.

For custom domain, go to **Project Settings → Domains** and follow the prompts.

---

## 6. Personalisation Checklist

- [ ] `artistName`
- [ ] `city`, `state`, `stateCode`
- [ ] `whatsapp` + `whatsappDisplay`
- [ ] `instagram` handle + URL
- [ ] `mapsUrl`
- [ ] `siteUrl`
- [ ] `geo.lat` / `geo.lng`
- [ ] `description` (keep under 160 chars)
- [ ] Replace `src/assets/hero-mehandi.jpg`
- [ ] Replace `src/assets/artist-portrait.jpg`
- [ ] Add `public/og-image.jpg` (1200×630, hero shot)
- [ ] Cloudinary cloud name
- [ ] Google Sheet ID
- [ ] Formspree form ID
- [ ] Update `public/robots.txt` and `public/sitemap.xml` with your domain

---

## 7. Ongoing workflow

| Task | Where | Time |
|------|-------|------|
| Add a new gallery photo | Cloudinary → upload + tag | 30 sec |
| Add a new Google review | Google Sheet → new row | 30 sec |
| Update tagline / contact info | `src/lib/site-config.ts` → publish | 1 min |
