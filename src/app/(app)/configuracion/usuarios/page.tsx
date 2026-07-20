import { listarUsuarios } from "@/actions/usuarios";
import { listarEmpresas } from "@/actions/empresas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UsuarioForm } from "./usuario-form";
import { ToggleActivoButton } from "./toggle-activo-button";

export default async function UsuariosPage() {
  const [usuariosResult, empresasResult] = await Promise.all([listarUsuarios(), listarEmpresas()]);

  if (!usuariosResult.ok) {
    return <p className="text-sm text-destructive">{usuariosResult.error}</p>;
  }

  const empresas = empresasResult.ok ? empresasResult.data : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuarios del estudio</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuariosResult.data.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nombre}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>{u.empresa?.razonSocial ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.activo ? "default" : "secondary"}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ToggleActivoButton usuarioId={u.id} activo={u.activo} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nuevo usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <UsuarioForm empresas={empresas.map((e) => ({ id: e.id, razonSocial: e.razonSocial }))} />
        </CardContent>
      </Card>
    </div>
  );
}
