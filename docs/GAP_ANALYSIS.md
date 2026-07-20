# Análisis de brecha — sistema actual vs. `GONZALEZ.xlsm` + Ley 27.802

**Fase 0** del plan de `INSTRUCCIONES_CLAUDE_CODE.md`. Este documento compara el sistema ya
construido (Next.js + Prisma + PostgreSQL, milestones M0–M5) contra la estructura de datos y
lógica de `docs/reference/GONZALEZ.xlsm` (§2 del documento de instrucciones) y contra los
requisitos normativos de la Ley 27.802 y sus decretos reglamentarios (§3). No se modificó
ningún archivo de código para producir este informe.

Decisiones ya confirmadas con el usuario para esta fase:
- **No hardcodear** CCT 130/75 Comercio ni IPS Formosa en el código — se van a cargar como
  **datos** (seed) dentro del modelo genérico ya existente (`ConceptoDefinicion`,
  `CategoriaConvenio`, `TasaLaboral`), no como estructuras específicas del lenguaje.
- El archivo real fue provisto y analizado directamente (no solo la transcripción en Markdown).

---

## 1. Validación del archivo de referencia

Verifiqué contra el `.xlsm` real (hoja `GONZALEZ IVAN`, legajo 3, VENDEDOR B, ingreso
01/06/2021, período JUN/2024) que el caso de regresión descrito en las instrucciones es
**exacto**:

| Concepto | Valor real (.xlsm) |
|---|---|
| Sueldo básico | 236.162,3245 |
| Antigüedad | 7.084,869734999999 |
| Presentismo | 20.270,59951958333 |
| SAC 1º semestre | 131.758,89687729164 |
| Adicional no remunerativo | 156.226,05 |
| Rem. total | 656.760,041819375 |
| Rem. imponible 1 | 395.276,69063187495 |
| Total deducciones | 128.351,30798581561 |
| **Sueldo neto** | **528.408,7338335594** |

Coincide con lo documentado. Buen ancla para tests de regresión de la Fase 2.

**Hallazgo no documentado en el `.md`**: la columna "días base" (`F4` en la hoja del
empleado) no es una constante — es `=DAY(EOMONTH(EMPLEADOR!$B$9,0))`, es decir, los días
del **mes calendario del período liquidado** (30 para junio). La columna "días trabajados"
(`F5`) es un valor manual independiente que en este caso vale 31, **mayor** al propio mes
calendario. El sistema actual (`diasEnMes()` en `actions/liquidaciones.ts`) usa el mismo
valor como numerador y denominador (`diasTrabajados <= diasEnMes` implícito) — el archivo de
referencia no impone esa restricción. Confirmar con el contador si esto es un caso de "período
de pago" no calendario o un ajuste manual excepcional antes de decidir si el motor debe
permitir `diasTrabajados > diasEnMes`.

**Segundo hallazgo**: la hoja `S.A.C.` (pensada para trackear "mejor sueldo" de los 6 meses del
semestre) está **sin usar** en este archivo — todos los "SUELDO ENERO..JUNIO" están vacíos y
"MEJOR SUELDO" = 0. La fórmula que realmente calcula el SAC en la hoja del empleado usa
`(sueldo_básico + antigüedad + presentismo) / 2` **del mes actual únicamente**, no el mejor
mes del semestre. El motor ya construido (`lib/payroll/sac.ts` + `mejorRemuneracionSemestre`
en `actions/liquidaciones.ts`) sí compara contra el historial de los últimos 6 meses — es
**más correcto** respecto a la LCT (SAC = mejor remuneración del semestre) que lo que hace el
Excel en la práctica. No hay que "bajar" ese comportamiento para igualar al Excel.

---

## 2. Modelo de datos — comparación campo por campo

### 2.1 Empleador → `Empresa`

| Excel (`EMPLEADOR`) | Sistema actual | Estado |
|---|---|---|
| Razón social, CUIT, dirección | `razonSocial`, `cuit` | ✅ (falta `direccion`) |
| Tipo de empresa (cód. ARCA) | `tamano` (enum propio) | ⚠️ distinto propósito — `tamano` decide FAL/contribuciones, no es el código ARCA de tipo de empleador |
| Período liquidado / fecha de pago | `PeriodoLiquidacion.anio/mes`, sin `fechaPago` explícito por legajo | ⚠️ existe `fechaPago` en `PeriodoLiquidacion` pero no se usa en el motor |
| Período y fecha último depósito de aportes + banco | — | ❌ falta (lo exige el nuevo recibo Anexo III, §3.1) |
| `detraccion_art22_ley27541` (con/sin SAC) | — | ❌ falta — no implementado en el motor de liquidación mensual |
| `alicuota_art` + `art_ffep` | Hay `CONTRIB_ART` en `TasaLaboral` pero como % único, sin componente fijo (FFEP) | ⚠️ parcial |
| `svo` (monto fijo por empleado) | — | ❌ falta como concepto de contribución patronal |
| `aporte_solidario_osecac` | — | ❌ falta (deducción de monto fijo, no %) — el motor actual solo soporta deducciones proporcionales a una base, no montos fijos por legajo salvo que se cargue como concepto manual con `montoUnitario` |
| `detraccion_art23_ley27541` (contribuciones) | — | ❌ falta |
| `jornada_laboral` (código 1-4) | `Legajo.tipoContrato`/`modalidadRemuneracion` cubren parcialmente, pero no el código ARCA 1-4 | ⚠️ falta el código explícito |
| Bloque conciliación F931 | — | ❌ no existe ningún reporte de conciliación |

### 2.2 Empleado → `Legajo`

| Excel (`EMPLEADOS`) | Sistema actual | Estado |
|---|---|---|
| Legajo, apellido y nombre, CUIL, fecha ingreso | `numeroLegajo`, `apellido`/`nombre`, `cuil`, `fechaIngreso` | ✅ |
| Obra social (nombre + código RNOS 6 dígitos) | `obraSocial: String?` (texto libre) | ⚠️ falta el código RNOS |
| Categoría | `categoriaId` → `CategoriaConvenio` | ✅ |
| Cuenta sueldo, CBU | — | ❌ falta |
| Antigüedad | Calculada on-the-fly (no persistida) | ✅ equivalente funcional |
| Estado activo/baja | `SituacionLegajo` (ACTIVO/SUSPENDIDO/DESVINCULADO) | ✅ |
| Cónyuge (SI/NO), cantidad de hijos | — | ❌ falta (afecta asignaciones familiares) |
| CCT (SI/NO), SCVO (SI/NO) | — | ❌ falta — hoy el SVO no está modelado en absoluto |
| Corresponde reducción (SI/NO) | — | ❌ falta (relevante para RIFL, §3.4) |
| Códigos ARCA: situación, condición, actividad, modalidad contratación, siniestrado, localidad | — | ❌ ninguno existe — son obligatorios para LSD/F931 |
| Situación de revista 1-3 + día de inicio | — | ❌ falta |
| Afiliación sindical (para tope 2%, §3.6) | — | ❌ falta |

### 2.3 Catálogo de conceptos → `ConceptoDefinicion`

| Excel (`CONCEPTOS`) | Sistema actual | Estado |
|---|---|---|
| Código propio (5 dígitos, ej. 10001) | `codigo: String` (libre, sirve) | ✅ compatible |
| Código AFIP/ARCA (6 dígitos, ej. 110000) | — | ❌ **no existe ningún campo**. Falta `codigoArca String?` en `ConceptoDefinicion` |
| Descripción | `nombre` | ✅ |
| Marca de repetición | — | ❌ no aplica al modelo actual (no relevante sin generador LSD) |
| **Matriz de tributación (14 flags)**: SIPA aportes/contrib., INSSJyP aportes/contrib., Obra Social aportes/contrib., Fondo Solidario aportes/contrib., RENATEA aportes/contrib., Asig. Familiares contrib., FNE contrib., LRT contrib., Reg. diferenciales, Reg. especiales | Solo 2 flags: `afectaAportes`, `afectaContribuciones` | ❌ **brecha importante** — el modelo actual no puede expresar "este concepto aporta a obra social pero no a SIPA", que es exactamente el caso de los conceptos no remunerativos (`NR`) del Excel (tributan solo a Obra Social + Asig. Familiares + FNE, no a SIPA/INSSJyP) |
| `rubro_recibo` para Anexo III (§3.1) | — | ❌ no existe (necesario para agrupar la Sección B del nuevo recibo) |
| Tipo (R/NR/D) | `TipoConcepto` (REMUNERATIVO/NO_REMUNERATIVO/DEDUCCION/CONTRIBUCION_PATRONAL) | ✅ compatible, con un tipo extra (`CONTRIBUCION_PATRONAL`) que el Excel no separa explícitamente |
| Tipo "dinámico" (art. 104 bis) | `SubtipoConcepto.DINAMICO_104BIS` | ✅ ya existe |

**Conclusión de esta sección**: el mayor gap estructural es la matriz de tributación de 2
flags → 14 flags. Sin eso, no se puede calcular correctamente ninguna de las 11 "remuneraciones
imponibles" que exige F931/LSD (§2.5 del documento de instrucciones), ni distinguir que un
concepto no remunerativo tribute a Obra Social/Asig.Familiares/FNE pero no a SIPA.

### 2.4 Escala salarial → `CategoriaConvenio`

| Excel (`ESCALA SALARIAL`) | Sistema actual | Estado |
|---|---|---|
| Por categoría: REM + 4 columnas de NO REM (total, abr, feb, ene) | `CategoriaConvenio.salarioBaseConvenio` (**un solo número**, pensado solo como base del tope del art. 245) | ❌ **brecha estructural**: el motor actual no deriva el sueldo del legajo desde una escala por categoría — `Legajo.sueldoBasico` se carga directo, a mano, por legajo. El Excel deriva el remunerativo y el no remunerativo de cada empleado desde `ESCALA SALARIAL` según su categoría, y persiste 4 valores de NO REM porque cambian por mes dentro del semestre (aumentos escalonados) |
| Versionado por período | `vigenciaDesde/vigenciaHasta` en `CategoriaConvenio` | ✅ el mecanismo de versionado ya existe, pero le falta el campo NO REM |

### 2.5 Liquidación individual — fórmulas

| Fórmula Excel | Motor actual (`lib/payroll/*`) | Estado |
|---|---|---|
| Sueldo básico prorrateado por horas y días | `mensual.ts` + `partTime.ts` (prorratea por horas contratadas y por días trabajados) | ✅ lógica equivalente, con la salvedad del punto 1 (días base = mes calendario vs. manual) |
| Antigüedad = básico × años × 1% | — | ❌ **no implementado**. El motor actual no tiene un concepto de antigüedad automático — se esperaría que el contador lo cargue como concepto manual, pero no hay fórmula que lo calcule al 1%/año como exige CCT 130/75 |
| Presentismo = (básico + antigüedad) × 8,33% | — | ❌ no implementado como fórmula automática |
| SAC = mejor remuneración del semestre / 2 | `sac.ts` | ✅ implementado (y más correcto que el propio Excel, ver §1) |
| No remunerativos con la misma mecánica sobre el NO REM de escala | — | ❌ depende del gap de §2.4 (no hay NO REM de escala del cual derivar) |
| Deducciones sobre "REM imponible" con % fijos | `mensual.ts` aplica aportes sobre `afectaAportes` | ✅ mecanismo equivalente, pero los % actuales (`APORTE_JUBILACION` 11%, `LEY19032` 3%, `OBRA_SOCIAL` 3%) **no coinciden con Comercio 130/75**: el Excel usa Jubilación 11%, Ley 19.032 3%, Obra Social **6%** (no 3%), Sindicato 4%, FAECYS 0,5%, IPS FSA 1% (provincial, Formosa) |
| Contribuciones patronales: Jubilación 10,77%, INSSJP 1,59%, Asig. Fam. 4,70%, FNE 0,94%, Obra Social 6%, LRT %+fijo, SVO fijo | `TasaLaboral` seedeado con `CONTRIB_JUBILACION=10.7%`, `CONTRIB_LEY19032=1.5%`, `CONTRIB_OBRA_SOCIAL=6%`, `CONTRIB_ART=3.5%` (genéricos, inventados como placeholder) | ⚠️ **los valores actuales del seed son genéricos/de ejemplo, no los reales de Comercio** — hay que resembrarlos con los valores reales del Excel, y falta modelar el componente fijo del ART (FFEP) y el SVO fijo, que hoy no tienen representación (`TasaLaboral` es siempre un %, no admite monto fijo) |
| 11 remuneraciones imponibles (F931/LSD) | — | ❌ no existe el concepto de "REM imponible 1..11" en absoluto — el motor calcula un único `totalRemunerativo` |
| Detracción art. 22 Ley 27.541 (con/sin SAC, prorrateada) | — | ❌ no implementado |
| Mini-conciliación F931 por empleado | — | ❌ no implementado |

### 2.6 Salidas

| Excel | Sistema actual | Estado |
|---|---|---|
| **Libro de Sueldos Digital (LSD)**: TXT posicional, registros 01-05 (envío, empleado, concepto, F931, otros datos) | `lib/payroll/sicoss.ts` + `/api/sicoss/[periodoId]` | ❌ **no es lo mismo**. Lo que construí es un export "SICOSS" simplificado (pensado como aproximación a la DDJJ de aportes/contribuciones F931), pero el documento de instrucciones pide específicamente el **LSD** (Libro de Sueldos Digital, que reemplaza el libro físico del art. 52 LCT — una obligación distinta, con sus propios 5 tipos de registro de ancho fijo). Son dos artefactos distintos de ARCA; hay que construir el generador LSD aparte, no reutilizar/renombrar el módulo SICOSS |
| **RECIBO** (formato viejo, doble ejemplar) | PDF de recibo (`lib/pdf/recibo.tsx`) con una sola grilla de conceptos | ⚠️ el PDF actual ya está más cerca del formato *nuevo* que del viejo (una sola grilla, sin doble ejemplar) pero **no tiene ninguna de las 4 secciones del Anexo III** (§3.1) — falta por completo la Sección B (costo laboral total + gráfico de torta) y la cabecera con datos de depósito de cargas sociales |
| **S.A.C.** (tabla semestral) | Se resuelve internamente vía query a `LiquidacionMensual` histórica, sin UI/reporte propio | ⚠️ funcionalmente cubierto pero sin vista dedicada |

---

## 3. Requisitos normativos Ley 27.802 — estado real vs. lo ya construido

| # | Requisito | Estado en el sistema actual |
|---|---|---|
| 3.1 | Recibo Anexo III (4 secciones, costo laboral total antes del bruto, gráfico de torta, `rubro_recibo`, firma digital) | ❌ no implementado. El PDF actual es una grilla simple de haberes/deducciones, sin Sección B ni gráfico |
| 3.2 | Renombrar AFIP→ARCA, libros 10 años, LSD versionable | ⚠️ parcial — el código ya usa términos genéricos, pero no hay generador LSD (ver §2.6) |
| 3.3 | FAL — 1% grandes / 2,5% PyME | ✅ implementado en `actions/liquidaciones.ts` (`confirmarPeriodo`) y `actions/desvinculaciones.ts`, con tests en `fal.test.ts`. **Pero la fecha de vigencia está mal**: el código usa `FAL_FECHA_VIGENCIA = 2026-06-01`; el Decreto 408/2026 (según este documento) fija la vigencia real en **01/11/2026**. Hay que corregir esa constante. |
| 3.4 | RIFL (incentivo a formalización, altas 01/05/2026–30/04/2027) | ❌ no implementado — falta el flag `regimenRIFL` en `Legajo` y la lógica de alícuotas reducidas |
| 3.5a | Art. 104 — propinas no remunerativas | N/A — el sistema no tiene concepto de propinas; no aplica a este catálogo |
| 3.5b | Art. 103 bis ampliado (beneficios sociales) | ✅ ya modelado genéricamente vía `SubtipoConcepto.BENEFICIO_SOCIAL_103BIS` |
| 3.5c | Art. 104 bis (conceptos dinámicos, sin derechos adquiridos) | ✅ ya modelado (`SubtipoConcepto.DINAMICO_104BIS`, `esVariable`) |
| 3.5d | Art. 105 — pago en dinero / moneda extranjera | ⚠️ parcial — el modelo no tiene campo de moneda/tipo de cambio en `ConceptoLiquidacion`, todo se asume en ARS |
| 3.6 | Tope 2% cuota sindical para no afiliados | ⚠️ parcial — existe `TOPE_DEDUCCION_SINDICAL = 2%` en `TasaLaboral` y se aplica en `deducciones.ts`, pero **sin condicionarlo a la afiliación del trabajador** (falta el flag "afiliado sindical" en `Legajo`; hoy el tope se aplica siempre, afiliado o no) |
| 3.7a | Art. 245 excluye SAC y premios no mensuales de la base indemnizatoria | ✅ **ya implementado correctamente** — `indemnizacion.ts` arma la base solo con conceptos `REMUNERATIVO` con `afectaSAC=true`/`esVariable`, que por construcción excluye SAC y no remunerativos |
| 3.7b | Banco de horas / jornada flexible | ✅ ya implementado a nivel motor (`horasExtra.ts`: `PAGO`/`BANCO_HORAS`/`FRANCO_COMPENSATORIO`), pero **no está conectado a ninguna UI** — no hay forma de cargarlo desde una pantalla todavía |
| 3.7c | Licencias médicas con receta digital | ❌ no implementado — no existe módulo de licencias en absoluto |

---

## 4. Resumen ejecutivo — qué falta y por dónde empezar

**Ya construido y reutilizable tal cual:**
- Motor de indemnizaciones (art. 245/231/255/248) — cumple el requisito 3.7a sin cambios.
- FAL — funcional, solo requiere corregir la fecha de vigencia.
- Beneficios sociales (103 bis) y conceptos dinámicos (104 bis) — el modelo ya los soporta.
- Banco de horas — falta wiring de UI, no motor.
- Autenticación, multi-empresa, PDF de recibo/indemnización, tests (43 verdes).

**Gaps grandes que requieren migración de esquema (Fase 1):**
1. Matriz de tributación de `ConceptoDefinicion`: pasar de 2 flags a las ~14 categorías reales
   (SIPA, INSSJyP, Obra Social, Fondo Solidario, RENATEA, Asig. Familiares, FNE, LRT, regímenes
   diferenciales/especiales), más `codigoArca` y `rubro_recibo`.
2. `CategoriaConvenio`: agregar remunerativo + no remunerativo de escala (hoy solo hay un
   número para el tope del art. 245).
3. `Legajo`: agregar los ~15 campos ARCA/CCT que faltan (cónyuge, hijos, SCVO, códigos de
   revista, afiliación sindical, RIFL, RNOS de obra social, CBU/cuenta).
4. `Empresa`: agregar los parámetros de período (detracción art. 22/23 Ley 27.541, ART+FFEP,
   SVO, aporte solidario, banco/fecha último depósito).
5. Soporte de **montos fijos** (no solo %) en el motor de deducciones/contribuciones (SVO,
   aporte solidario OSECAC, ART FFEP).

**Gaps grandes de lógica de negocio (Fase 2):**
6. Fórmulas de antigüedad (1%/año) y presentismo (8,33%) como cálculo automático, no manual.
7. 11 remuneraciones imponibles + detracción art. 22 Ley 27.541 + conciliación F931.

**Gaps grandes de salidas (Fases 3-4):**
8. Recibo Anexo III completo (Sección B + gráfico de costo laboral + firma digital).
9. Generador LSD (registros 01-05) — **distinto** del módulo SICOSS ya existente, no un reemplazo del mismo.

**Gaps de Fase 5:**
10. RIFL, tope 2% sindical condicionado a afiliación, licencias médicas.

**Corrección inmediata (no requiere migración, es un one-liner):**
- `FAL_FECHA_VIGENCIA` en `src/actions/liquidaciones.ts`: `2026-06-01` → `2026-11-01`.

---

## 5. Preguntas abiertas para el contador antes de migrar

1. ¿El caso "días trabajados (31) > días del mes calendario (30)" del legajo GONZALEZ IVAN es
   un ajuste manual excepcional, o el sistema debe permitir períodos de pago no calendario?
2. Los porcentajes de aportes/contribuciones sembrados actualmente en `TasaLaboral` son
   placeholders genéricos — ¿confirmás que se resiembren con los valores reales de Comercio
   130/75 + Formosa extraídos del Excel (Obra Social 6% no 3%, IPS FSA 1%, etc.)?
3. Los 4 valores de NO REM por mes en `ESCALA SALARIAL` (total/abr/feb/ene) — ¿corresponden a
   un cronograma de aumentos escalonados dentro del semestre? Necesito entender la regla para
   modelar el versionado correctamente (¿es "vigente desde tal fecha" simple, o hay que
   soportar que un mismo semestre tenga varios valores según convenio).
4. ¿Confirmás que LSD y el SICOSS ya construido son artefactos separados y se debe construir
   el generador LSD desde cero (no reemplazando el módulo SICOSS)?
