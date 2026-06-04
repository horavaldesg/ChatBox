import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StreamFusion",
  description: "Unified streaming chat overlays for OBS."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
