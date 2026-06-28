import { getArea } from "@/lib/areas";
import { areaMetadata } from "@/lib/seo";
import { AreaGuide } from "@/components/AreaGuide";

const area = getArea("lake-arrowhead");

export const metadata = areaMetadata(area, {
  title: "Lake Arrowhead & Deep Creek Dirt Bike Routes",
  description:
    "Dirt bike routes around Lake Arrowhead, Crab Flats, and Deep Creek west of Big Bear: green-sticker OHV roads, designated motorcycle singletrack, and the Cleghorn ridge above Silverwood, with real route maps, elevation, and green-sticker vs. plate-only access.",
});

export default function LakeArrowhead() {
  return <AreaGuide area={area} />;
}
