import { useEffect, useRef, useState } from "react";

type Coordinate = { lat: number; lng: number };

export const useAnimatedCoordinate = <T extends Coordinate>(target: T | null, durationMs = 2800) => {
  const [position, setPosition] = useState<T | null>(target);
  const currentRef = useRef<T | null>(target);
  const targetRef = useRef<T | null>(target);
  targetRef.current = target;
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const nextTarget = targetRef.current;
    if (!nextTarget) return;
    if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
    const start = currentRef.current;
    if (!start) {
      currentRef.current = nextTarget;
      setPosition(nextTarget);
      return;
    }

    const startedAt = performance.now();
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = {
        ...nextTarget,
        lat: start.lat + (nextTarget.lat - start.lat) * eased,
        lng: start.lng + (nextTarget.lng - start.lng) * eased,
      } as T;
      currentRef.current = next;
      setPosition(next);
      if (progress < 1) animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
    };
  }, [durationMs, target?.lat, target?.lng]);

  return position;
};