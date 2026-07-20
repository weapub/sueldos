import Link from "next/link";
import { listarEmpresas } from "@/actions/empresas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/authz";

const TAMANO_LABEL: Record<string, string> = {
  MICRO: "Micro",
  PEQUENA: "Pequeña",
  MEDIANA: "Mediana",
  GRANDE: "Grande",
};

export default async function EmpresasPage() {
  const session = await requireSession();
  const result = await listarEmpresas();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Empresas</h1>
          <p className="text-sm text-muted-foreground">Clientes del estudio contable.</p>
        </div>
        {session.user.role !== "CLIENTE" && (
          <Button asChild>
            <Link href="/empresas/nueva">Nueva empresa</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {!result.ok ? (
            <p className="p-6 text-sm text-destructive">{result.error}</p>
          ) : result.data.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Todavía no hay empresas cargadas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razón social</TableHead>
                  <TableHead>CUIT</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Provincia</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((empresa) => (
                  <TableRow key={empresa.id}>
                    <TableCell>
                      <Link href={`/empresas/${empresa.id}`} className="font-medium hover:underline">
                        {empresa.razonSocial}
                      </Link>
                    </TableCell>
                    <TableCell>{empresa.cuit}</TableCell>
                    <TableCell>{TAMANO_LABEL[empresa.tamano]}</TableCell>
                    <TableCell>{empresa.provincia}</TableCell>
                    <TableCell>
                      <Badge variant={empresa.activa ? "default" : "secondary"}>
                        {empresa.activa ? "Activa" : "Archivada"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
