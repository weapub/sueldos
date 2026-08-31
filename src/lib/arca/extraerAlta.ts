import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { altaArcaExtraidaSchema, type AltaArcaExtraida } from "@/lib/arca/schema";

/** Error "de negocio": el alta no se pudo leer. Lleva un mensaje apto para mostrar al usuario. */
export class AltaArcaError extends Error {}

const MODELO = process.env.ARCA_OCR_MODEL ?? "claude-opus-5";

const SYSTEM = `Sos un asistente que transcribe la "Constancia del Trabajador - Alta" que emite ARCA
(ex AFIP) de Argentina por la Simplificación Registral.

El documento tiene esta estructura:
- Cabecera con datos del EMPLEADOR: CUIT y "Nombre y apellido o Denominación".
- Sección "Datos del Empleado": "Apellido y nombre" (formato APELLIDO NOMBRES) y CUIL.
- Fecha de inicio (alta) y, si figura, fecha de cese.
- Obra Social (código RNOS y nombre).
- Modalidad de contrato (código de 3 dígitos y descripción, ej. "008 - A tiempo completo indeterminado").
- Situación de Revista, Régimen (ej. SIPA).
- Convenio colectivo (ej. "0130/75 - COMERCIO") y Categoría (código y descripción,
  ej. "CATEGORIA A - MAESTRANZA Y SERVICIOS").
- Puesto (código y descripción).
- Remuneración pactada (monto) y Modalidad de liquidación (ej. "1 - MES").
- Domicilio de explotación, código postal, localidad y provincia.
- Actividad económica (código y descripción).

Reglas:
- Transcribí exactamente lo que leés; no completes ni inventes datos.
- Fechas: siempre en formato ISO YYYY-MM-DD (la constancia suele usar DD/MM/AAAA).
- Montos: número plano sin símbolo ni separador de miles (1300000, no "$1.300.000,00").
- "Apellido y nombre": separá en empleadoApellido (apellido/s) y empleadoNombres (nombres),
  y copiá el texto tal cual en empleadoApellidoNombreCrudo.
- Cualquier campo de texto que no puedas leer con confianza (borroso, cortado, tapado):
  devolvé cadena vacía "". En remuneracionPactada devolvé 0.
- Si la imagen NO es una constancia de alta de ARCA, devolvé "" en todos los campos de
  texto y 0 en remuneracionPactada.`;

function bloqueDocumento(
  base64: string,
  mediaType: string,
): Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam {
  if (mediaType === "application/pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: base64 },
    };
  }
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: mediaType as Anthropic.Base64ImageSource["media_type"],
      data: base64,
    },
  };
}

/**
 * Extrae los campos de una foto o PDF de un alta de ARCA usando la API de Claude
 * (visión + salida estructurada). Lanza `AltaArcaError` si no se puede leer.
 */
export async function extraerAltaArca(input: {
  buffer: Buffer;
  mediaType: string;
}): Promise<AltaArcaExtraida> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AltaArcaError("La lectura automática de altas no está configurada.");
  }

  const client = new Anthropic();
  const base64 = input.buffer.toString("base64");

  let parsed: AltaArcaExtraida | null;
  try {
    const res = await client.messages.parse({
      model: MODELO,
      max_tokens: 4096,
      system: SYSTEM,
      output_config: {
        effort: "low",
        format: zodOutputFormat(altaArcaExtraidaSchema),
      },
      messages: [
        {
          role: "user",
          content: [
            bloqueDocumento(base64, input.mediaType),
            {
              type: "text",
              text: 'Extraé los campos del alta según las reglas. Usá "" (o 0 en el monto) en lo que no puedas leer.',
            },
          ],
        },
      ],
    });
    parsed = res.parsed_output;
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      throw new AltaArcaError(
        "No pudimos procesar la imagen del alta. Probá de nuevo en unos minutos.",
      );
    }
    throw err;
  }

  if (!parsed) {
    throw new AltaArcaError(
      "No pudimos leer el alta. Probá con una foto más nítida y derecha, o cargá los datos a mano.",
    );
  }

  const tieneAlgo = Object.values(parsed).some((v) =>
    typeof v === "string" ? v.trim() !== "" : typeof v === "number" ? v !== 0 : v != null,
  );
  if (!tieneAlgo) {
    throw new AltaArcaError(
      "La imagen no parece una constancia de alta de ARCA. Revisá el archivo.",
    );
  }

  return parsed;
}
