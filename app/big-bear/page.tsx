import type { Metadata } from "next";
import { getArea } from "@/lib/areas";
import { AreaGuide } from "@/components/AreaGuide";

const area = getArea("big-bear");

export const metadata: Metadata = {
  title: "Big Bear Dirt Bike Routes — Field Guide",
  description:
    "The best OHV and dual-sport dirt bike routes around Big Bear, with real route maps, elevation, and exactly where green-sticker bikes are allowed vs. plate-only.",
};

export default function BigBear() {
  return <AreaGuide area={area} />;
}
