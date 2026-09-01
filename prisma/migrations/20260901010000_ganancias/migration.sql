-- CreateTable
CREATE TABLE "GananciasParametro" (
    "id" TEXT NOT NULL,
    "mni" DECIMAL(16,2) NOT NULL,
    "deduccionEspecial" DECIMAL(16,2) NOT NULL,
    "deduccionConyuge" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "deduccionHijo" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "vigenciaDesde" TIMESTAMP(3) NOT NULL,
    "vigenciaHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GananciasParametro_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GananciasParametro_vigenciaDesde_idx" ON "GananciasParametro"("vigenciaDesde");

-- CreateTable
CREATE TABLE "GananciasEscalaTramo" (
    "id" TEXT NOT NULL,
    "parametroId" TEXT NOT NULL,
    "desde" DECIMAL(16,2) NOT NULL,
    "hasta" DECIMAL(16,2),
    "montoFijo" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "porcentaje" DECIMAL(6,4) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "GananciasEscalaTramo_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GananciasEscalaTramo_parametroId_idx" ON "GananciasEscalaTramo"("parametroId");
ALTER TABLE "GananciasEscalaTramo" ADD CONSTRAINT "GananciasEscalaTramo_parametroId_fkey"
  FOREIGN KEY ("parametroId") REFERENCES "GananciasParametro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "GananciasLegajoConfig" (
    "id" TEXT NOT NULL,
    "legajoId" TEXT NOT NULL,
    "liquidaGanancias" BOOLEAN NOT NULL DEFAULT false,
    "computaConyuge" BOOLEAN NOT NULL DEFAULT false,
    "cantidadHijosACargo" INTEGER NOT NULL DEFAULT 0,
    "otrasDeduccionesMensuales" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "detalleJson" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GananciasLegajoConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GananciasLegajoConfig_legajoId_key" ON "GananciasLegajoConfig"("legajoId");
ALTER TABLE "GananciasLegajoConfig" ADD CONSTRAINT "GananciasLegajoConfig_legajoId_fkey"
  FOREIGN KEY ("legajoId") REFERENCES "Legajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "GananciasAcumulado" (
    "id" TEXT NOT NULL,
    "legajoId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "gananciaNetaAcum" DECIMAL(16,2) NOT NULL,
    "impuestoDeterminadoAcum" DECIMAL(16,2) NOT NULL,
    "retenidoAcum" DECIMAL(16,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GananciasAcumulado_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GananciasAcumulado_legajoId_anio_mes_key" ON "GananciasAcumulado"("legajoId", "anio", "mes");
CREATE INDEX "GananciasAcumulado_legajoId_anio_idx" ON "GananciasAcumulado"("legajoId", "anio");
ALTER TABLE "GananciasAcumulado" ADD CONSTRAINT "GananciasAcumulado_legajoId_fkey"
  FOREIGN KEY ("legajoId") REFERENCES "Legajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
