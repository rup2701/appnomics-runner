import { DM_Sans, Vollkorn } from "next/font/google";

/**
 * The site's two fonts, loaded once here so every site gets the same wiring: Vollkorn for h1 and h2 (--font-heading), DM Sans for the rest (--font-body).
 * The root layout uses it as `<html lang="en" className={fontClasses}>`. restaurant.css reads the two variables and has the same names as fallbacks.
 * Change the fonts here only when the brief names other ones.
 */
const heading = Vollkorn({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-heading", display: "swap" });
const body = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });

export const fontClasses = `${heading.variable} ${body.variable}`;
