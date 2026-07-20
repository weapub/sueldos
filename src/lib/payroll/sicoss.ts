import type { Money } from "./money";

/**
 * Exportación SICOSS simplificada (subconjunto reducido de campos).
 *
 * ADVERTENCIA: el layout real de AFIP/ARCA para la DDJJ de aportes y contribuciones
 * (SICOSS) tiene ~80 campos de ancho fijo y se actualiza periódicamente por la
 * normativa vigente. Este módulo NO implementa el formato oficial completo — genera
 * un archivo de ancho fijo con los campos más comunes (CUIL, CUIT empleador, período,
 * remuneración total e imponible, días trabajados) a modo de base de trabajo. Validar
 * contra la especificación oficial vigente antes de usarlo para presentar una DDJJ real.
 */

export interface SicossRecordInput {
  cuil: string;
  apellidoNombre: string;
  cuitEmpleador: string;
  anio: number;
  mes: number;
  codigoModalidad: string;
  obraSocial: string;
  remuneracionTotal: Money;
  remuneracionImponible1: Money;
  diasTrabajados: number;
}

export function buildSicossRecords(inputs: SicossRecordInput[]): SicossRecordInput[] {
  return inputs;
}

function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

function padNumero(valor: number | string, largo: number): string {
  return String(valor).padStart(largo, "0").slice(-largo);
}

function padTexto(valor: string, largo: number): string {
  return valor.toUpperCase().slice(0, largo).padEnd(largo, " ");
}

/** Montos en centavos, sin separadores, ancho fijo (convención habitual de los DAT de AFIP). */
function padMonto(valor: Money, largo: number): string {
  const centavos = valor.times(100).toDecimalPlaces(0).toString();
  return padNumero(centavos, largo);
}

function formatRecord(r: SicossRecordInput): string {
  return [
    padNumero(soloDigitos(r.cuil), 11),
    padTexto(r.apellidoNombre, 30),
    padNumero(soloDigitos(r.cuitEmpleador), 11),
    padNumero(r.anio, 4) + padNumero(r.mes, 2),
    padTexto(r.codigoModalidad, 2),
    padTexto(r.obraSocial, 6),
    padMonto(r.remuneracionTotal, 12),
    padMonto(r.remuneracionImponible1, 12),
    padNumero(r.diasTrabajados, 2),
  ].join("");
}

export function formatSicossFile(records: SicossRecordInput[]): string {
  return records.map(formatRecord).join("\r\n") + "\r\n";
}
