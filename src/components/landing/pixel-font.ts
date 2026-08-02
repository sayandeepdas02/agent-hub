import localFont from "next/font/local";

export const geistPixel = localFont({
  src: "../../../public/fonts/GeistPixel.woff2",
  weight: "500",
  fallback: ["ui-monospace", "Courier New", "monospace"],
  adjustFontFallback: false,
});
