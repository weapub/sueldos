import type { Money } from "./money";

/**
 * Libro de Sueldos Digital (LSD) — TXT posicional de ancho fijo, reemplaza el libro físico
 * de sueldos y jornales del art. 52 LCT (Ley 27.802 §3.2). Es un artefacto DISTINTO del
 * SICOSS (`sicoss.ts`, pensado como aproximación a la DDJJ F931 de aportes/contribuciones) —
 * no reemplaza ni reutiliza ese módulo.
 *
 * Anchos de campo para los registros 02, 03 y 05 fueron verificados byte a byte contra las
 * fórmulas reales de concatenación de `GONZALEZ.xlsm` (hojas REG 2/REG 3/REG 5, longitudes de
 * control 115/51/65 respectivamente — coinciden exactas con lo calculado acá).
 *
 * El registro 01 se infirió de la lista de campos de la hoja REG 1 (esa hoja no tenía la fila
 * de datos completa en el archivo de referencia, así que no hay fórmula de la que verificar
 * el ancho exacto). El registro 04 (49 campos, varias tablas de codificación específicas de
 * SICOSS/DeL que no están disponibles) se reconstruyó a partir de la lista de campos con
 * mejor esfuerzo — ver advertencia en `formatRegistro04`.
 *
 * ADVERTENCIA: antes de presentar un LSD real, validar el registro 01 y el registro 04 contra
 * la especificación vigente de ARCA — son los dos tramos no verificados byte a byte acá.
 */

function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

function ceroIzquierda(valor: string | number, largo: number): string {
  return String(valor).slice(0, largo).padStart(largo, "0");
}

function espacioDerecha(valor: string, largo: number): string {
  return valor.toUpperCase().slice(0, largo).padEnd(largo, " ");
}

function espacioIzquierda(valor: string, largo: number): string {
  return valor.slice(0, largo).padStart(largo, " ");
}

function fechaAAAAMMDD(fecha: Date): string {
  return `${fecha.getUTCFullYear()}${ceroIzquierda(fecha.getUTCMonth() + 1, 2)}${ceroIzquierda(fecha.getUTCDate(), 2)}`;
}

/** Montos en centavos (×100), sin separadores, ancho fijo — convención de los DAT/TXT de ARCA. */
function montoFijo(valor: Money, largo: number): string {
  const centavos = valor.times(100).toDecimalPlaces(0).toString();
  return ceroIzquierda(centavos, largo);
}

// ---------- Registro 01: datos referenciales de la liquidación (única fila por archivo) ----------

export interface Registro01Input {
  cuitEmpleador: string;
  identificacionEnvio: string;
  anio: number;
  mes: number;
  tipoLiquidacion: "M" | "Q" | "D" | "H"; // mensual/quincenal/diario/horario
  numeroLiquidacion: string;
  diasBase: number;
  cantidadRegistros04: number;
}

export function formatRegistro01(r: Registro01Input): string {
  return [
    "01",
    ceroIzquierda(soloDigitos(r.cuitEmpleador), 11),
    espacioDerecha(r.identificacionEnvio, 15),
    `${r.anio}${ceroIzquierda(r.mes, 2)}`,
    r.tipoLiquidacion,
    espacioDerecha(r.numeroLiquidacion, 10),
    ceroIzquierda(r.diasBase, 2),
    ceroIzquierda(r.cantidadRegistros04, 5),
  ].join("");
}

// ---------- Registro 02: datos generales de la liquidación — una fila por empleado ----------

export interface Registro02Input {
  cuil: string;
  legajo?: string;
  dependenciaRevista?: string;
  cbu?: string;
  cantDiasProporcionarTope?: number;
  fechaPago: Date;
  fechaRubrica?: Date;
  formaPago: 1 | 2 | 3; // 1=efectivo, 2=cheque, 3=acreditación
}

export function formatRegistro02(r: Registro02Input): string {
  return [
    "02",
    ceroIzquierda(soloDigitos(r.cuil), 11),
    espacioDerecha(r.legajo ?? "", 10),
    espacioDerecha(r.dependenciaRevista ?? "", 50),
    espacioIzquierda(r.cbu ?? "", 22),
    ceroIzquierda(r.cantDiasProporcionarTope ?? 0, 3),
    fechaAAAAMMDD(r.fechaPago),
    espacioIzquierda(r.fechaRubrica ? fechaAAAAMMDD(r.fechaRubrica) : "", 8),
    ceroIzquierda(r.formaPago, 1),
  ].join("");
}

// ---------- Registro 03: detalle de conceptos liquidados por empleado ----------

export interface Registro03Input {
  cuil: string;
  codigoConcepto: string; // código propio del empleador
  cantidad: Money; // formato 999,99 (3 enteros + 2 decimales)
  unidad?: string; // $ = moneda; % = porcentual; A/Q/M/D/H = año/quincena/mes/día/hora
  importe: Money;
  debitoCredito: "D" | "C";
  periodoAjuste?: { anio: number; mes: number };
}

export function formatRegistro03(r: Registro03Input): string {
  return [
    "03",
    ceroIzquierda(soloDigitos(r.cuil), 11),
    espacioDerecha(r.codigoConcepto, 10),
    montoFijo(r.cantidad, 5),
    espacioDerecha(r.unidad ?? "", 1),
    montoFijo(r.importe, 15),
    r.debitoCredito,
    r.periodoAjuste ? `${r.periodoAjuste.anio}${ceroIzquierda(r.periodoAjuste.mes, 2)}` : espacioDerecha("", 6),
  ].join("");
}

// ---------- Registro 04: atributos de la relación laboral (DJ F931) — mejor esfuerzo ----------

export interface Registro04Input {
  cuil: string;
  conyuge: boolean;
  cantidadHijos: number;
  marcaCCT: boolean;
  marcaSCVO: boolean;
  marcaCorrespondeReduccion: boolean;
  tipoEmpresa: number;
  codigoSituacion: number;
  codigoCondicion: number;
  codigoActividad: number;
  codigoModalidadContratacion: number;
  codigoSiniestrado: number;
  codigoLocalidad: number;
  situacionRevista1?: number;
  diaInicioRevista1?: number;
  situacionRevista2?: number;
  diaInicioRevista2?: number;
  situacionRevista3?: number;
  diaInicioRevista3?: number;
  cantDiasTrabajados: number;
  horasTrabajadas: number;
  codigoObraSocial: string;
  remuneracionBruta: Money;
  basesImponibles: Money[]; // [1..9], en ese orden
  baseImponible10: Money;
  importeADetraer: Money;
}

const CERO = 0;

/**
 * Reconstruido a partir de la lista de campos de la hoja REG 4 (49 columnas) — NO se pudo
 * verificar byte a byte porque la fórmula original excede lo que se pudo confirmar con
 * certeza para cada campo. Los campos que este sistema no releva (aporte/contribución
 * adicional obra social, bases diferenciales, remuneración por maternidad ANSES, cantidad de
 * adherentes, porcentaje de aporte adicional SS) se completan en 0 — no se inventan valores.
 *
 * DATO CONCRETO PARA VALIDAR: la hoja REG 4 declara un ancho total de control de 370
 * posiciones; esta implementación produce 364 — hay un desvío de 6 posiciones en algún campo
 * (candidatos más probables: código condición/modalidad de contratación/siniestrado, que son
 * alfanuméricos "según tabla de codificación específica" sin ancho confirmado, o tipo de
 * operación). Revisar campo por campo contra la especificación vigente antes de presentar un
 * LSD real — no usar a ciegas.
 */
export function formatRegistro04(r: Registro04Input): string {
  const [b1, b2, b3, b4, b5, b6, b7, b8, b9] = r.basesImponibles;
  return [
    "04",
    ceroIzquierda(soloDigitos(r.cuil), 11),
    r.conyuge ? "1" : "0",
    ceroIzquierda(r.cantidadHijos, 2),
    r.marcaCCT ? "1" : "0",
    r.marcaSCVO ? "1" : "0",
    r.marcaCorrespondeReduccion ? "1" : "0",
    ceroIzquierda(r.tipoEmpresa, 1),
    "0", // tipo de operación — valor fijo '0'
    ceroIzquierda(r.codigoSituacion, 2),
    espacioDerecha(String(r.codigoCondicion), 2),
    ceroIzquierda(r.codigoActividad, 3),
    espacioDerecha(String(r.codigoModalidadContratacion), 3),
    espacioDerecha(String(r.codigoSiniestrado), 2),
    ceroIzquierda(r.codigoLocalidad, 2),
    ceroIzquierda(r.situacionRevista1 ?? CERO, 2),
    ceroIzquierda(r.diaInicioRevista1 ?? CERO, 2),
    ceroIzquierda(r.situacionRevista2 ?? CERO, 2),
    ceroIzquierda(r.diaInicioRevista2 ?? CERO, 2),
    ceroIzquierda(r.situacionRevista3 ?? CERO, 2),
    ceroIzquierda(r.diaInicioRevista3 ?? CERO, 2),
    ceroIzquierda(r.cantDiasTrabajados, 2),
    ceroIzquierda(r.horasTrabajadas, 2),
    ceroIzquierda(CERO, 3), // porcentaje aporte adicional SS — no relevado
    ceroIzquierda(CERO, 2), // contribución tarea diferencial — no relevado
    espacioDerecha(r.codigoObraSocial, 6),
    ceroIzquierda(CERO, 2), // cantidad adherentes — no relevado
    montoFijo(r.remuneracionBruta.mul(0), 15), // aporte adicional OS — no relevado
    montoFijo(r.remuneracionBruta.mul(0), 15), // contribución adicional OS — no relevado
    montoFijo(r.remuneracionBruta.mul(0), 15), // base diferencial aportes OS/FSR — no relevado
    montoFijo(r.remuneracionBruta.mul(0), 15), // base diferencial OS/FSR — no relevado
    montoFijo(r.remuneracionBruta.mul(0), 15), // base diferencial LRT — no relevado
    montoFijo(r.remuneracionBruta.mul(0), 15), // remuneración maternidad ANSES — no relevado
    montoFijo(r.remuneracionBruta, 15),
    montoFijo(b1 ?? r.remuneracionBruta.mul(0), 15),
    montoFijo(b2 ?? r.remuneracionBruta.mul(0), 15),
    montoFijo(b3 ?? r.remuneracionBruta.mul(0), 15),
    montoFijo(b4 ?? r.remuneracionBruta.mul(0), 15),
    montoFijo(b5 ?? r.remuneracionBruta.mul(0), 15),
    montoFijo(b6 ?? r.remuneracionBruta.mul(0), 15),
    montoFijo(b7 ?? r.remuneracionBruta.mul(0), 15),
    montoFijo(b8 ?? r.remuneracionBruta.mul(0), 15),
    montoFijo(b9 ?? r.remuneracionBruta.mul(0), 15),
    montoFijo(r.remuneracionBruta.mul(0), 15), // base dif. aporte Seg. Social — no relevado
    montoFijo(r.remuneracionBruta.mul(0), 15), // base dif. contribución Seg. Social — no relevado
    montoFijo(r.baseImponible10, 15),
    montoFijo(r.importeADetraer, 15),
  ].join("");
}

// ---------- Registro 05: trabajadores eventuales (modalidad 102 en registro 04) ----------

export interface Registro05Input {
  cuil: string;
  categoriaProfesional: string;
  puestoDesempenado: string;
  fechaIngreso: Date;
  fechaEgreso?: Date;
  remuneracion: Money;
  cuitEmpleador: string;
}

export function formatRegistro05(r: Registro05Input): string {
  return [
    "05",
    ceroIzquierda(soloDigitos(r.cuil), 11),
    ceroIzquierda(r.categoriaProfesional, 6),
    ceroIzquierda(r.puestoDesempenado, 4),
    fechaAAAAMMDD(r.fechaIngreso),
    r.fechaEgreso ? fechaAAAAMMDD(r.fechaEgreso) : ceroIzquierda("", 8),
    montoFijo(r.remuneracion, 15),
    ceroIzquierda(soloDigitos(r.cuitEmpleador), 11),
  ].join("");
}

// ---------- Armado del archivo completo ----------

export interface LsdFileInput {
  registro01: Registro01Input;
  registros02: Registro02Input[];
  registros03: Registro03Input[];
  registros04: Registro04Input[];
  registros05?: Registro05Input[];
}

/** Orden fijo: 1 registro 01, luego todos los 02, todos los 03, todos los 04, todos los 05. */
export function formatLsdFile(input: LsdFileInput): string {
  const lineas = [
    formatRegistro01(input.registro01),
    ...input.registros02.map(formatRegistro02),
    ...input.registros03.map(formatRegistro03),
    ...input.registros04.map(formatRegistro04),
    ...(input.registros05 ?? []).map(formatRegistro05),
  ];
  return lineas.join("\r\n") + "\r\n";
}
