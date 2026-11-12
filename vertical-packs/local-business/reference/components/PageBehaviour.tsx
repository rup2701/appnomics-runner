"use client";
import { useEffect } from "react";

/** The only client code: top bar shadow after 50px, and the slim reserve bar once the hero has scrolled away. Does nothing when the user prefers reduced motion for the slide. */
export function PageBehaviour() {
  useEffect(() => {
    const nav = document.getElementById("rb-nav");
    const bar = document.getElementById("rb-sticky");
    const hero = document.getElementById("top");
    const onScroll = () => {
      nav?.classList.toggle("scrolled", window.scrollY > 50);
      if (bar && hero) bar.classList.toggle("show", window.scrollY > hero.offsetHeight - 100);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return null;
}
