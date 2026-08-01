import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Fraunces } from "next/font/google";
import "./globals.css";

// Variable font — one file covers all weights we use (400, 500, 600, 700)
const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

// Only weight 400; 500 is only needed on the orders table and isn't worth
// an extra preload on every page where mono text is default-weight
const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

// Display font used only for h1/h2/h3 — not present on every page, so
// preloading it guarantees a "preloaded but not used" warning on routes
// like /orders and /queue that have no heading elements. Skip the preload
// and let it load on demand. Remove axes (SOFT/WONK) since we never set
// them in CSS — they change the font file URL without adding any value.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Agent Hub",
  description: "Multi-agent automation platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${fraunces.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
