import { type ReactNode } from 'react';

type AccentColor = 'red' | 'blue' | 'emerald' | 'violet' | 'amber';

export interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  accent?: AccentColor;
  children?: ReactNode;
}

const accentClasses: Record<AccentColor, string> = {
  red: 'border-red-400/20 bg-red-500/10 text-red-200',
  blue: 'border-blue-400/20 bg-blue-500/10 text-blue-200',
  emerald: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
  violet: 'border-violet-400/20 bg-violet-500/10 text-violet-200',
  amber: 'border-amber-400/20 bg-amber-500/10 text-amber-200',
};

export default function PageHero({
  eyebrow,
  title,
  description,
  accent = 'red',
  children,
}: PageHeroProps) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 shadow-2xl">
      <div className="p-6 lg:p-8">
        {eyebrow && (
          <div
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${accentClasses[accent]}`}
          >
            {eyebrow}
          </div>
        )}
        <h2 className={`${eyebrow ? 'mt-4' : ''} max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl`}>
          {title}
        </h2>
        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            {description}
          </p>
        )}
        {children && <div className="mt-5">{children}</div>}
      </div>
    </section>
  );
}
