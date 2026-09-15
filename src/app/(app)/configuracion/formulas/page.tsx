import { listarFormulasConceptos } from "@/actions/configuracion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormulasTabla } from "./formulas-tabla";

const GRUPOS: { tipos: string[]; titulo: string; descripcion?: string }[] = [
  { tipos: ["REMUNERATIVO", "NO_REMUNERATIVO"], titulo: "Haberes" },
  { tipos: ["DEDUCCION"], titulo: "Deducciones" },
  {
    tipos: ["CONTRIBUCION_PATRONAL"],
    titulo: "Contribuciones patronales",
    descripcion:
      "Se reducen automáticamente si el legajo aplica el régimen RIFL (Ley 27.802, Título XX) — ART y SVO quedan fuera de esa reducción.",
  },
];

export default async function FormulasPage() {
  const result = await listarFormulasConceptos();

  return (
    <div className="space-y-6">
      <div className="max-w-3xl space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Fórmulas de los conceptos del recibo</h2>
        <p className="text-sm text-muted-foreground">
          Así calcula el motor cada línea que aparece en los recibos. Los valores resaltados
          son las tasas vigentes — hacé clic en cualquiera para cargar una nueva versión sin
          salir de esta pantalla (queda registrada con vigencia, nunca se pisa el histórico).
        </p>
      </div>

      {!result.ok ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : (
        GRUPOS.map((grupo) => {
          const items = result.data.filter((c) => grupo.tipos.includes(c.tipo));
          if (items.length === 0) return null;
          return (
            <Card key={grupo.titulo}>
              <CardHeader>
                <CardTitle className="text-base">{grupo.titulo}</CardTitle>
                {grupo.descripcion && (
                  <p className="text-sm text-muted-foreground">{grupo.descripcion}</p>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <FormulasTabla items={items} />
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
