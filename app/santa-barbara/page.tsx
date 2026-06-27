import type { Metadata } from "next";
import { getArea } from "@/lib/areas";
import { AreaGuide } from "@/components/AreaGuide";

const area = getArea("santa-barbara");

export const metadata: Metadata = {
  title: "Santa Barbara Dirt Bike Routes — Field Guide",
  description:
    "Backcountry dirt bike routes behind Santa Barbara — the Camuesa OHV area, East Camino Cielo, and the San Rafael backcountry — with real route maps, elevation, and green-sticker vs. plate-only access.",
};

export default function SantaBarbara() {
  return <AreaGuide area={area} />;
}
