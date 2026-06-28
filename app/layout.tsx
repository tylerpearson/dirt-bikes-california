import type { Metadata } from "next";
import { Zilla_Slab, Archivo } from "next/font/google";
import "./globals.css";
import { AreaNav } from "@/components/AreaNav";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SoCal Dirt Bike & OHV Routes · Field Guide",
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "A field guide to the best dirt bike and OHV routes across Southern California: ride details, difficulty, real route maps, and whether you need a green sticker or a street-legal plate.",
  openGraph: {
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
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
      <body className="min-h-full flex flex-col">
        <AreaNav />
        {children}
      </body>
    </html>
  );
}
