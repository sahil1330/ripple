import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ripple",
  description: "A FalkorDB company brain that corrects everyone who absorbed a stale fact.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
