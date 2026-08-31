import { z } from "zod";

/**
 * Campos de la "Constancia del Trabajador – Alta" que emite ARCA (ex AFIP) por la
 * Simplificación Registral. Se extraen con visión (ver `extraerAlta.ts`).
 *
 * TODOS los campos son `.nullable()`: la constancia suele venir escaneada, rotada y
 * con baja calidad, así que cualquier campo puede resultar ilegible. El consumidor
 * (`mapearAlta.ts`) tiene que tolerar `null` en todos.
 */
export const altaArcaExtraidaSchema = z.object({
  // Cabecera – empleador
  empleadorCuit: z.string().nullable(),
  empleadorRazonSocial: z.string().nullable(),

  // Datos del empleado
  empleadoApellido: z.string().nullable(),
  empleadoNombres: z.string().nullable(),
  empleadoApellidoNombreCrudo: z.string().nullable(),
  empleadoCuil: z.string().nullable(),

  fechaInicio: z.string().nullable(), // ISO YYYY-MM-DD
  fechaCese: z.string().nullable(),

  obraSocialCodigo: z.string().nullable(),
  obraSocialNombre: z.string().nullable(),

  modalidadContratoCodigo: z.string().nullable(), // ej. "008"
  modalidadContratoDescripcion: z.string().nullable(),

  situacionRevistaCodigo: z.string().nullable(), // ej. "01"
  regimen: z.string().nullable(), // ej. "SIPA"

  convenioCodigo: z.string().nullable(), // ej. "0130/75"
  convenioDescripcion: z.string().nullable(),

  categoriaCodigo: z.string().nullable(), // ej. "007511"
  categoriaDescripcion: z.string().nullable(), // ej. "CATEGORIA A - MAESTRANZA Y SERVICIOS"

  puestoCodigo: z.string().nullable(), // ej. "5220"
  puestoDescripcion: z.string().nullable(),

  remuneracionPactada: z.number().nullable(), // número plano, sin separador de miles
  modalidadLiquidacion: z.string().nullable(), // ej. "1 - MES"

  domicilioExplotacion: z.string().nullable(),
  codigoPostal: z.string().nullable(),
  localidad: z.string().nullable(),
  provincia: z.string().nullable(),

  actividadEconomicaCodigo: z.string().nullable(), // ej. "472112"
  actividadEconomicaDescripcion: z.string().nullable(),
});

export type AltaArcaExtraida = z.infer<typeof altaArcaExtraidaSchema>;

/** MIME types aceptados para la foto/PDF del alta. */
export const MEDIA_TYPES_ACEPTADOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export type MediaTypeAceptado = (typeof MEDIA_TYPES_ACEPTADOS)[number];

export function esMediaTypeAceptado(t: string): t is MediaTypeAceptado {
  return (MEDIA_TYPES_ACEPTADOS as readonly string[]).includes(t);
}

/** Tamaño máximo del archivo subido (bytes). El límite de Server Actions en `next.config.ts` va por encima. */
export const TAMANO_MAX_ARCHIVO = 10 * 1024 * 1024;
