import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-center text-xs text-zinc-600 sm:text-sm">
          © {year} {siteConfig.organization} {siteConfig.shortName}
        </p>
      </div>
    </footer>
  );
}
