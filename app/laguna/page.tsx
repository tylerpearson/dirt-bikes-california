import type { Metadata } from "next";
import { getArea } from "@/lib/areas";
import { AreaGuide } from "@/components/AreaGuide";

const area = getArea("laguna");

export const metadata: Metadata = {
  title: "Laguna Mountains Dirt Bike Routes — Field Guide",
  description:
    "Dirt bike routes in the Laguna Mountains of San Diego County — the Corral Canyon OHV Area and the Mount Laguna forest roads — with real route maps, elevation, and green-sticker vs. plate-only access.",
};

export default function Laguna() {
  return <AreaGuide area={area} />;
}
