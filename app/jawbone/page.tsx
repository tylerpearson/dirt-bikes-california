import { getArea } from "@/lib/areas";
import { areaMetadata } from "@/lib/seo";
import { AreaGuide } from "@/components/AreaGuide";

const area = getArea("jawbone");

export const metadata = areaMetadata(area, {
  title: "Jawbone Canyon Dirt Bike Routes",
  description:
    "Green-sticker dirt bike routes in the Jawbone Canyon OHV area off Highway 14 in the Mojave Desert: designated BLM desert routes, the Butterbredt and Dove Springs drainages, and real motorcycle singletrack, with route maps, elevation, and open OHV access.",
});

export default function Jawbone() {
  return <AreaGuide area={area} />;
}
