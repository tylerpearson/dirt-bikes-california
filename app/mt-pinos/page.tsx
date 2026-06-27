import type { Metadata } from "next";
import { getArea } from "@/lib/areas";
import { AreaGuide } from "@/components/AreaGuide";

const area = getArea("mt-pinos");

export const metadata: Metadata = {
  title: "Mt Pinos / Frazier Park Dirt Bike Routes — Field Guide",
  description:
    "Green-sticker OHV and dual-sport dirt bike routes in the Mt Pinos / Frazier Park area of Los Padres N.F. near LA — Alamo & Frazier Mountains, the Cuyama badlands, and Ballinger Canyon — with real route maps, elevation, and access.",
};

export default function MtPinos() {
  return <AreaGuide area={area} />;
}
