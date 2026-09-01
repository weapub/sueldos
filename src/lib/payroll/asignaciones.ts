import { type Money, ZERO, round2, sum } from "./money";

export type TipoAsignacion = "HIJO" | "HIJO_DISCAPACIDAD" | "PRENATAL" | "AYUDA_ESCOLAR";
export type VinculoFamiliar = "HIJO" | "HIJO_CON_DISCAPACIDAD" | "CONYUGE" | "OTRO";

export interface FamiliarInput {
  vinculo: VinculoFamiliar;
  fechaNacimiento?: Date | null;
  enEscolaridad: boolean;
}

export interface EscalaRow {
  tipo: TipoAsignacion;
  zona: string;
  igfDesde: Money;
  igfHasta: Money | null;
  monto: Money;
}

export interface AsignacionesInput {
  familiares: FamiliarInput[];
  conyugeEmbarazada: boolean;
  /** Ingreso del Grupo Familiar; define el tramo de la escala. */
  igf: Money;
  zona: string;
  /** true en el mes en que corresponde la ayuda escolar anual (marzo / presentación de certificado). */
  esMesAyudaEscolar: boolean;
  /** Fecha del período — para el tope de edad de HIJO (menor de 18). */
  fechaReferencia: Date;
  escala: EscalaRow[];
}

export interface LineaAsignacion {
  tipo: TipoAsignacion;
  descripcion: string;
  cantidad: number;
  montoUnitario: Money;
  montoTotal: Money;
}

export interface AsignacionesResult {
  lineas: LineaAsignacion[];
  total: Money;
  warnings: string[];
}

function aniosCumplidos(nacimiento: Date, ref: Date): number {
  let a = ref.getUTCFullYear() - nacimiento.getUTCFullYear();
  const cumpleEsteAnio = new Date(
    Date.UTC(ref.getUTCFullYear(), nacimiento.getUTCMonth(), nacimiento.getUTCDate()),
  );
  if (ref < cumpleEsteAnio) a -= 1;
  return a;
}

/** Monto de la escala para un tipo, según IGF y zona (con fallback a zona GENERAL). Devuelve 0 si el IGF supera el tope o no hay fila cargada. */
function montoEscala(
  escala: EscalaRow[],
  tipo: TipoAsignacion,
  igf: Money,
  zona: string,
): Money {
  const candidatas = escala.filter(
    (r) =>
      r.tipo === tipo &&
      (r.zona === zona || r.zona === "GENERAL") &&
      igf.gte(r.igfDesde) &&
      (r.igfHasta === null || igf.lte(r.igfHasta)),
  );
  if (candidatas.length === 0) return ZERO;
  // Preferir la fila de la zona exacta antes que GENERAL; entre varias, el tramo más específico (igfDesde mayor).
  candidatas.sort((a, b) => {
    if (a.zona !== b.zona) return a.zona === zona ? -1 : 1;
    return b.igfDesde.minus(a.igfDesde).toNumber();
  });
  return candidatas[0].monto;
}

/**
 * Cálculo INFORMATIVO de asignaciones familiares (SUAF). ANSES las paga directo al
 * trabajador; no integran el recibo ni el neto. Cubre hijo, hijo con discapacidad,
 * prenatal y ayuda escolar anual.
 */
export function calcularAsignacionesInformativas(input: AsignacionesInput): AsignacionesResult {
  const lineas: LineaAsignacion[] = [];
  const warnings: string[] = [];

  const hijos = input.familiares.filter((f) => f.vinculo === "HIJO");
  const hijosDisc = input.familiares.filter((f) => f.vinculo === "HIJO_CON_DISCAPACIDAD");

  // HIJO (menores de 18).
  let sinFecha = 0;
  const hijosMenores = hijos.filter((f) => {
    if (!f.fechaNacimiento) {
      sinFecha++;
      return true;
    }
    return aniosCumplidos(f.fechaNacimiento, input.fechaReferencia) < 18;
  });
  if (sinFecha > 0) {
    warnings.push(`${sinFecha} hijo/s sin fecha de nacimiento — no se verificó el tope de 18 años.`);
  }
  if (hijosMenores.length > 0) {
    const u = montoEscala(input.escala, "HIJO", input.igf, input.zona);
    if (u.lte(0)) {
      warnings.push(
        "Sin monto de asignación por hijo para ese IGF/zona (¿supera el tope o falta cargar la escala?).",
      );
    }
    lineas.push({
      tipo: "HIJO",
      descripcion: "Asignación por hijo",
      cantidad: hijosMenores.length,
      montoUnitario: u,
      montoTotal: round2(u.times(hijosMenores.length)),
    });
  }

  // HIJO CON DISCAPACIDAD (sin tope de edad ni de IGF).
  if (hijosDisc.length > 0) {
    const u = montoEscala(input.escala, "HIJO_DISCAPACIDAD", input.igf, input.zona);
    if (u.lte(0)) {
      warnings.push("Falta cargar la escala de asignación por hijo con discapacidad.");
    }
    lineas.push({
      tipo: "HIJO_DISCAPACIDAD",
      descripcion: "Asignación por hijo con discapacidad",
      cantidad: hijosDisc.length,
      montoUnitario: u,
      montoTotal: round2(u.times(hijosDisc.length)),
    });
  }

  // PRENATAL.
  if (input.conyugeEmbarazada) {
    const u = montoEscala(input.escala, "PRENATAL", input.igf, input.zona);
    lineas.push({
      tipo: "PRENATAL",
      descripcion: "Asignación prenatal",
      cantidad: 1,
      montoUnitario: u,
      montoTotal: u,
    });
  }

  // AYUDA ESCOLAR ANUAL.
  if (input.esMesAyudaEscolar) {
    const enEscuela = [...hijosMenores, ...hijosDisc].filter((f) => f.enEscolaridad).length;
    if (enEscuela > 0) {
      const u = montoEscala(input.escala, "AYUDA_ESCOLAR", input.igf, input.zona);
      lineas.push({
        tipo: "AYUDA_ESCOLAR",
        descripcion: "Ayuda escolar anual",
        cantidad: enEscuela,
        montoUnitario: u,
        montoTotal: round2(u.times(enEscuela)),
      });
    }
  }

  return {
    lineas,
    total: sum(lineas.map((l) => l.montoTotal)),
    warnings,
  };
}
