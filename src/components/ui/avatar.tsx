import { cn, initials } from "@/lib/utils";

const TONES = [
  ["#d9f0ec", "#11594f"],
  ["#fbecd2", "#7a4d06"],
  ["#dfe9f7", "#1f4f86"],
  ["#efe4f8", "#5f2d8e"],
  ["#fbe1dc", "#8f2f20"],
  ["#e5efd9", "#3f5d1c"],
  ["#dceff6", "#145c74"],
];

function tone(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

export function Avatar({ name, size = 34, className, label }: { name: string; size?: number; className?: string; label?: string }) {
  const [bg, fg] = tone(name || "?");
  return (
    <span
      className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold", className)}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.36), background: bg, color: fg }}
      aria-hidden
    >
      {label ?? initials(name)}
    </span>
  );
}
