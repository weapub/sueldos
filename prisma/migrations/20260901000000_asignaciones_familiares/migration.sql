-- CreateEnum
CREATE TYPE "VinculoFamiliar" AS ENUM ('HIJO', 'HIJO_CON_DISCAPACIDAD', 'CONYUGE', 'OTRO');
CREATE TYPE "TipoAsignacionFamiliar" AS ENUM ('HIJO', 'HIJO_DISCAPACIDAD', 'PRENATAL', 'AYUDA_ESCOLAR');

-- AlterTable
ALTER TABLE "Legajo"
  ADD COLUMN "conyugeEmbarazada" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "igfDeclarado" DECIMAL(14,2),
  ADD COLUMN "zonaAsignacion" TEXT NOT NULL DEFAULT 'GENERAL';

-- CreateTable
CREATE TABLE "FamiliarACargo" (
    "id" TEXT NOT NULL,
    "legajoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "vinculo" "VinculoFamiliar" NOT NULL,
    "fechaNacimiento" TIMESTAMP(3),
    "enEscolaridad" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FamiliarACargo_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FamiliarACargo_legajoId_idx" ON "FamiliarACargo"("legajoId");
ALTER TABLE "FamiliarACargo" ADD CONSTRAINT "FamiliarACargo_legajoId_fkey"
  FOREIGN KEY ("legajoId") REFERENCES "Legajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "EscalaAsignacionFamiliar" (
    "id" TEXT NOT NULL,
    "tipo" "TipoAsignacionFamiliar" NOT NULL,
    "zona" TEXT NOT NULL DEFAULT 'GENERAL',
    "igfDesde" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "igfHasta" DECIMAL(14,2),
    "monto" DECIMAL(14,2) NOT NULL,
    "vigenciaDesde" TIMESTAMP(3) NOT NULL,
    "vigenciaHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EscalaAsignacionFamiliar_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EscalaAsignacionFamiliar_tipo_zona_vigenciaDesde_idx" ON "EscalaAsignacionFamiliar"("tipo", "zona", "vigenciaDesde");
