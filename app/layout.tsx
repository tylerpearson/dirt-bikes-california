import type { Metadata } from "next";
import { Zilla_Slab, Archivo } from "next/font/google";
import "./globals.css";

const zilla = Zilla_Slab({
  variable: "--font-zilla",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Big Bear Dirt Bike Routes",
  description:
    "The best dirt bike and OHV routes in the Big Bear area — ride details, difficulty, and whether you need a green sticker, red sticker, or street-legal plate.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${zilla.variable} ${archivo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
