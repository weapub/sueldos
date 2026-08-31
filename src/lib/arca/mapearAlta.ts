import type { TipoContrato, ModalidadRemuneracion } from "@/generated/prisma/enums";
import type { AltaArcaExtraida } from "@/lib/arca/schema";

// Marcas diacríticas combinantes (U+0300–U+036F), construido así para no depender
// de caracteres invisibles en el fuente.
const DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");

/** Normaliza texto para comparar: mayúsculas, sin acentos, sin puntuación, espacios colapsados. */
function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function limpio(s: string | null | undefined): string | undefined {
  const t = (s ?? "").trim();
  return t.length > 0 ? t : undefined;
}

/** Formatea un CUIT/CUIL a `NN-NNNNNNNN-N`. Si no tiene 11 dígitos, devuelve el original recortado. */
export function formatCuit(raw: string | null | undefined): string | undefined {
  const t = limpio(raw);
  if (!t) return undefined;
  const d = t.replace(/\D/g, "");
  if (d.length !== 11) return t;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

/**
 * Códigos de "Modalidad de contratación" de ARCA → `TipoContrato` del legajo.
 * Solo se mapean los códigos de significado inequívoco; el resto cae al análisis
 * de la descripción y, si tampoco alcanza, queda sin definir (el form usa su default).
 */
export const MODALIDAD_CONTRATO_ARCA: Record<string, TipoContrato> = {
  "008": "TIEMPO_INDETERMINADO", // a tiempo completo indeterminado
  "009": "PART_TIME", // a tiempo parcial indeterminado
  "010": "PLAZO_FIJO", // a tiempo completo determinado (plazo fijo)
  "011": "PLAZO_FIJO", // a tiempo parcial determinado
};

function tipoContratoDesdeDescripcion(desc: string): TipoContrato | undefined {
  const n = normalizar(desc);
  if (n.includes("TEMPORADA")) return "TEMPORADA";
  if (n.includes("EVENTUAL")) return "EVENTUAL";
  if (n.includes("PARCIAL")) return "PART_TIME";
  if (n.includes("PLAZO FIJO") || n.includes("DETERMINADO")) {
    return n.includes("INDETERMINADO") ? "TIEMPO_INDETERMINADO" : "PLAZO_FIJO";
  }
  if (n.includes("INDETERMINADO")) return "TIEMPO_INDETERMINADO";
  return undefined;
}

export function mapearTipoContrato(alta: AltaArcaExtraida): TipoContrato | undefined {
  const cod = limpio(alta.modalidadContratoCodigo)?.replace(/\D/g, "").padStart(3, "0");
  if (cod && MODALIDAD_CONTRATO_ARCA[cod]) return MODALIDAD_CONTRATO_ARCA[cod];
  const desc = limpio(alta.modalidadContratoDescripcion);
  return desc ? tipoContratoDesdeDescripcion(desc) : undefined;
}

export function mapearModalidadRemuneracion(
  alta: AltaArcaExtraida,
): ModalidadRemuneracion | undefined {
  const raw = limpio(alta.modalidadLiquidacion);
  if (!raw) return undefined;
  const n = normalizar(raw);
  if (n.includes("HORA")) return "HORA";
  if (n.includes("JORNAL") || n.includes("DIA")) return "JORNAL";
  if (n.includes("MES") || /\b0*1\b/.test(n)) return "MENSUAL";
  return undefined;
}

/** Deriva apellido / nombres a partir del campo crudo "APELLIDO(S) NOMBRE(S)". */
function partirApellidoNombre(crudo: string): { apellido?: string; nombre?: string } {
  const partes = crudo.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return {};
  if (partes.length === 1) return { apellido: partes[0] };
  return { apellido: partes[0], nombre: partes.slice(1).join(" ") };
}

export type LegajoDesdeAlta = {
  cuil?: string;
  nombre?: string;
  apellido?: string;
  fechaIngreso?: string; // YYYY-MM-DD
  sueldoBasico?: string; // string para prellenar <input type="number">
  obraSocial?: string;
  tipoContrato?: TipoContrato;
  modalidadRemuneracion?: ModalidadRemuneracion;
};

export function mapearAltaALegajo(alta: AltaArcaExtraida): LegajoDesdeAlta {
  let apellido = limpio(alta.empleadoApellido);
  let nombre = limpio(alta.empleadoNombres);
  const crudo = limpio(alta.empleadoApellidoNombreCrudo);
  if ((!apellido || !nombre) && crudo) {
    const p = partirApellidoNombre(crudo);
    apellido = apellido ?? p.apellido;
    nombre = nombre ?? p.nombre;
  }

  const fecha = limpio(alta.fechaInicio);
  const fechaIngreso = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : undefined;

  const sueldo =
    alta.remuneracionPactada != null && alta.remuneracionPactada > 0
      ? String(alta.remuneracionPactada)
      : undefined;

  return {
    cuil: formatCuit(alta.empleadoCuil),
    nombre,
    apellido,
    fechaIngreso,
    sueldoBasico: sueldo,
    obraSocial: limpio(alta.obraSocialNombre),
    tipoContrato: mapearTipoContrato(alta),
    modalidadRemuneracion: mapearModalidadRemuneracion(alta),
  };
}

export type EmpresaDesdeAlta = Partial<
  Record<"razonSocial" | "cuit" | "actividad" | "provincia" | "direccion", string>
>;

export function mapearAltaAEmpresa(alta: AltaArcaExtraida): EmpresaDesdeAlta {
  const out: EmpresaDesdeAlta = {};

  const razonSocial = limpio(alta.empleadorRazonSocial);
  if (razonSocial) out.razonSocial = razonSocial;

  const cuit = formatCuit(alta.empleadorCuit);
  if (cuit) out.cuit = cuit;

  const actCod = limpio(alta.actividadEconomicaCodigo);
  const actDesc = limpio(alta.actividadEconomicaDescripcion);
  const actividad = [actCod, actDesc].filter(Boolean).join(" - ");
  if (actividad) out.actividad = actividad;

  const provincia = limpio(alta.provincia);
  if (provincia) out.provincia = provincia;

  const dom = limpio(alta.domicilioExplotacion);
  const loc = limpio(alta.localidad);
  const cp = limpio(alta.codigoPostal);
  const direccion = [
    dom,
    loc && normalizar(loc) !== normalizar(provincia ?? "") ? loc : undefined,
    cp ? `CP ${cp}` : undefined,
  ]
    .filter(Boolean)
    .join(", ");
  if (direccion) out.direccion = direccion;

  return out;
}

/**
 * Busca, entre las categorías de convenio ya cargadas de la empresa, la que
 * corresponde al convenio/categoría del alta. Devuelve el `id` o `null`.
 */
export function matchCategoria(
  alta: AltaArcaExtraida,
  categorias: { id: string; nombre: string }[],
): string | null {
  const candidatos = [alta.categoriaDescripcion, alta.categoriaCodigo]
    .map((c) => limpio(c))
    .filter((c): c is string => !!c)
    .map(normalizar);
  if (candidatos.length === 0) return null;

  for (const cat of categorias) {
    const n = normalizar(cat.nombre);
    if (n.length === 0) continue;
    for (const cand of candidatos) {
      if (cand === n) return cat.id;
      if (n.length >= 4 && (cand.includes(n) || n.includes(cand))) return cat.id;
    }
  }
  return null;
}

const ETIQUETAS_EMPRESA: Record<keyof EmpresaDesdeAlta, string> = {
  razonSocial: "Razón social",
  cuit: "CUIT",
  actividad: "Actividad",
  provincia: "Provincia",
  direccion: "Domicilio",
};

export type CambioEmpresa = {
  campo: keyof EmpresaDesdeAlta;
  etiqueta: string;
  actual: string;
  detectado: string;
};

/** Diferencias entre los datos actuales de la empresa y lo detectado en el alta. */
export function diffEmpresa(
  actual: Partial<Record<keyof EmpresaDesdeAlta, string | null | undefined>>,
  detectado: EmpresaDesdeAlta,
): CambioEmpresa[] {
  const cambios: CambioEmpresa[] = [];
  for (const campo of Object.keys(ETIQUETAS_EMPRESA) as (keyof EmpresaDesdeAlta)[]) {
    const nuevo = detectado[campo];
    if (!nuevo) continue;
    const viejo = (actual[campo] ?? "").trim();
    if (normalizar(viejo) === normalizar(nuevo)) continue;
    cambios.push({ campo, etiqueta: ETIQUETAS_EMPRESA[campo], actual: viejo, detectado: nuevo });
  }
  return cambios;
}
