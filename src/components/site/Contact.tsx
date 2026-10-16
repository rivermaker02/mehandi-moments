import { useEffect, useState } from "react";
import { z } from "zod";
import { MessageCircle, MapPin, Instagram, Loader2, Check, Facebook } from "lucide-react";
import { SITE } from "@/lib/site-config";

// Today's date in the visitor's own timezone (YYYY-MM-DD). Computed when called, not once
// at module load: on the server that would be UTC and could go stale for days.
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(20)
    .regex(/^[+\d\s\-()]+$/, "Only digits, spaces, +, -, ( ) allowed"),
  occasion: z.string().min(1, "Please choose an occasion"),
  date: z
    .string()
    .min(1, "Please pick a date")
    .refine((d) => d >= localToday(), "Date can't be in the past"),
  message: z.string().trim().max(800).optional().or(z.literal("")),
  // honeypot — must remain empty
  website: z.string().max(0, "Spam detected").optional().or(z.literal("")),
});

type Errors = Partial<Record<keyof z.infer<typeof schema>, string>>;
type Status = "idle" | "loading" | "success" | "error";

const occasions = [
  "Bridal",
  "Engagement",
  "Reception",
  "Festive (Karva Chauth, Diwali, Eid)",
  "Baby Shower",
  "Group / Party Booking",
  "Other",
];

export default function Contact() {
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  // Set after hydration so the server-rendered HTML and the browser agree.
  const [minDate, setMinDate] = useState<string | undefined>(undefined);
  useEffect(() => setMinDate(localToday()), []);

  const waLink = `https://wa.me/${SITE.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Hi ${SITE.artistName}, I'd like to enquire about a mehandi booking.`,
  )}`;

  const buildWhatsAppLink = (data: z.infer<typeof schema>) => {
    const message = [
      `Hi ${SITE.artistName}, I would like to enquire about a booking.`,
      `Name: ${data.name}`,
      `Phone: ${data.phone}`,
      `Occasion: ${data.occasion}`,
      `Preferred date: ${data.date}`,
      data.message ? `Message: ${data.message}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return `https://wa.me/${SITE.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const result = schema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Errors = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof Errors;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setStatus("loading");

    try {
      const whatsappUrl = buildWhatsAppLink(result.data);
      // Note: passing "noopener" makes window.open always return null, which used to
      // trigger the fallback below and navigate this tab away too. Open, then cut the link.
      const newWindow = window.open(whatsappUrl, "_blank");
      if (newWindow) {
        newWindow.opener = null;
      } else {
        // Popup blocked: fall back to opening WhatsApp in this tab.
        window.location.href = whatsappUrl;
      }

      setStatus("success");
      form.reset();
      document
        .getElementById("contact-success")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {
      setStatus("error");
    }
  };

  const fieldClass = (key: keyof Errors) =>
    `w-full px-4 py-3 bg-cream border rounded-lg font-sans text-brown placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-terracotta transition-all ${
      errors[key] ? "border-destructive" : "border-border"
    }`;

  return (
    <section id="contact" className="py-24 md:py-32 bg-brown text-cream relative overflow-hidden">
      <span aria-hidden="true" className="absolute top-10 right-10 text-8xl text-gold/10">
        ✦
      </span>
      <span aria-hidden="true" className="absolute bottom-10 left-10 text-8xl text-gold/10">
        ❋
      </span>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-12 lg:gap-16 relative">
        <div>
          <p className="font-sans uppercase tracking-[0.3em] text-xs text-gold mb-4">
            Let's Create Together
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl mb-6 leading-tight">
            Reserve your <em className="text-gold-light">date</em>
          </h2>
          <p className="text-cream/80 text-lg leading-relaxed mb-10">
            Bridal dates fill quickly during the wedding season — get in touch early to secure your
            slot. For urgent bookings, message me on WhatsApp.
          </p>

          <ul className="space-y-5">
            <li>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 group"
              >
                <span className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center group-hover:bg-gold/30 transition-colors">
                  <MessageCircle size={20} className="text-gold-light" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gold/70">WhatsApp</p>
                  <p className="font-sans text-cream group-hover:text-gold-light transition-colors">
                    {SITE.whatsappDisplay}
                  </p>
                </div>
              </a>
            </li>
            <li>
              <a
                href={SITE.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 group"
              >
                <span className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center group-hover:bg-gold/30 transition-colors">
                  <MapPin size={20} className="text-gold-light" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gold/70">Studio</p>
                  <p className="font-sans text-cream group-hover:text-gold-light transition-colors">
                    {SITE.city}, {SITE.state}
                  </p>
                </div>
              </a>
            </li>
            <li>
              <a
                href={SITE.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 group"
              >
                <span className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center group-hover:bg-gold/30 transition-colors">
                  <Instagram size={20} className="text-gold-light" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gold/70">Instagram</p>
                  <p className="font-sans text-cream group-hover:text-gold-light transition-colors">
                    {SITE.instagram}
                  </p>
                </div>
              </a>
            </li>
            <li>
              <a
                href={SITE.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 group"
              >
                <span className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center group-hover:bg-gold/30 transition-colors">
                  <Facebook size={20} className="text-gold-light" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gold/70">Facebook</p>
                  <p className="font-sans text-cream group-hover:text-gold-light transition-colors">
                    GeethMehandiArts
                  </p>
                </div>
              </a>
            </li>
          </ul>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-cream text-brown rounded-3xl p-8 md:p-10 shadow-[var(--shadow-warm)]"
        >
          {status === "success" ? (
            <div id="contact-success" className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-terracotta-dark mx-auto flex items-center justify-center mb-4">
                <Check size={28} className="text-cream" />
              </div>
              <h3 className="font-display text-3xl text-brown mb-3">Thank you!</h3>
              <p className="text-muted-foreground mb-6">
                Your booking request has been opened in WhatsApp. I&apos;ll be in touch shortly.
              </p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="text-terracotta-dark underline underline-offset-4 font-sans text-sm"
              >
                Send another request
              </button>
            </div>
          ) : (
            <>
              <h3 className="font-display text-3xl text-brown mb-6">Booking Request</h3>

              {/* Honeypot — hidden from real users, bots fill it. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="absolute -left-[9999px]"
                aria-hidden="true"
              />

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-sans uppercase tracking-wider mb-2"
                  >
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "name-err" : undefined}
                    className={fieldClass("name")}
                  />
                  {errors.name && (
                    <p id="name-err" className="text-destructive text-sm mt-1">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-sans uppercase tracking-wider mb-2"
                  >
                    Phone / WhatsApp
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="+91 00000 00000"
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? "phone-err" : undefined}
                    className={fieldClass("phone")}
                  />
                  {errors.phone && (
                    <p id="phone-err" className="text-destructive text-sm mt-1">
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="occasion"
                      className="block text-sm font-sans uppercase tracking-wider mb-2"
                    >
                      Occasion
                    </label>
                    <select
                      id="occasion"
                      name="occasion"
                      required
                      defaultValue=""
                      aria-invalid={!!errors.occasion}
                      className={fieldClass("occasion")}
                    >
                      <option value="" disabled>
                        Select…
                      </option>
                      {occasions.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                    {errors.occasion && (
                      <p className="text-destructive text-sm mt-1">{errors.occasion}</p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="date"
                      className="block text-sm font-sans uppercase tracking-wider mb-2"
                    >
                      Date
                    </label>
                    <input
                      id="date"
                      name="date"
                      type="date"
                      required
                      min={minDate}
                      aria-invalid={!!errors.date}
                      className={fieldClass("date")}
                    />
                    {errors.date && <p className="text-destructive text-sm mt-1">{errors.date}</p>}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-sans uppercase tracking-wider mb-2"
                  >
                    Message{" "}
                    <span className="text-muted-foreground normal-case text-xs">(optional)</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    placeholder="Tell me about your event, number of people, design preferences…"
                    className={fieldClass("message")}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                className="mt-6 w-full px-8 py-4 bg-terracotta-dark text-cream font-sans uppercase tracking-wider text-sm rounded-full hover:bg-brown transition-all shadow-[var(--shadow-warm)] disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {status === "loading" && <Loader2 size={18} className="animate-spin" />}
                {status === "loading" ? "Opening WhatsApp…" : "Send Booking Request"}
              </button>

              {status === "error" && (
                <p className="mt-4 text-destructive text-sm text-center">
                  Couldn't send. Please{" "}
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    message on WhatsApp
                  </a>{" "}
                  instead.
                </p>
              )}
            </>
          )}
        </form>
      </div>
    </section>
  );
}
