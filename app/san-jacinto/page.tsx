import type { Metadata } from "next";
import { getArea } from "@/lib/areas";
import { AreaGuide } from "@/components/AreaGuide";

const area = getArea("san-jacinto");

export const metadata: Metadata = {
  title: "San Jacinto Mountains Dirt Bike Routes — Field Guide",
  description:
    "Dirt bike routes across the San Jacinto Mountains between Palm Springs and Idyllwild — green-sticker OHV roads on the Garner Valley / Santa Rosa side and plated forest roads around Idyllwild — with real route maps, elevation, and access.",
};

export default function SanJacinto() {
  return <AreaGuide area={area} />;
}
