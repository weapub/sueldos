-- CreateEnum
CREATE TYPE "Convenio" AS ENUM ('COMERCIO_130_75', 'UECARA_660_13');

-- AlterTable
ALTER TABLE "CategoriaConvenio" ADD COLUMN "convenio" "Convenio" NOT NULL DEFAULT 'COMERCIO_130_75';
