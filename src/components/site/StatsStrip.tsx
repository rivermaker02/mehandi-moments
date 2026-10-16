import { useCountUp } from "@/lib/use-reveal";
import { SITE } from "@/lib/site-config";

function Stat({
  value,
  suffix,
  label,
  isNumeric = true,
  staticValue,
}: {
  value: number;
  suffix?: string;
  label: string;
  isNumeric?: boolean;
  staticValue?: string;
}) {
  const { ref, value: counted } = useCountUp(value);
  return (
    <div className="text-center px-4">
      <p className="font-display text-4xl md:text-5xl text-gold-light mb-2">
        <span ref={ref}>
          {isNumeric ? counted : staticValue}
          {suffix}
        </span>
      </p>
      <p className="font-sans uppercase tracking-[0.2em] text-xs md:text-sm text-cream/80">
        {label}
      </p>
    </div>
  );
}

export default function StatsStrip() {
  return (
    <section
      className="bg-brown py-14 md:py-16 relative overflow-hidden"
      aria-label="By the numbers"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, var(--gold) 1px, transparent 1px), radial-gradient(circle at 80% 50%, var(--gold) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />
      <div className="max-w-7xl mx-auto px-6 lg:px-10 relative grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-cream/15">
        <Stat value={500} suffix="+" label="Happy Clients" />
        <Stat value={SITE.yearsExperience} suffix="+ yrs" label="Experience" />
        <Stat value={0} isNumeric={false} staticValue={`${SITE.rating}★`} label="Google Rating" />
        <Stat value={100} suffix="%" label="Natural Henna" />
      </div>
    </section>
  );
}
