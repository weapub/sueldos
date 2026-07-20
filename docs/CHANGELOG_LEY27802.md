# Changelog — adaptación a GONZALEZ.xlsm + Ley 27.802

## Fase 0 — Reconocimiento (2026-07-20)

Análisis de brecha entre el sistema ya construido y `docs/reference/GONZALEZ.xlsm` +
requisitos normativos. Sin cambios de código. Ver `docs/GAP_ANALYSIS.md`.

## Corrección puntual — fecha de vigencia del FAL

`FAL_FECHA_VIGENCIA` en `src/actions/liquidaciones.ts` corregida de `2026-06-01` a
`2026-11-01`, conforme al Decreto 408/2026 (uso de la prórroga de hasta 6 meses prevista en
la Ley 27.802 respecto de la fecha original de la ley).

## Fase 1 — Modelo de datos (2026-07-20)

**Migración Prisma** (`comercio_130_75_campos`):
- `ConceptoDefinicion`: `codigoArca` (código AFIP/ARCA de 6 dígitos), `rubroRecibo` (enum,
  agrupación para la Sección B del recibo Anexo III), y la matriz de tributación granular de
  15 flags (SIPA/INSSJyP/Obra Social/Fondo Solidario/RENATEA aportes+contribuciones,
  Asig. Familiares/FNE/LRT contribuciones, regímenes diferenciales/especiales) tal como figura
  en la hoja `CONCEPTOS` del Excel. Los 2 flags simples ya existentes (`afectaAportes`,
  `afectaContribuciones`) se mantienen sin cambios — siguen siendo los que consume el motor de
  cálculo actual; la matriz granular queda persistida para cuando la Fase 2 implemente las 11
  remuneraciones imponibles del F931/LSD.
- `CategoriaConvenio`: nuevo campo `remuneracionNoRemunerativa` (además del `salarioBaseConvenio`
  ya existente) para poder cargar la escala completa REM + NO REM por categoría y versión.
- `Legajo`: ~20 campos nuevos — datos familiares/convencionales (cónyuge, hijos, CCT, SCVO,
  afiliación sindical), RIFL (régimen de incentivo a la formalización), códigos ARCA (situación,
  condición, actividad, modalidad de contratación, siniestrado, localidad, situación de revista
  1-3 + día de inicio), y datos bancarios/obra social (CBU, cuenta sueldo, código RNOS).
- `Empresa`: `direccion`, `tipoEmpresaArca`, `jornadaLaboralCodigo`.
- `PeriodoLiquidacion`: datos de depósito de cargas sociales del período (banco, fecha, período)
  — requeridos en la cabecera del recibo Anexo III.
- `TasaLaboral`: precisión de `valor` ampliada de `Decimal(7,5)` a `Decimal(14,5)` para poder
  representar tanto fracciones (0.11000) como montos fijos en pesos (7003.68000). Nuevas claves:
  `DEDUCCION_FAECYS`, `DEDUCCION_IPS_FSA`, `CONTRIB_ASIG_FAMILIARES`, `CONTRIB_FNE`,
  `ART_FFEP_FIJO`, `SVO_FIJO`, `APORTE_SOLIDARIO_OSECAC_FIJO`, `DETRACCION_ART22_CON_SAC`,
  `DETRACCION_ART22_SIN_SAC`, `DETRACCION_ART23_CONTRIBUCIONES`.

**Seed** (`prisma/seed.ts`):
- Catálogo real de 38 conceptos de Comercio CCT 130/75 (17 remunerativos, 11 no remunerativos,
  10 deducciones) extraído directamente de la hoja `CONCEPTOS` de `GONZALEZ.xlsm`, con código
  ARCA y matriz de tributación completa. 4 de esos 38 (`10001` SUELDO BASICO, `30001` JUBILACION,
  `30002` LEY 19.032, `30003` OBRA SOCIAL) se sembraron con `activo: false` porque duplicarían
  las líneas sintéticas `BASICO`/`APORTES` que ya calcula el motor — quedan en el catálogo para
  uso futuro de LSD/F931 pero no aparecen en el selector de "agregar concepto" del wizard actual.
- Categorías `Administrativo A` y `Vendedor B` resembradas con la escala real (`ESCALA SALARIAL`,
  MAYO'24): `Vendedor B` usa exactamente los valores del caso de regresión de GONZALEZ IVAN
  (REM 457.088,37 / NO REM 302.373).
- Tasas globales resembradas con los valores reales del archivo: Obra Social 6% (no 3% como
  estaba antes), Sindicato 4%, FAECYS 0,5%, IPS FSA 1% (Formosa), contribuciones patronales
  Jubilación 10,77% / Ley 19.032 1,59% / Asig. Familiares 4,70% / FNE 0,94% / ART 3%, y los
  montos fijos (ART FFEP $615, SVO $175,89, aporte solidario OSECAC $100, detracciones art.
  22/23 Ley 27.541).

**UI**: `configuracion/tasas` ahora distingue tasas-fracción de montos-fijos (formulario y
tabla); `tasaSchema` ya no limita todos los valores a ≤1.

**Verificación**: 43 tests unitarios verdes (sin cambios, el motor de cálculo no se tocó en
esta fase), build limpio, y flujo verificado en navegador — período de liquidación calculado
con las nuevas alícuotas (deducciones ahora 20% = 11%+3%+6%, antes 17%), catálogo real
disponible en el selector de conceptos, escala salarial real visible en la ficha de empresa.

**Nota de infraestructura**: durante la verificación, el servidor de desarrollo que venía
corriendo desde antes de la migración quedó con una copia en memoria del cliente Prisma
desactualizada (el enum `ClaveTasa` con los valores viejos) y devolvía "Error al listar tasas."
silenciosamente. Se resolvió reiniciando el proceso de `next dev`. Si esto vuelve a pasar
después de `prisma migrate dev`, reiniciar el servidor de desarrollo.

## Fase 2 — Motor de cálculo (2026-07-20)

**Nuevas funciones puras** (`src/lib/payroll/convenio.ts`, con tests):
- `calcularAntiguedadImporte(base, años, tasa)` = base × años × tasa.
- `calcularPresentismo(base, antigüedad, divisor=12)` — usa un **divisor entero** (no una tasa
  decimal 0.08333) para evitar el desvío de redondeo de 1/12 a montos grandes (~$2 de
  diferencia detectado al validar contra el archivo real).

**Motor de liquidación mensual** (`mensual.ts`) — extendido, sin romper el comportamiento
anterior (todo lo nuevo es opt-in vía campos opcionales):
- Antigüedad y presentismo se calculan automáticamente cuando el legajo trae
  `antiguedadAnios` (siempre lo trae ahora, se computa desde `fechaIngreso`) y hay una tasa
  de antigüedad vigente (`ANTIGUEDAD_PORCENTAJE_ANIO`, sembrada como default global 1%).
- Espejo no remunerativo completo (adicional + antigüedad + presentismo + SAC propio) cuando
  `CategoriaConvenio.remuneracionNoRemunerativa > 0` — es el gate natural para que esto solo
  aplique a categorías con escala no remunerativa cargada (hoy: Administrativo A y Vendedor B
  de Comercial del Sur), sin necesidad de hardcodear qué empresas usan CCT 130/75.
- Deducciones de convenio automáticas cuando corresponde: Sindicato y FAECYS (sobre
  remunerativo y espejo no remunerativo, misma tasa distinta base), aporte previsional
  provincial tipo IPS FSA (sobre remunerativo), aporte solidario de monto fijo. Todas
  reutilizan tasas ya sembradas en Fase 1.
- El tope del 2% de deducciones sindicales (art. 133) ahora se aplica **solo si el legajo no
  está afiliado** (`Legajo.afiliadoSindical`) — antes se aplicaba siempre, incondicionalmente
  (gap señalado en `GAP_ANALYSIS.md` §3, ítem 3.6, ya resuelto).
- Se corrigió además el prorrateo de días: antes solo prorrateaba si `diasTrabajados <
  diasEnMes`; ahora prorratea siempre (`díasTrabajados/díasEnMes`), lo que además soporta el
  caso real detectado en el Excel donde días trabajados supera los días del mes calendario.
- Se eliminó un doble redondeo intermedio en el prorrateo por horas + días (antes redondeaba
  la proporción por horas y RECIÉN DESPUÉS prorrateaba por días, arrastrando un desvío de
  hasta $0,01 en cascada) — ahora es una sola división final, como la fórmula del Excel.

**Test de regresión obligatorio**: `mensual.test.ts` reproduce el caso GONZALEZ IVAN
(GONZALEZ.xlsm, legajo 3, VENDEDOR B, JUN/2024) con los valores reales extraídos directamente
del archivo — básico $236.162,32, antigüedad $7.084,87, presentismo $20.270,60, SAC 1° sem.
$131.758,90, adicional NR $156.226,05, subtotal rem. $395.276,69, total haberes $656.760,04,
deducciones $128.351,31, **neto $528.408,73** — coincidencia exacta (no solo dentro de la
tolerancia ±0,01 pactada).

**`actions/liquidaciones.ts`**: ahora resuelve antigüedad (desde `fechaIngreso`), no
remunerativo de escala (desde `categoria`) y afiliación sindical (desde `legajo`) en cada
cálculo; el catálogo de códigos sintéticos que mapean el resultado del motor a
`ConceptoDefinicion` se amplió con los 12 códigos nuevos. También se mejoró el "piso" de
`mejorRemuneracionSemestre`/`mejorNoRemuneracionSemestre` para legajos sin historial previo en
el semestre: antes usaba solo el básico crudo, ahora incluye la antigüedad estimada — evita
subestimar el SAC del primer semestre de un legajo con antigüedad ya reconocida.

**Verificado**: 59 tests unitarios verdes (16 nuevos: 4 de `convenio.ts`, 9 del caso de
regresión, 3 de `deducciones.ts` sobre el tope condicionado a afiliación), build limpio, y
flujo completo verificado en navegador (período con legajo Vendedor B en mes de SAC,
recibo con los 8 conceptos remunerativos/no-remunerativos y las 8 deducciones automáticas,
sin errores de consola).

**Pendiente para próximas fases**: derivar el sueldo básico del legajo desde la escala por
categoría en lugar de cargarlo a mano (hoy siguen siendo independientes); las 11
remuneraciones imponibles del F931; detracción art. 22/23 Ley 27.541; que el motor consuma la
matriz de tributación granular de 15 flags en vez de los 2 flags simples (`afectaAportes`/
`afectaContribuciones`) para los conceptos manuales que el contador carga desde el catálogo.

## Fase 3 — Recibo Anexo III (2026-07-20)

**Contribuciones patronales individuales** (antes un único monto agregado
`totalContribucionesPatronales`, ahora conceptos propios con rubro): se sembraron 7 conceptos
sintéticos globales (`CP_JUBILACION`, `CP_LEY19032`, `CP_OBRA_SOCIAL`, `CP_ASIG_FAMILIARES`,
`CP_FNE`, `CP_ART`, `CP_SVO`), cada uno con `rubroRecibo` asignado (Seguridad Social/INSSJP-PAMI
/Obra Social/ART/Otros convencionales), y el motor (`mensual.ts`) ahora los calcula y persiste
como `ConceptoLiquidacion` de tipo `CONTRIBUCION_PATRONAL` — el campo `TipoConcepto.
CONTRIBUCION_PATRONAL` existía en el modelo desde el inicio pero nunca se había usado hasta
ahora. También se asignó `rubroRecibo=SINDICAL` a los conceptos de deducción sindical
existentes (Sindicato, FAECYS, Aporte solidario) y `OBRA_SOCIAL`/`SEGURIDAD_SOCIAL` a Obra
Social No Rem. e IPS FSA.

**Constancia de emisión digital** (Dec. 407/2026: se habilita la emisión/firma digital, con
obligación de acreditar la entrega): `LiquidacionMensual.reciboEmitidoEn` +`.reciboHash`
(SHA-256 de liquidación + neto + timestamp), fijados **una sola vez** al confirmar el período
— no se recalculan en cada descarga, para que la huella sea una prueba estable en el tiempo.

**Gráfico de torta manual en SVG** (`lib/pdf/pieChart.tsx`): `@react-pdf/renderer` no soporta
librerías de gráficos, así que se calculan los arcos a mano (trigonometría básica, comandos
SVG `M`/`L`/`A`/`Z`) — sin dependencias nuevas.

**Nuevo template `lib/pdf/recibo.tsx`** con las 4 secciones del Anexo III en orden: A) cabecera
ampliada (domicilio del empleador, legajo, fecha de ingreso, antigüedad calculada, fecha de
pago, depósito de cargas sociales del período anterior — estos 3 últimos ya existían en el
modelo desde la Fase 1 pero no se usaban); B) costo laboral total con gráfico de torta +
leyenda por rubro, **expuesto antes del bruto**; C) la grilla de haberes/deducciones que ya
existía; D) neto destacado. El template anterior se preservó como `lib/pdf/reciboLegacy.tsx`
— el route handler (`/api/recibo/[liquidacionId]/pdf`) elige entre ambos según si el período
es anterior o posterior al 01/06/2026 (vigencia del Anexo III), sin necesidad de tocar
liquidaciones ya emitidas.

**UI**: se agregó el campo "Domicilio" al formulario de empresa (alimenta la cabecera del
recibo; antes no se podía cargar aunque el modelo ya lo soportaba desde la Fase 1).

**Verificado**: 59 tests (sin cambios — esta fase es de presentación/salida, no tocó el motor
de cálculo salvo para desglosar contribuciones), build limpio, y el PDF generado se verificó
extrayendo su texto (no solo el tamaño en bytes): las 4 secciones, los montos por rubro, el
gráfico con sus porcentajes y la constancia con hash aparecen correctos. También se confirmó
que el formato viejo se sigue sirviendo intacto para un período de marzo/2026 (anterior a la
vigencia).

**Pendiente / simplificaciones declaradas**: la firma digital es una constancia de integridad
(hash + timestamp), no una firma electrónica del trabajador reconociendo la recepción — eso
requeriría un portal/acceso para el trabajador, fuera de alcance de este sistema pensado para
el contador. "Fecha y lugar de pago" y el depósito de cargas sociales dependen de que el
contador cargue esos campos en el período (hoy no hay UI para editarlos, solo el modelo los
soporta) — quedan en "—" si no se cargan.

## Fase 4 — LSD y RIFL (2026-07-20)

**Libro de Sueldos Digital** (`lib/payroll/lsd.ts`) — artefacto de ARCA **distinto** del SICOSS
ya construido (reemplaza el libro físico de sueldos y jornales del art. 52 LCT, no la DDJJ de
aportes/contribuciones). Se implementaron los 5 tipos de registro del formato posicional de
ancho fijo:
- **Registros 02, 03 y 05**: anchos verificados **byte a byte** contra las fórmulas reales de
  concatenación de `GONZALEZ.xlsm` (hojas REG 2/REG 3/REG 5) — coinciden exactos con las
  longitudes de control declaradas en el propio archivo (115/51/65 posiciones). Confirmado con
  una descarga real desde la app: registro 02 → 115, registro 03 → 51 en las 3 liquidaciones
  de prueba.
- **Registro 01**: inferido de la lista de campos (la hoja de referencia no tenía la fila de
  datos completa para verificar el ancho exacto).
- **Registro 04** (49 campos — situación/condición/actividad de revista, bases imponibles
  1-10, etc.): reconstruido con mejor esfuerzo. Se detectó y documentó un desvío concreto: el
  Excel declara 370 posiciones de control, esta implementación produce 364 — candidatos más
  probables son los campos alfanuméricos "según tabla de codificación específica" (código
  condición/modalidad de contratación/siniestrado) cuyo ancho no se pudo confirmar. Los campos
  que este sistema no releva (bases diferenciales, remuneración por maternidad ANSES, aporte/
  contribución adicional de obra social, cantidad de adherentes) se completan en 0, nunca se
  inventan.
- Las 11 remuneraciones imponibles del registro 04 usan el total remunerativo como aproximación
  uniforme — mismo pendiente ya señalado en la Fase 2 (el motor todavía no calcula cada base
  imponible por separado).

Descarga desde `/api/lsd/[periodoId]` (botón "Descargar LSD" en la pantalla de período, junto
al de SICOSS).

**RIFL** (Título XX Ley 27.802, Dec. 315/2026): se agregó la estructura completa — nueva clave
`RIFL_REDUCCION_CONTRIBUCIONES` en `TasaLaboral` (sembrada en **0%**, porque el porcentaje real
todavía no está reglamentado y no se debía inventar), toggle "Alta bajo RIFL" + fecha de alta
en el formulario de legajo, y el motor (`mensual.ts`) reduce las contribuciones patronales
(excepto ART/SVO, que se consideran seguros y no contribuciones a la seguridad social) cuando
el legajo tiene el régimen activo, la fecha de alta cae dentro de la ventana legal
(01/05/2026-30/04/2027) y la tasa configurada es mayor a 0. Con la tasa en 0 por defecto es un
no-op — la reducción se activa el día que el contador cargue la alícuota real en Configuración
→ Tasas, sin tocar código.

**Verificado**: 65 tests (6 nuevos de `lsd.ts`, con aserciones de ancho exacto), build limpio,
y probado en navegador de punta a punta: legajo nuevo con RIFL activado, y archivo LSD
descargado real con 55 líneas (1 registro 01 + 3 registros 02 + 48 registros 03 + 3 registros
04) verificando el ancho de cada tipo de registro contra lo esperado.
