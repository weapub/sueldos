-- CreateTable
CREATE TABLE "AdelantoSueldo" (
    "id" TEXT NOT NULL,
    "legajoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" DECIMAL(14,2) NOT NULL,
    "observaciones" TEXT,
    "aplicadoEnLiquidacionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdelantoSueldo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdelantoSueldo_legajoId_aplicadoEnLiquidacionId_idx" ON "AdelantoSueldo"("legajoId", "aplicadoEnLiquidacionId");

-- AddForeignKey
ALTER TABLE "AdelantoSueldo" ADD CONSTRAINT "AdelantoSueldo_legajoId_fkey" FOREIGN KEY ("legajoId") REFERENCES "Legajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
