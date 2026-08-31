This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy

Producción corre con Docker Compose en el VPS (`docker-compose.yml`, red externa `systeg`).

### Autodeploy (GitHub Actions)

`.github/workflows/deploy.yml` corre en cada push/PR a `main`:

1. **checks** — `npm ci`, `prisma generate`, `lint`, `tsc --noEmit`, `test`, `build`.
2. **deploy** (solo push a `main`, si pasan los checks) — se conecta por SSH al VPS y ejecuta,
   en `DEPLOY_PATH`: `git reset --hard origin/main` → `docker compose --profile tools build` →
   `docker compose run --rm migrate-sueldos` (`prisma migrate deploy`) → `docker compose up -d api-sueldos`.

Configurar en el repo (Settings → Secrets and variables → Actions):

| Tipo | Nombre | Valor |
| --- | --- | --- |
| Variable | `DEPLOY_PATH` | Ruta del repo en el VPS (ej. `/opt/sueldos`). |
| Secret | `SSH_HOST` | IP o host del VPS. |
| Secret | `SSH_USER` | Usuario SSH (con permiso de `docker compose`). |
| Secret | `SSH_KEY` | Clave privada SSH (la pública va en `~/.ssh/authorized_keys` del VPS). |
| Secret | `SSH_PORT` | Opcional, default `22`. |

Requisitos en el VPS: el repo clonado en `DEPLOY_PATH` con `origin` apuntando a GitHub y `.env`
presente; `git`, `docker` y `docker compose` disponibles para `SSH_USER`. Conviene crear el
environment `production` en GitHub y, si se quiere, exigir aprobación manual antes del deploy.

Para dejar el VPS listo de una: `DEPLOY_PATH=/opt/sueldos bash scripts/deploy-bootstrap.sh`
(clona el repo, genera un `.env` inicial, crea la red `systeg` y hace el primer build + migración).

### Deploy manual

```bash
git pull
docker compose --profile tools build
docker compose run --rm migrate-sueldos
docker compose up -d api-sueldos
```
