import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plushie Cuddle Club",
  description: "A fair, cozy cuddle queue for every plushie in the family.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
