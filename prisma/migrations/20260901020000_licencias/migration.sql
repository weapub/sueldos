-- CreateEnum
CREATE TYPE "TipoLicencia" AS ENUM ('ENFERMEDAD_INCULPABLE', 'ACCIDENTE_TRABAJO', 'MATERNIDAD', 'LICENCIA_ESPECIAL', 'SUSPENSION', 'SIN_GOCE', 'OTRA');

-- CreateTable
CREATE TABLE "Licencia" (
    "id" TEXT NOT NULL,
    "legajoId" TEXT NOT NULL,
    "tipo" "TipoLicencia" NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3) NOT NULL,
    "conGoce" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Licencia_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Licencia_legajoId_desde_idx" ON "Licencia"("legajoId", "desde");
ALTER TABLE "Licencia" ADD CONSTRAINT "Licencia_legajoId_fkey"
  FOREIGN KEY ("legajoId") REFERENCES "Legajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
