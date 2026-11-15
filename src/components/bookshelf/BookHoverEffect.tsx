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
      <motion.span
        className="percy-book-glow"
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: [0.15, 0.58, 0.15], scale: [0.9, 1.12, 0.9] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </span>
  );
}
