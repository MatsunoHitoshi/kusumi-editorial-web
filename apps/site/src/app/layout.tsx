import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { BuildVersionConsole } from "@/components/BuildVersionConsole";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getMetadataBase } from "@/lib/site-origin";
import { siteConfig } from "@/lib/site-config";

const buildVersion =
  process.env.NEXT_PUBLIC_BUILD_VERSION ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  "dev-local";
const builtAt = new Date().toISOString();

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: siteConfig.shortName,
    template: siteConfig.titleTemplate
  },
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.shortName,
    description: siteConfig.description,
    siteName: siteConfig.shortName,
    locale: "ja_JP",
    type: "website"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <BuildVersionConsole buildVersion={buildVersion} builtAt={builtAt} />
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
