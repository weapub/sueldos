-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CONTADOR', 'ASISTENTE', 'CLIENTE');

-- CreateEnum
CREATE TYPE "TamanoEmpresa" AS ENUM ('MICRO', 'PEQUENA', 'MEDIANA', 'GRANDE');

-- CreateEnum
CREATE TYPE "TipoContrato" AS ENUM ('TIEMPO_INDETERMINADO', 'PLAZO_FIJO', 'TEMPORADA', 'PART_TIME', 'EVENTUAL');

-- CreateEnum
CREATE TYPE "ModalidadRemuneracion" AS ENUM ('MENSUAL', 'JORNAL', 'HORA');

-- CreateEnum
CREATE TYPE "SituacionLegajo" AS ENUM ('ACTIVO', 'SUSPENDIDO', 'DESVINCULADO');

-- CreateEnum
CREATE TYPE "EstadoPeriodo" AS ENUM ('BORRADOR', 'CONFIRMADO', 'CERRADO');

-- CreateEnum
CREATE TYPE "EstadoLiquidacion" AS ENUM ('BORRADOR', 'CONFIRMADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "TipoConcepto" AS ENUM ('REMUNERATIVO', 'NO_REMUNERATIVO', 'DEDUCCION', 'CONTRIBUCION_PATRONAL');

-- CreateEnum
CREATE TYPE "SubtipoConcepto" AS ENUM ('BENEFICIO_SOCIAL_103BIS', 'NO_REMUN_105', 'DINAMICO_104BIS', 'SINDICAL', 'EMBARGO', 'OTRA_DEDUCCION');

-- CreateEnum
CREATE TYPE "ClaveTasa" AS ENUM ('APORTE_JUBILACION', 'APORTE_LEY19032_PAMI', 'APORTE_OBRA_SOCIAL', 'CONTRIB_JUBILACION', 'CONTRIB_LEY19032', 'CONTRIB_OBRA_SOCIAL', 'CONTRIB_ART', 'CONTRIB_SINDICAL', 'FAL_GRANDE', 'FAL_PYME', 'TOPE_DEDUCCION_GENERAL', 'TOPE_DEDUCCION_SINDICAL');

-- CreateEnum
CREATE TYPE "MotivoDesvinculacion" AS ENUM ('DESPIDO_SIN_CAUSA', 'DESPIDO_CON_CAUSA', 'RENUNCIA', 'MUTUO_ACUERDO', 'FALLECIMIENTO', 'VENCIMIENTO_CONTRATO');

-- CreateEnum
CREATE TYPE "EstadoEvento" AS ENUM ('BORRADOR', 'CONFIRMADO', 'PAGADO');

-- CreateEnum
CREATE TYPE "VinculoBeneficiario" AS ENUM ('CONYUGE_CONVIVIENTE', 'HIJO_MENOR', 'HIJO_DISCAPACITADO', 'PADRE_MADRE');

-- CreateEnum
CREATE TYPE "TipoMovimientoFal" AS ENUM ('CONTRIBUCION_MENSUAL', 'RETIRO_INDEMNIZACION', 'AJUSTE');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "empresaId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "actividad" TEXT NOT NULL,
    "tamano" "TamanoEmpresa" NOT NULL,
    "provincia" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaConvenio" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "convenioNombre" TEXT,
    "salarioBaseConvenio" DECIMAL(14,2) NOT NULL,
    "vigenciaDesde" TIMESTAMP(3) NOT NULL,
    "vigenciaHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoriaConvenio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Legajo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "numeroLegajo" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "cuil" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "fechaIngreso" TIMESTAMP(3) NOT NULL,
    "fechaReingreso" TIMESTAMP(3),
    "legajoAnteriorId" TEXT,
    "categoriaId" TEXT NOT NULL,
    "tipoContrato" "TipoContrato" NOT NULL,
    "modalidadRemuneracion" "ModalidadRemuneracion" NOT NULL,
    "horasSemanales" DECIMAL(5,2),
    "horasSemanalesFullTime" DECIMAL(5,2) NOT NULL DEFAULT 48,
    "sueldoBasico" DECIMAL(14,2) NOT NULL,
    "obraSocial" TEXT,
    "situacion" "SituacionLegajo" NOT NULL DEFAULT 'ACTIVO',
    "fechaEgreso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Legajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacacionPeriodo" (
    "id" TEXT NOT NULL,
    "legajoId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "diasCorresponden" INTEGER NOT NULL,
    "diasGozados" INTEGER NOT NULL DEFAULT 0,
    "fechaDesde" TIMESTAMP(3),
    "fechaHasta" TIMESTAMP(3),

    CONSTRAINT "VacacionPeriodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodoLiquidacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "estado" "EstadoPeriodo" NOT NULL DEFAULT 'BORRADOR',
    "fechaPago" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodoLiquidacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiquidacionMensual" (
    "id" TEXT NOT NULL,
    "periodoId" TEXT NOT NULL,
    "legajoId" TEXT NOT NULL,
    "diasTrabajados" INTEGER NOT NULL,
    "horasTrabajadas" DECIMAL(6,2),
    "totalRemunerativo" DECIMAL(14,2) NOT NULL,
    "totalNoRemunerativo" DECIMAL(14,2) NOT NULL,
    "totalDeducciones" DECIMAL(14,2) NOT NULL,
    "totalContribucionesPatronales" DECIMAL(14,2) NOT NULL,
    "neto" DECIMAL(14,2) NOT NULL,
    "estado" "EstadoLiquidacion" NOT NULL DEFAULT 'BORRADOR',
    "snapshotInputJson" JSONB NOT NULL,
    "calculadoPorUsuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiquidacionMensual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptoDefinicion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoConcepto" NOT NULL,
    "subtipo" "SubtipoConcepto",
    "afectaAportes" BOOLEAN NOT NULL DEFAULT true,
    "afectaContribuciones" BOOLEAN NOT NULL DEFAULT true,
    "afectaSAC" BOOLEAN NOT NULL DEFAULT true,
    "esVariable" BOOLEAN NOT NULL DEFAULT false,
    "requiereConsentimiento" BOOLEAN NOT NULL DEFAULT false,
    "ordenImpresion" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConceptoDefinicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptoLiquidacion" (
    "id" TEXT NOT NULL,
    "liquidacionId" TEXT NOT NULL,
    "conceptoDefinicionId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(8,2),
    "montoUnitario" DECIMAL(14,2),
    "monto" DECIMAL(14,2) NOT NULL,
    "consentimientoFirmado" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ConceptoLiquidacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TasaLaboral" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT,
    "clave" "ClaveTasa" NOT NULL,
    "valor" DECIMAL(7,5) NOT NULL,
    "vigenciaDesde" TIMESTAMP(3) NOT NULL,
    "vigenciaHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TasaLaboral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndiceIPC" (
    "id" TEXT NOT NULL,
    "anioMes" TEXT NOT NULL,
    "coeficiente" DECIMAL(10,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndiceIPC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoDesvinculacion" (
    "id" TEXT NOT NULL,
    "legajoId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "fechaEgreso" TIMESTAMP(3) NOT NULL,
    "motivo" "MotivoDesvinculacion" NOT NULL,
    "preavisoOtorgado" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoEvento" NOT NULL DEFAULT 'BORRADOR',
    "resultadoJson" JSONB NOT NULL,
    "montoTotal" DECIMAL(14,2) NOT NULL,
    "calculadoPorUsuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventoDesvinculacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeneficiarioFallecimiento" (
    "id" TEXT NOT NULL,
    "eventoDesvinculacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "vinculo" "VinculoBeneficiario" NOT NULL,
    "montoAsignado" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "BeneficiarioFallecimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FalCuenta" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "fechaAlta" TIMESTAMP(3) NOT NULL,
    "saldoActual" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FalCuenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FalMovimiento" (
    "id" TEXT NOT NULL,
    "falCuentaId" TEXT NOT NULL,
    "tipo" "TipoMovimientoFal" NOT NULL,
    "periodoId" TEXT,
    "eventoDesvinculacionId" TEXT,
    "monto" DECIMAL(14,2) NOT NULL,
    "saldoResultante" DECIMAL(14,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FalMovimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "detalleJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_empresaId_idx" ON "Usuario"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_cuit_key" ON "Empresa"("cuit");

-- CreateIndex
CREATE INDEX "CategoriaConvenio_empresaId_idx" ON "CategoriaConvenio"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaConvenio_empresaId_nombre_vigenciaDesde_key" ON "CategoriaConvenio"("empresaId", "nombre", "vigenciaDesde");

-- CreateIndex
CREATE UNIQUE INDEX "Legajo_cuil_key" ON "Legajo"("cuil");

-- CreateIndex
CREATE INDEX "Legajo_empresaId_idx" ON "Legajo"("empresaId");

-- CreateIndex
CREATE INDEX "Legajo_categoriaId_idx" ON "Legajo"("categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "Legajo_empresaId_numeroLegajo_key" ON "Legajo"("empresaId", "numeroLegajo");

-- CreateIndex
CREATE UNIQUE INDEX "VacacionPeriodo_legajoId_anio_key" ON "VacacionPeriodo"("legajoId", "anio");

-- CreateIndex
CREATE INDEX "PeriodoLiquidacion_empresaId_idx" ON "PeriodoLiquidacion"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodoLiquidacion_empresaId_anio_mes_key" ON "PeriodoLiquidacion"("empresaId", "anio", "mes");

-- CreateIndex
CREATE INDEX "LiquidacionMensual_legajoId_idx" ON "LiquidacionMensual"("legajoId");

-- CreateIndex
CREATE UNIQUE INDEX "LiquidacionMensual_periodoId_legajoId_key" ON "LiquidacionMensual"("periodoId", "legajoId");

-- CreateIndex
CREATE INDEX "ConceptoDefinicion_empresaId_idx" ON "ConceptoDefinicion"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptoDefinicion_empresaId_codigo_key" ON "ConceptoDefinicion"("empresaId", "codigo");

-- CreateIndex
CREATE INDEX "ConceptoLiquidacion_liquidacionId_idx" ON "ConceptoLiquidacion"("liquidacionId");

-- CreateIndex
CREATE INDEX "TasaLaboral_empresaId_clave_idx" ON "TasaLaboral"("empresaId", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "IndiceIPC_anioMes_key" ON "IndiceIPC"("anioMes");

-- CreateIndex
CREATE INDEX "EventoDesvinculacion_legajoId_idx" ON "EventoDesvinculacion"("legajoId");

-- CreateIndex
CREATE INDEX "EventoDesvinculacion_empresaId_idx" ON "EventoDesvinculacion"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "FalCuenta_empresaId_key" ON "FalCuenta"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "FalMovimiento_eventoDesvinculacionId_key" ON "FalMovimiento"("eventoDesvinculacionId");

-- CreateIndex
CREATE INDEX "FalMovimiento_falCuentaId_idx" ON "FalMovimiento"("falCuentaId");

-- CreateIndex
CREATE INDEX "AuditLog_usuarioId_idx" ON "AuditLog"("usuarioId");

-- CreateIndex
CREATE INDEX "AuditLog_entidad_entidadId_idx" ON "AuditLog"("entidad", "entidadId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriaConvenio" ADD CONSTRAINT "CategoriaConvenio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Legajo" ADD CONSTRAINT "Legajo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Legajo" ADD CONSTRAINT "Legajo_legajoAnteriorId_fkey" FOREIGN KEY ("legajoAnteriorId") REFERENCES "Legajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Legajo" ADD CONSTRAINT "Legajo_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaConvenio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacacionPeriodo" ADD CONSTRAINT "VacacionPeriodo_legajoId_fkey" FOREIGN KEY ("legajoId") REFERENCES "Legajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodoLiquidacion" ADD CONSTRAINT "PeriodoLiquidacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacionMensual" ADD CONSTRAINT "LiquidacionMensual_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "PeriodoLiquidacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacionMensual" ADD CONSTRAINT "LiquidacionMensual_legajoId_fkey" FOREIGN KEY ("legajoId") REFERENCES "Legajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptoDefinicion" ADD CONSTRAINT "ConceptoDefinicion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptoLiquidacion" ADD CONSTRAINT "ConceptoLiquidacion_liquidacionId_fkey" FOREIGN KEY ("liquidacionId") REFERENCES "LiquidacionMensual"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptoLiquidacion" ADD CONSTRAINT "ConceptoLiquidacion_conceptoDefinicionId_fkey" FOREIGN KEY ("conceptoDefinicionId") REFERENCES "ConceptoDefinicion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TasaLaboral" ADD CONSTRAINT "TasaLaboral_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoDesvinculacion" ADD CONSTRAINT "EventoDesvinculacion_legajoId_fkey" FOREIGN KEY ("legajoId") REFERENCES "Legajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoDesvinculacion" ADD CONSTRAINT "EventoDesvinculacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeneficiarioFallecimiento" ADD CONSTRAINT "BeneficiarioFallecimiento_eventoDesvinculacionId_fkey" FOREIGN KEY ("eventoDesvinculacionId") REFERENCES "EventoDesvinculacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FalCuenta" ADD CONSTRAINT "FalCuenta_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FalMovimiento" ADD CONSTRAINT "FalMovimiento_falCuentaId_fkey" FOREIGN KEY ("falCuentaId") REFERENCES "FalCuenta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FalMovimiento" ADD CONSTRAINT "FalMovimiento_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "PeriodoLiquidacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FalMovimiento" ADD CONSTRAINT "FalMovimiento_eventoDesvinculacionId_fkey" FOREIGN KEY ("eventoDesvinculacionId") REFERENCES "EventoDesvinculacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
