import {
  Tag, Car, Shirt, Phone, Utensils, Drama, ShoppingBasket, Gift, HeartPulse, House, PawPrint, Dumbbell, CarTaxiFront, Bath, Bus,
  BookOpen, Wallet, Landmark, PiggyBank, Banknote, CreditCard, Baby, Coffee, Plane, Train, Fuel, Gamepad2, Music, Pill, Smartphone,
  Wifi, Zap, Droplets, Cpu, Briefcase, GraduationCap, Bitcoin, Euro, DollarSign, Coins, HandCoins, Cookie, Beer, Scissors, Wrench,
  ShoppingBag, Film, Bike, Laptop, Stethoscope, type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  tag: Tag, car: Car, shirt: Shirt, phone: Phone, utensils: Utensils, drama: Drama, "shopping-basket": ShoppingBasket, gift: Gift,
  "heart-pulse": HeartPulse, house: House, "paw-print": PawPrint, dumbbell: Dumbbell, "car-taxi-front": CarTaxiFront, bath: Bath, bus: Bus,
  "book-open": BookOpen, wallet: Wallet, landmark: Landmark, "piggy-bank": PiggyBank, banknote: Banknote, "credit-card": CreditCard,
  baby: Baby, coffee: Coffee, plane: Plane, train: Train, fuel: Fuel, gamepad: Gamepad2, music: Music, pill: Pill, smartphone: Smartphone,
  wifi: Wifi, zap: Zap, droplets: Droplets, cpu: Cpu, briefcase: Briefcase, "graduation-cap": GraduationCap, bitcoin: Bitcoin, euro: Euro,
  dollar: DollarSign, coins: Coins, "hand-coins": HandCoins, cookie: Cookie, beer: Beer, scissors: Scissors, wrench: Wrench,
  "shopping-bag": ShoppingBag, film: Film, bike: Bike, laptop: Laptop, stethoscope: Stethoscope,
};
export const COLORS = ["#e05780","#e4572e","#ff8a5b","#e9b949","#f4c430","#7ed957","#2ecc8c","#4ecdc4","#06b6d4","#5aa9e6","#4a90d9","#4a6cf7","#c86bfa","#ff6b9e","#b08968","#9ca3af"];

export function Icon({ name, color, size = 36, strokeWidth = 1.4 }: { name: string; color?: string | undefined; size?: number; strokeWidth?: number }) {
  const C = ICONS[name] ?? Tag;
  return <C size={size} strokeWidth={strokeWidth} style={color ? { color } : undefined} />;
}
