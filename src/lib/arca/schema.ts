import { z } from "zod";

/**
 * Campos de la "Constancia del Trabajador – Alta" que emite ARCA (ex AFIP) por la
 * Simplificación Registral. Se extraen con visión (ver `extraerAlta.ts`).
 *
 * NINGÚN campo es `.nullable()`: la API de Structured Outputs limita a 16 los campos
 * con tipos unión (`anyOf`), y acá hay ~28 campos. En su lugar, el modelo devuelve
 * cadena vacía `""` (o `0` en montos) cuando algo es ilegible; el mapeo
 * (`mapearAlta.ts`) trata `""` / `0` como "sin dato".
 */
export const altaArcaExtraidaSchema = z.object({
  // Cabecera – empleador
  empleadorCuit: z.string(),
  empleadorRazonSocial: z.string(),

  // Datos del empleado
  empleadoApellido: z.string(),
  empleadoNombres: z.string(),
  empleadoApellidoNombreCrudo: z.string(),
  empleadoCuil: z.string(),

  fechaInicio: z.string(), // ISO YYYY-MM-DD, o "" si ilegible
  fechaCese: z.string(),

  obraSocialCodigo: z.string(),
  obraSocialNombre: z.string(),

  modalidadContratoCodigo: z.string(), // ej. "008"
  modalidadContratoDescripcion: z.string(),

  situacionRevistaCodigo: z.string(), // ej. "01"
  regimen: z.string(), // ej. "SIPA"

  convenioCodigo: z.string(), // ej. "0130/75"
  convenioDescripcion: z.string(),

  categoriaCodigo: z.string(), // ej. "007511"
  categoriaDescripcion: z.string(), // ej. "CATEGORIA A - MAESTRANZA Y SERVICIOS"

  puestoCodigo: z.string(), // ej. "5220"
  puestoDescripcion: z.string(),

  remuneracionPactada: z.number(), // número plano sin separador de miles; 0 si ilegible
  modalidadLiquidacion: z.string(), // ej. "1 - MES"

  domicilioExplotacion: z.string(),
  codigoPostal: z.string(),
  localidad: z.string(),
  provincia: z.string(),

  actividadEconomicaCodigo: z.string(), // ej. "472112"
  actividadEconomicaDescripcion: z.string(),
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
