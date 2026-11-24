import { siteConfig } from "@/config/site";
import { Container } from "@/components/layout/container";
import { Logo } from "@/components/layout/logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <Container className="flex flex-col gap-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Logo className="text-foreground" />
          <span className="hidden sm:inline">·</span>
          <span className="italic">{siteConfig.tagline}</span>
        </div>
        <p className="spec-figure text-xs">© 2026 {siteConfig.name}</p>
      </Container>
    </footer>
  );
}
