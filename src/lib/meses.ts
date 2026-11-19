/* Mês de trabalho do lead ("2026-11").
 *
 * Tudo aqui é feito em cima da string, sem `new Date`, de propósito: `new Date("2026-11-01")`
 * é meia-noite em UTC, o que no Brasil cai no dia 31 do mês anterior e faria o lead
 * aparecer no mês errado por três horas de diferença. */

import { MONTHS, MONTHS_LONG } from "./constants";
import { today } from "./utils";

/** Mês de uma data ISO ("2026-11-19" ou "2026-11-19T10:00:00Z"). */
export const mesDe = (iso: string) => (iso || today()).slice(0, 7);

export const mesAtual = () => today().slice(0, 7);

export const mesValido = (m: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m);

/** Anda n meses para frente (n positivo) ou para trás (n negativo). */
export function mesSoma(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const total = a * 12 + (m - 1) + n;
  const ano = Math.floor(total / 12);
  return `${ano}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** "Novembro de 2026" */
export function mesLabel(mes: string) {
  if (!mesValido(mes)) return mes;
  const [a, m] = mes.split("-");
  return `${MONTHS_LONG[Number(m) - 1]} de ${a}`;
}

/** "Nov/26" — para chips e cabeçalhos apertados. */
export function mesCurto(mes: string) {
  if (!mesValido(mes)) return mes;
  const [a, m] = mes.split("-");
  return `${MONTHS[Number(m) - 1]}/${a.slice(2)}`;
}

/** "Novembro", "Dezembro"… sem o ano, quando o ano já está claro no contexto. */
export function mesNome(mes: string) {
  return mesValido(mes) ? MONTHS_LONG[Number(mes.split("-")[1]) - 1] : mes;
}

/** Quantos meses de distância, com sinal: passado é negativo. */
export function mesDistancia(de: string, para: string) {
  const [a1, m1] = de.split("-").map(Number);
  const [a2, m2] = para.split("-").map(Number);
  return a2 * 12 + m2 - (a1 * 12 + m1);
}

/**
 * Como se escreve o mês em relação a hoje: "este mês", "mês passado", "Setembro de 2026".
 * Evita a pessoa ter que calcular de cabeça a que distância está o mês que está vendo.
 */
export function mesRelativo(mes: string, hoje = mesAtual()) {
  const d = mesDistancia(hoje, mes);
  if (d === 0) return "este mês";
  if (d === -1) return "mês passado";
  if (d === 1) return "mês que vem";
  return mesLabel(mes);
}
