import { getArea } from "@/lib/areas";
import { areaMetadata } from "@/lib/seo";
import { AreaGuide } from "@/components/AreaGuide";

const area = getArea("el-paso");

export const metadata = areaMetadata(area, {
  title: "El Paso Mountains Dirt Bike Routes",
  description:
    "Green-sticker dirt bike routes in the El Paso Mountains BLM OHV area near Randsburg and Last Chance Canyon: designated motorcycle singletrack, Willis Well and Black Mountain roads, and Iron Canyon, with route maps, elevation, and open OHV access.",
});

export default function ElPaso() {
  return <AreaGuide area={area} />;
}
