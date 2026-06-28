import { getArea } from "@/lib/areas";
import { areaMetadata } from "@/lib/seo";
import { AreaGuide } from "@/components/AreaGuide";

const area = getArea("santa-ana");

export const metadata = areaMetadata(area, {
  title: "Santa Ana Mountains Dirt Bike Routes",
  description:
    "Dirt bike routes in the Santa Ana Mountains (Cleveland N.F.) near LA and Orange County: the Main Divide ridge over Saddleback and the Trabuco canyons, with real route maps, elevation, and street-legal plate vs. green-sticker access.",
});

export default function SantaAna() {
  return <AreaGuide area={area} />;
}
