import React from "react";
import { Composition } from "remotion";
import { Promo } from "./Promo";
import { FPS, TOTAL } from "./timeline";

const frames = Math.round(TOTAL * FPS);

export const Root: React.FC = () => (
  <>
    <Composition id="Promo-9x16-napisy" component={Promo} width={1080} height={1920} fps={FPS} durationInFrames={frames} defaultProps={{ variant: "napisy" as const }} />
    <Composition id="Promo-9x16-czyste" component={Promo} width={1080} height={1920} fps={FPS} durationInFrames={frames} defaultProps={{ variant: "czyste" as const }} />
    <Composition id="Promo-16x9-napisy" component={Promo} width={1920} height={1080} fps={FPS} durationInFrames={frames} defaultProps={{ variant: "napisy" as const }} />
    <Composition id="Promo-16x9-czyste" component={Promo} width={1920} height={1080} fps={FPS} durationInFrames={frames} defaultProps={{ variant: "czyste" as const }} />
  </>
);
