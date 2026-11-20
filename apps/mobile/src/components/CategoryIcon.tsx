import {
  AppWindow,
  Armchair,
  BrickWall,
  Brush,
  Bug,
  Cctv,
  CircleHelp,
  CookingPot,
  DoorOpen,
  Droplet,
  Flame,
  Grid2x2,
  Hammer,
  House,
  KeyRound,
  Laptop,
  Lock,
  Microwave,
  Paintbrush,
  PanelTop,
  Refrigerator,
  Rows3,
  Scroll,
  Snowflake,
  Sofa,
  Sparkles,
  SprayCan,
  Sprout,
  Square,
  Thermometer,
  Truck,
  Tv,
  Utensils,
  WashingMachine,
  Waves,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';
import type { CategoryColor, CategoryIcon as IconName } from '@usta/shared';
import { categoryPalette } from '@/theme';

/**
 * Every icon an admin can choose for a category (CATEGORY_ICONS in @usta/shared).
 * `Record<IconName, …>` makes TypeScript complain if an icon is added there but not here.
 */
const ICONS: Record<IconName, LucideIcon> = {
  droplet: Droplet,
  zap: Zap,
  snowflake: Snowflake,
  flame: Flame,
  sparkles: Sparkles,
  hammer: Hammer,
  lock: Lock,
  thermometer: Thermometer,
  paintbrush: Paintbrush,
  'panel-top': PanelTop,
  square: Square,
  'grid-2x2': Grid2x2,
  brush: Brush,
  scroll: Scroll,
  'rows-3': Rows3,
  'app-window': AppWindow,
  'door-open': DoorOpen,
  house: House,
  'brick-wall': BrickWall,
  'key-round': KeyRound,
  'washing-machine': WashingMachine,
  refrigerator: Refrigerator,
  tv: Tv,
  laptop: Laptop,
  'cooking-pot': CookingPot,
  microwave: Microwave,
  cctv: Cctv,
  wifi: Wifi,
  sofa: Sofa,
  armchair: Armchair,
  utensils: Utensils,
  'spray-can': SprayCan,
  waves: Waves,
  truck: Truck,
  sprout: Sprout,
  bug: Bug,
  'circle-help': CircleHelp,
};

interface CategoryIconProps {
  icon: IconName;
  color: CategoryColor;
  /** Square size (64 on home, 56 on "All services"). */
  size?: number;
}

/** Colored rounded square with the trade's icon (design: CategoryTile). */
export function CategoryIcon({ icon, color, size = 64 }: CategoryIconProps) {
  const Icon = ICONS[icon] ?? CircleHelp;
  const palette = categoryPalette[color] ?? categoryPalette.gray;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.31,
        backgroundColor: palette.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={size * 0.44} color={palette.fg} strokeWidth={2} />
    </View>
  );
}
