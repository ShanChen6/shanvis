import type { Metadata } from "next";

import { isAiConfigured } from "@/lib/ai/model";
import { RigChat } from "@/components/ai/rig-chat";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = {
  title: "AI Rig Builder",
  description: "Describe what you shoot and your budget — get a body and lens that fit, checked for mount, stock and price.",
};

export default function RigBuilderPage() {
  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <header className="mb-10">
        <p className="spec-figure text-[11px] uppercase tracking-[0.18em] text-primary">AI Rig Builder</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Tell us how you shoot</h1>
        <p className="mt-3 text-muted-foreground">
          Describe your style and budget in your own words. Every kit is checked against live stock, lens mount and
          your budget before it reaches you.
        </p>
      </header>
      <RigChat configured={isAiConfigured()} />
    </Container>
  );
}
