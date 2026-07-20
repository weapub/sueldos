-- CreateEnum
CREATE TYPE "RubroRecibo" AS ENUM ('SINDICAL', 'SEGURIDAD_SOCIAL', 'OBRA_SOCIAL', 'INSSJP_PAMI', 'ART', 'CAMARAS_EMPRESARIALES', 'OTROS_CONVENCIONALES');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ClaveTasa" ADD VALUE 'DEDUCCION_FAECYS';
ALTER TYPE "ClaveTasa" ADD VALUE 'DEDUCCION_IPS_FSA';
ALTER TYPE "ClaveTasa" ADD VALUE 'CONTRIB_ASIG_FAMILIARES';
ALTER TYPE "ClaveTasa" ADD VALUE 'CONTRIB_FNE';
ALTER TYPE "ClaveTasa" ADD VALUE 'ART_FFEP_FIJO';
ALTER TYPE "ClaveTasa" ADD VALUE 'SVO_FIJO';
ALTER TYPE "ClaveTasa" ADD VALUE 'APORTE_SOLIDARIO_OSECAC_FIJO';
ALTER TYPE "ClaveTasa" ADD VALUE 'DETRACCION_ART22_CON_SAC';
ALTER TYPE "ClaveTasa" ADD VALUE 'DETRACCION_ART22_SIN_SAC';
ALTER TYPE "ClaveTasa" ADD VALUE 'DETRACCION_ART23_CONTRIBUCIONES';

-- AlterTable
ALTER TABLE "CategoriaConvenio" ADD COLUMN     "remuneracionNoRemunerativa" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ConceptoDefinicion" ADD COLUMN     "afectaRegDiferenciales" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "afectaRegEspeciales" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aportesFondoSolidario" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aportesInssjp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aportesObraSocial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aportesRenatea" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aportesSipa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "codigoArca" TEXT,
ADD COLUMN     "contribAsigFamiliares" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contribFNE" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contribFondoSolidario" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contribInssjp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contribLRT" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contribObraSocial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contribRenatea" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contribSipa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rubroRecibo" "RubroRecibo";

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "direccion" TEXT,
ADD COLUMN     "jornadaLaboralCodigo" INTEGER,
ADD COLUMN     "tipoEmpresaArca" INTEGER;

-- AlterTable
ALTER TABLE "Legajo" ADD COLUMN     "afiliadoSindical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cantidadHijos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cbu" TEXT,
ADD COLUMN     "codigoActividad" INTEGER,
ADD COLUMN     "codigoCondicion" INTEGER,
ADD COLUMN     "codigoLocalidad" INTEGER,
ADD COLUMN     "codigoModalidadContratacion" INTEGER,
ADD COLUMN     "codigoObraSocialRnos" TEXT,
ADD COLUMN     "codigoSiniestrado" INTEGER,
ADD COLUMN     "codigoSituacion" INTEGER,
ADD COLUMN     "conyuge" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "correspondeCCT" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "correspondeReduccion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "correspondeSVO" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cuentaSueldo" TEXT,
ADD COLUMN     "diaInicioSituacionRevista1" INTEGER,
ADD COLUMN     "diaInicioSituacionRevista2" INTEGER,
ADD COLUMN     "diaInicioSituacionRevista3" INTEGER,
ADD COLUMN     "regimenRIFL" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "regimenRIFLFechaAlta" TIMESTAMP(3),
ADD COLUMN     "situacionRevista1" INTEGER,
ADD COLUMN     "situacionRevista2" INTEGER,
ADD COLUMN     "situacionRevista3" INTEGER;

-- AlterTable
ALTER TABLE "PeriodoLiquidacion" ADD COLUMN     "ultimoDepositoAportesBanco" TEXT,
ADD COLUMN     "ultimoDepositoAportesFecha" TIMESTAMP(3),
ADD COLUMN     "ultimoDepositoAportesPeriodo" TEXT;

-- AlterTable
ALTER TABLE "TasaLaboral" ALTER COLUMN "valor" SET DATA TYPE DECIMAL(14,5);
