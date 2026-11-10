import {
  Activity, Anchor, Armchair, Backpack, Volleyball, Bell, BicepsFlexed, Bike, Box, Brain,
  Camera, CircleDot, Compass, Crown, Dices, Disc3, Dribbble, Dumbbell, Eye, Feather,
  Flag, Flame, Footprints, Gift, Hand, Heart, Hourglass, Layers, Map, Medal,
  Moon, Mountain, Music, Orbit, PersonStanding, Repeat, Rocket, RotateCw, Ruler, Shuffle,
  Skull, Snowflake, Spade, Sparkles, Star, Sun, Swords, Target, Timer, TreePine,
  Trees, TrendingUp, Triangle, Trophy, Waves, Wind, Zap, type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  activity: Activity, anchor: Anchor, armchair: Armchair, backpack: Backpack, ball: Volleyball,
  bell: Bell, biceps: BicepsFlexed, bike: Bike, box: Box, brain: Brain, camera: Camera,
  "circle-dot": CircleDot, compass: Compass, crown: Crown, dices: Dices, disc: Disc3,
  dribbble: Dribbble, dumbbell: Dumbbell, eye: Eye, feather: Feather, flag: Flag, flame: Flame,
  footprints: Footprints, gift: Gift, hand: Hand, heart: Heart, hourglass: Hourglass,
  layers: Layers, map: Map, medal: Medal, moon: Moon, mountain: Mountain, music: Music,
  orbit: Orbit, person: PersonStanding, repeat: Repeat, rocket: Rocket, rotate: RotateCw,
  ruler: Ruler, shuffle: Shuffle, skull: Skull, snowflake: Snowflake, spade: Spade,
  sparkles: Sparkles, star: Star, sun: Sun, swords: Swords, target: Target, timer: Timer,
  tree: TreePine, trees: Trees, "trending-up": TrendingUp, triangle: Triangle, trophy: Trophy,
  waves: Waves, wind: Wind, zap: Zap,
};

export function ChallengeIcon({ name, className, strokeWidth = 1.5 }: { name: string; className?: string; strokeWidth?: number }) {
  const Icon = ICONS[name] ?? Activity;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden />;
}
