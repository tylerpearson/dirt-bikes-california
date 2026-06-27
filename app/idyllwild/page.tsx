import type { Metadata } from "next";
import { getArea } from "@/lib/areas";
import { AreaGuide } from "@/components/AreaGuide";

const area = getArea("idyllwild");

export const metadata: Metadata = {
  title: "Idyllwild Dirt Bike Routes — Field Guide",
  description:
    "Forest dirt bike routes around Idyllwild in the San Jacinto Mountains — Black Mountain, Dark Canyon, and the PCT trailhead roads — with real route maps, elevation, and street-legal plate vs. green-sticker access.",
};

export default function Idyllwild() {
  return <AreaGuide area={area} />;
}
