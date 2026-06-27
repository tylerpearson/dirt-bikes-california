import { getArea } from "@/lib/areas";
import { areaMetadata } from "@/lib/seo";
import { AreaGuide } from "@/components/AreaGuide";

const area = getArea("san-jacinto");

export const metadata = areaMetadata(area, {
  title: "San Jacinto Mountains Dirt Bike Routes",
  description:
    "Dirt bike routes across the San Jacinto Mountains between Palm Springs and Idyllwild — green-sticker OHV roads on the Garner Valley / Santa Rosa side and plated forest roads around Idyllwild — with real route maps, elevation, and access.",
});

export default function SanJacinto() {
  return <AreaGuide area={area} />;
}
