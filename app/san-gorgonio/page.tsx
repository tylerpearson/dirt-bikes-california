import { getArea } from "@/lib/areas";
import { areaMetadata } from "@/lib/seo";
import { AreaGuide } from "@/components/AreaGuide";

const area = getArea("san-gorgonio");

export const metadata = areaMetadata(area, {
  title: "San Gorgonio & Barton Flats Dirt Bike Routes",
  description:
    "Plated dual-sport dirt bike routes on the south side of the San Bernardinos below San Gorgonio: the Santa Ana River, Barton Flats, and Heart Bar high country, with real route maps, elevation, and plate-only access.",
});

export default function SanGorgonio() {
  return <AreaGuide area={area} />;
}
