import { useEffect, useRef, useState } from "react";

/**
 * Reveal-on-scroll hook. Attaches an IntersectionObserver to the returned ref;
 * once the element enters the viewport it gets the `is-visible` class and stays
 * visible (observer disconnects after first reveal).
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options?: IntersectionObserverInit,
) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("is-visible");
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px", ...options },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [options]);

  return { ref, visible };
}
