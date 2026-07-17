import React from "react";
import { GrainOverlay } from "@/components/ui/textures/GrainOverlay";
import { ScanlineBg } from "@/components/ui/textures/ScanlineBg";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { MarketingHero } from "@/components/layout/MarketingHero";
import { LandingBento } from "@/components/layout/LandingBento";
import { LandingFlowAndSecurity } from "@/components/layout/LandingFlowAndSecurity";
import { SeeItInAction } from "@/components/layout/SeeItInAction";
import { FAQSection } from "@/components/layout/FAQSection";
import { MarketingFooter } from "@/components/layout/MarketingFooter";

export default function MarketingPage() {
  return (
    <main className="light-landing relative min-h-screen w-full bg-background text-foreground overflow-x-hidden">
      {/* Background Visual Texture Primitives (Rendered once at page root) */}
      <ScanlineBg />
      <GrainOverlay />

      {/* Page Sections */}
      <MarketingNav />
      <MarketingHero />
      <LandingBento />
      <LandingFlowAndSecurity />
      <SeeItInAction />
      <FAQSection />
      <MarketingFooter />
    </main>
  );
}
