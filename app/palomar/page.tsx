import { getArea } from "@/lib/areas";
import { areaMetadata } from "@/lib/seo";
import { AreaGuide } from "@/components/AreaGuide";

const area = getArea("palomar");

export const metadata = areaMetadata(area, {
  title: "Palomar Mountain Dirt Bike Routes",
  description:
    "Plated dual-sport dirt bike routes on Palomar Mountain in north San Diego County: the long Palomar Divide ridge, the High Point flank climb, and the Indian Flats backcountry, with real route maps, elevation, and plate-only access.",
});

export default function Palomar() {
  return <AreaGuide area={area} />;
}
