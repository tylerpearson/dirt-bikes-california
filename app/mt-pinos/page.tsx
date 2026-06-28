import { getArea } from "@/lib/areas";
import { areaMetadata } from "@/lib/seo";
import { AreaGuide } from "@/components/AreaGuide";

const area = getArea("mt-pinos");

export const metadata = areaMetadata(area, {
  title: "Mt Pinos / Frazier Park Dirt Bike Routes",
  description:
    "Green-sticker OHV and dual-sport dirt bike routes in the Mt Pinos / Frazier Park area of Los Padres N.F. near LA: Alamo & Frazier Mountains, the Cuyama badlands, and Ballinger Canyon, with real route maps, elevation, and access.",
});

export default function MtPinos() {
  return <AreaGuide area={area} />;
}
