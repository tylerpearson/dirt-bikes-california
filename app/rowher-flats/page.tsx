import { getArea } from "@/lib/areas";
import { areaMetadata } from "@/lib/seo";
import { AreaGuide } from "@/components/AreaGuide";

const area = getArea("rowher-flats");

export const metadata = areaMetadata(area, {
  title: "Rowher Flats Dirt Bike Routes",
  description:
    "Green-sticker dirt bike trails at Rowher Flats OHV area in the Angeles National Forest north of Santa Clarita: the Rowher 4x4 trail, motorcycle-only singletrack, and the plated Santa Clara Divide country, with route maps, elevation, and access details.",
});

export default function RowherFlats() {
  return <AreaGuide area={area} />;
}
