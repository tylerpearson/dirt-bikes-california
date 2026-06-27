import type { Metadata } from "next";
import { getArea } from "@/lib/areas";
import { AreaGuide } from "@/components/AreaGuide";

const area = getArea("san-luis-obispo");

export const metadata: Metadata = {
  title: "San Luis Obispo Dirt Bike Routes — Field Guide",
  description:
    "Dirt bike routes in the Los Padres backcountry east of San Luis Obispo — the Pozo / La Panza OHV area around Hi Mountain plus the remote Sierra Madre Ridge — with real route maps, elevation, and green-sticker vs. plate-only access.",
};

export default function SanLuisObispo() {
  return <AreaGuide area={area} />;
}
