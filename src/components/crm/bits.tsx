"use client";
import { CircleCheck, Stethoscope, TriangleAlert } from "lucide-react";
import { origin } from "@/lib/constants";
import { Chip } from "@/components/ui/chip";
import type { Lead } from "@/lib/types";

export function OriginChip({ value, short }: { value: string; short?: boolean }) {
  const o = origin(value);
  return (
    <Chip color={o.color}>
      <o.icon />
      {short ? o.short : o.label}
    </Chip>
  );
}

export function VetChip({ lead, compact }: { lead: Lead; compact?: boolean }) {
  return lead.isVet ? (
    <Chip color="var(--sky)" title="Veterinário(a)">
      <Stethoscope />
      {!compact && "Vet"}
    </Chip>
  ) : (
    <Chip color="var(--coral)" title="Não é veterinário (tráfego sujo)">
      <TriangleAlert />
      {!compact && "Não vet"}
    </Chip>
  );
}

export function ConvertedChip({ lead }: { lead: Lead }) {
  if (!lead.converted) return null;
  return (
    <Chip color="var(--ok)">
      <CircleCheck />
      Cliente{lead.serviceMonths ? ` · ${lead.serviceMonths} ${lead.serviceMonths > 1 ? "meses" : "mês"}` : ""}
    </Chip>
  );
}

/** Destaca o termo buscado dentro de um texto. */
export function Hl({ text, q }: { text: string; q: string }) {
  if (!q || !text) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}
