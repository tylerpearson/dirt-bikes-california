import { getArea } from "@/lib/areas";
import { areaMetadata } from "@/lib/seo";
import { AreaGuide } from "@/components/AreaGuide";

const area = getArea("big-bear");

export const metadata = areaMetadata(area, {
  title: "Big Bear Dirt Bike Routes",
  description:
    "The best OHV and dual-sport dirt bike routes around Big Bear, with real route maps, elevation, and exactly where green-sticker bikes are allowed vs. plate-only.",
});

export default function BigBear() {
  return <AreaGuide area={area} />;
}
