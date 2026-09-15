-- CreateEnum
CREATE TYPE "TipoMovimientoFondoCese" AS ENUM ('DEPOSITO_MENSUAL', 'RETIRO_CESE', 'AJUSTE');

-- CreateTable
CREATE TABLE "FondoCeseCuenta" (
    "id" TEXT NOT NULL,
    "legajoId" TEXT NOT NULL,
    "fechaAlta" TIMESTAMP(3) NOT NULL,
    "saldoActual" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FondoCeseCuenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FondoCeseMovimiento" (
    "id" TEXT NOT NULL,
    "fondoCeseCuentaId" TEXT NOT NULL,
    "tipo" "TipoMovimientoFondoCese" NOT NULL,
    "periodoId" TEXT,
    "eventoDesvinculacionId" TEXT,
    "monto" DECIMAL(14,2) NOT NULL,
    "saldoResultante" DECIMAL(14,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FondoCeseMovimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FondoCeseCuenta_legajoId_key" ON "FondoCeseCuenta"("legajoId");

-- CreateIndex
CREATE UNIQUE INDEX "FondoCeseMovimiento_eventoDesvinculacionId_key" ON "FondoCeseMovimiento"("eventoDesvinculacionId");

-- CreateIndex
CREATE INDEX "FondoCeseMovimiento_fondoCeseCuentaId_idx" ON "FondoCeseMovimiento"("fondoCeseCuentaId");

-- AddForeignKey
ALTER TABLE "FondoCeseCuenta" ADD CONSTRAINT "FondoCeseCuenta_legajoId_fkey" FOREIGN KEY ("legajoId") REFERENCES "Legajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FondoCeseMovimiento" ADD CONSTRAINT "FondoCeseMovimiento_fondoCeseCuentaId_fkey" FOREIGN KEY ("fondoCeseCuentaId") REFERENCES "FondoCeseCuenta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FondoCeseMovimiento" ADD CONSTRAINT "FondoCeseMovimiento_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "PeriodoLiquidacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FondoCeseMovimiento" ADD CONSTRAINT "FondoCeseMovimiento_eventoDesvinculacionId_fkey" FOREIGN KEY ("eventoDesvinculacionId") REFERENCES "EventoDesvinculacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
