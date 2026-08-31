-- AlterTable: alícuota (fracción, ej. 0.11000 = 11%) que se muestra junto a cada
-- deducción en el recibo. Snapshot al calcular; NULL en conceptos sin porcentaje
-- (montos fijos, deducciones manuales) y en liquidaciones calculadas antes de esta versión.
ALTER TABLE "ConceptoLiquidacion" ADD COLUMN "porcentaje" DECIMAL(8,5);
