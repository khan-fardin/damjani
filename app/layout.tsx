import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: "damjani — Compare tech prices in Bangladesh", template: "%s | damjani" },
  description: siteConfig.description,
  openGraph: { type: "website", siteName: siteConfig.name, locale: "en_BD" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteHeader /><main>{children}</main><SiteFooter /></body></html>;
}
