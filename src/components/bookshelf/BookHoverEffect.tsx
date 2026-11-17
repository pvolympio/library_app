import { motion } from "framer-motion";

interface BookHoverEffectProps {
  themeId: string;
  active: boolean;
  burst: number;
  reducedMotion: boolean;
}

const aliceParticles = [
  { x: -15, drift: -20, delay: 0, rotate: -32, kind: "card" },
  { x: -4, drift: 15, delay: 0.07, rotate: 24, kind: "leaf" },
  { x: 8, drift: -8, delay: 0.13, rotate: 42, kind: "card" },
  { x: 17, drift: 22, delay: 0.19, rotate: -18, kind: "leaf" },
] as const;

const maryCatParticles = [
  { x: -18, drift: -24, delay: 0, rotate: -18, kind: "paw" },
  { x: -4, drift: 12, delay: 0.08, rotate: 12, kind: "cat" },
  { x: 10, drift: -10, delay: 0.14, rotate: 22, kind: "paw" },
  { x: 20, drift: 24, delay: 0.2, rotate: -14, kind: "cat" },
] as const;

export function BookHoverEffect({ themeId, active, burst, reducedMotion }: BookHoverEffectProps) {
  if (!active || reducedMotion) return null;

  if (themeId === "alice") {
    return (
      <span className="book-hover-effect" aria-hidden="true">
        {aliceParticles.map((particle, index) => (
          <motion.span
            key={`${burst}-${index}`}
            className="alice-falling-particle"
            style={{ marginLeft: particle.x }}
            initial={{ x: 0, y: -5, rotate: 0, opacity: 0, scale: 0.7 }}
            animate={{ x: particle.drift, y: 66, rotate: particle.rotate, opacity: [0, 1, 0.9, 0], scale: 1 }}
            transition={{ duration: 1.05, delay: particle.delay, ease: "easeOut" }}
          >
            {particle.kind === "card" ? (
              <svg viewBox="0 0 14 18"><rect x="1" y="1" width="12" height="16" rx="1.5" /><path d="M7 12.5 3.8 9.4C1.7 7.2 5 4.4 7 6.7c2-2.3 5.3.5 3.2 2.7L7 12.5Z" /></svg>
            ) : (
              <svg viewBox="0 0 14 18"><path d="M12 2C5.2 2.7 1.6 6.3 2 14c5.9-.3 10-4.4 10-12Z" /><path d="M3 14c2.1-3.7 4.5-6.1 7.2-8" /></svg>
            )}
          </motion.span>
        ))}
      </span>
    );
  }

  if (themeId === "harry-potter") {
    return (
      <span className="book-hover-effect" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <motion.span
            key={`${burst}-${index}`}
            className="harry-spark"
            style={{ left: `${8 + (index * 17) % 72}%`, top: `${7 + (index * 29) % 76}%` }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 0.95, 0.25, 0.8, 0], scale: [0.4, 1.25, 0.7, 1, 0.35] }}
            transition={{ duration: 0.9, delay: index * 0.08, ease: "easeInOut" }}
          />
        ))}
      </span>
    );
  }

  return (
    <span className="book-hover-effect" aria-hidden="true">
      {maryCatParticles.map((particle, index) => (
        <motion.span
          key={`${burst}-${index}`}
          className={`mary-cat-particle is-${particle.kind}`}
          style={{ marginLeft: particle.x }}
          initial={{ x: 0, y: 12, rotate: 0, opacity: 0, scale: 0.65 }}
          animate={{
            x: particle.drift,
            y: -52,
            rotate: particle.rotate,
            opacity: [0, 1, 0.9, 0],
            scale: [0.7, 1.05, 0.9],
          }}
          transition={{ duration: 1.15, delay: particle.delay, ease: "easeOut" }}
        >
          {particle.kind === "paw" ? (
            <svg viewBox="0 0 20 20">
              <circle cx="5.5" cy="7.5" r="1.8" />
              <circle cx="10" cy="5.5" r="1.9" />
              <circle cx="14.5" cy="7.5" r="1.8" />
              <path d="M10 10.2c-2.5 0-4.2 1.8-4.2 3.7 0 1.4 1.1 2.4 2.4 2.4.7 0 1.3-.3 1.8-.3s1.1.3 1.8.3c1.3 0 2.4-1 2.4-2.4 0-1.9-1.7-3.7-4.2-3.7Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20">
              <path d="M4 13.5V6.5l3.2 2.4a6.4 6.4 0 0 1 5.6 0L16 6.5v7a5.5 5.5 0 0 1-6 4.5 5.5 5.5 0 0 1-6-4.5Z" />
              <circle cx="8" cy="11.5" r="0.8" className="cat-eye" />
              <circle cx="12" cy="11.5" r="0.8" className="cat-eye" />
            </svg>
          )}
        </motion.span>
      ))}
    </span>
  );
}
