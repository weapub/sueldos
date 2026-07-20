import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerEmpresa } from "@/actions/empresas";
import { crearCategoria } from "@/actions/legajos";
import { EmpresaForm } from "../empresa-form";
import { actualizarEmpresa } from "@/actions/empresas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoriaForm } from "./categoria-form";
import { formatFechaAR } from "@/lib/fecha";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function EmpresaDetailPage({
  params,
}: {
  params: Promise<{ empresaId: string }>;
}) {
  const { empresaId } = await params;
  const result = await obtenerEmpresa(empresaId);
  if (!result.ok) notFound();
  const empresa = result.data;

  const updateAction = actualizarEmpresa.bind(null, empresaId);
  const createCategoriaAction = crearCategoria.bind(null, empresaId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{empresa.razonSocial}</h1>
          <p className="text-sm text-muted-foreground">CUIT {empresa.cuit}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href={`/empresas/${empresaId}/legajos`}>Legajos</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/empresas/${empresaId}/liquidaciones`}>Liquidaciones</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/empresas/${empresaId}/desvinculaciones`}>Desvinculaciones</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/empresas/${empresaId}/fal`}>FAL</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="datos">
        <TabsList>
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="categorias">Categorías / Convenio</TabsTrigger>
        </TabsList>
        <TabsContent value="datos" className="pt-4">
          <EmpresaForm
            action={updateAction}
            empresa={{
              razonSocial: empresa.razonSocial,
              cuit: empresa.cuit,
              actividad: empresa.actividad,
              tamano: empresa.tamano,
              provincia: empresa.provincia,
              direccion: empresa.direccion,
            }}
          />
        </TabsContent>
        <TabsContent value="categorias" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Categorías vigentes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {empresa.categorias.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Sin categorías cargadas.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Convenio</TableHead>
                      <TableHead>Salario base (tope art. 245)</TableHead>
                      <TableHead>Vigencia desde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empresa.categorias.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">{cat.nombre}</TableCell>
                        <TableCell>{cat.convenioNombre ?? "—"}</TableCell>
                        <TableCell>
                          $
                          {Number(cat.salarioBaseConvenio).toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          {formatFechaAR(cat.vigenciaDesde)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nueva categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoriaForm action={createCategoriaAction} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
