"use client";

import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/motion/use-prefers-reduced-motion";

import { LAYER_IDS, LAYERS, type LayerId } from "./camera-layers";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export interface StoryChapter {
  eyebrow: string;
  title: string;
  body: string;
  /** Spec figures shown under the chapter. */
  stats?: [label: string, value: string][];
  /** Layer brought into focus during this chapter. */
  focus?: LayerId;
}

const GAP = 95; // px between exploded layers
const EXPLODED_ROTATION = { rotationY: -34, rotationX: 16 };

const zFor = (layer: LayerId) => (LAYER_IDS.indexOf(layer) - (LAYER_IDS.length - 1) / 2) * GAP;

/**
 * Scroll-driven exploded view: the camera is pinned (sticky) while chapters
 * scroll past. ScrollTrigger scrubs one timeline across the whole story:
 * assemble -> explode -> focus each layer -> reassemble.
 */
export function ExplodedStory({ chapters }: { chapters: StoryChapter[] }) {
  const root = React.useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const q = gsap.utils.selector(root);
      const rig = q("[data-rig]");
      const layer = (id: LayerId) => q(`[data-layer="${id}"]`);

      gsap.set(rig, { rotationX: 0, rotationY: 0 });
      LAYER_IDS.forEach((id) => gsap.set(layer(id), { z: 0, opacity: 1 }));

      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut", duration: 1 },
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
        },
      });

      // 0 -> 1. Explode
      tl.to(rig, EXPLODED_ROTATION, 0);
      LAYER_IDS.forEach((id) => tl.to(layer(id), { z: zFor(id) }, 0));

      // Chapter k's state is reached at time k, so its tween starts at k - 1.
      // 2..n-2. Rack focus onto each middle chapter's layer
      chapters.slice(2, -1).forEach((chapter, i) => {
        const start = i + 1;
        LAYER_IDS.forEach((id) =>
          tl.to(layer(id), { opacity: !chapter.focus || chapter.focus === id ? 1 : 0.18 }, start),
        );
      });

      // n-1. Reassemble
      const end = chapters.length - 2;
      tl.to(rig, { rotationX: 0, rotationY: 0 }, end);
      LAYER_IDS.forEach((id) => tl.to(layer(id), { z: 0, opacity: 1 }, end));
    },
    { scope: root, dependencies: [reduced, chapters.length] },
  );

  return (
    <div ref={root} className="relative grid lg:grid-cols-2 lg:gap-12">
      {/* Visual: sticky while the chapters scroll */}
      <div className="sticky top-16 z-0 h-[42vh] lg:order-2 lg:h-[calc(100dvh-4rem)]">
        <div className="flex size-full items-center justify-center [perspective:1600px] max-lg:scale-[0.72] max-sm:scale-[0.62]">
          <div
            data-rig
            className="relative aspect-[3/2] w-full max-w-xl [transform-style:preserve-3d]"
            style={reduced ? { transform: "rotateX(12deg) rotateY(-26deg)" } : undefined}
          >
            {LAYER_IDS.map((id) => {
              const { Svg, label } = LAYERS[id];
              return (
                <div
                  key={id}
                  data-layer={id}
                  className="absolute inset-0 will-change-transform"
                  style={reduced ? { transform: `translateZ(${zFor(id) * 0.6}px)` } : undefined}
                  aria-label={label}
                >
                  <Svg />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chapters */}
      <ol className="relative z-10 lg:order-1">
        {chapters.map((chapter, i) => (
          <li
            key={chapter.title}
            className={cn(
              "flex min-h-[85vh] items-end pb-6 lg:items-center lg:py-12",
              i === 0 && "lg:min-h-[calc(100dvh-4rem)]",
            )}
          >
            <article className="w-full rounded-3xl border border-border bg-background/85 p-6 backdrop-blur-md sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
              <p className="spec-figure text-[11px] uppercase tracking-[0.2em] text-primary">
                {String(i + 1).padStart(2, "0")} — {chapter.eyebrow}
              </p>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{chapter.title}</h2>
              <p className="mt-4 max-w-md text-pretty text-muted-foreground">{chapter.body}</p>
              {chapter.stats && (
                <dl className="mt-6 flex flex-wrap gap-6">
                  {chapter.stats.map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
                      <dd className="spec-figure mt-1 text-2xl font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
