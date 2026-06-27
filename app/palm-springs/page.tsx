import type { Metadata } from "next";
import { getArea } from "@/lib/areas";
import { AreaGuide } from "@/components/AreaGuide";

const area = getArea("palm-springs");

export const metadata: Metadata = {
  title: "Palm Springs Dirt Bike Routes — Field Guide",
  description:
    "Backcountry dirt bike routes above Palm Springs — Garner Valley, the San Jacinto ridges, and the Santa Rosa Mountains — with real route maps, elevation, and green-sticker vs. plate-only access.",
};

export default function PalmSprings() {
  return <AreaGuide area={area} />;
}
