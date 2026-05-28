import type { CategoryIconKey } from "@/lib/data/types";
import {
  Caravan,
  AlignJustify,
  Flame,
  LayoutGrid,
  Anchor,
  Droplet,
  FlaskConical,
  Wrench,
} from "lucide-react";

const ICONS: Record<CategoryIconKey, typeof Caravan> = {
  caravan: Caravan,
  joint: AlignJustify,
  flame: Flame,
  wall: LayoutGrid,
  anchor: Anchor,
  drop: Droplet,
  beaker: FlaskConical,
  tool: Wrench,
};

export function CategoryIcon({
  name,
  size = 48,
}: {
  name: CategoryIconKey;
  size?: number;
}) {
  const I = ICONS[name];
  return <I size={size} strokeWidth={1.6} />;
}
