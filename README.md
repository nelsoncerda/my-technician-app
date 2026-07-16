# Técnicos en RD

Marketplace local para encontrar, comparar y reservar técnicos en Santiago y el Cibao. El proyecto incluye una aplicación web React, una aplicación móvil Expo/React Native, una API Express y PostgreSQL mediante Prisma.

## Funciones principales

- Directorio de técnicos con búsqueda por servicio y ubicación.
- Perfiles verificados, valoraciones y reservas con disponibilidad real.
- Agendas separadas para servicios contratados y trabajos recibidos.
- Registro, verificación de correo y recuperación de contraseña.
- Panel de administración, gamificación, logros y recompensas.
- Autenticación con tokens firmados, contraseñas con `scrypt` y autorización por rol/propietario.

## Requisitos

- Node.js 20 o posterior
- npm
- PostgreSQL

## Desarrollo local

Instala las dependencias del frontend y la API:

```bash
npm install
cd server && npm install
```

Crea `server/.env`:

```env
DATABASE_URL="postgresql://usuario:clave@localhost:5432/my_technician_app?schema=public"
AUTH_SECRET="cambia-esto-por-un-secreto-aleatorio-de-al-menos-32-caracteres"
APP_URL="http://localhost:3000"
API_URL="http://localhost:3001"
CORS_ORIGIN="http://localhost:3000"
PORT=3001
```

Las variables SMTP son opcionales en desarrollo: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM`.

Prepara la base de datos y arranca ambos procesos en terminales separadas:

```bash
cd server
npx prisma migrate dev
npm run db:seed
npm run dev
```

```bash
npm start
```

La web queda en [http://localhost:3000](http://localhost:3000), la API en [http://localhost:3001](http://localhost:3001) y el estado del proceso en [http://localhost:3001/health](http://localhost:3001/health).

## Aplicación móvil

El cliente para iOS y Android vive en `mobile/` y reutiliza la API y las cuentas existentes:

```bash
cd mobile
npm install
npm start
```

Consulta [`mobile/README.md`](./mobile/README.md) para desarrollo y
[`mobile/PUBLISHING.md`](./mobile/PUBLISHING.md) para TestFlight, Google Play y
los datos requeridos por las tiendas.

## Verificación

```bash
# Frontend
CI=true npm test -- --runInBand
CI=true npm run build

# API
cd server
npm test
```

## Configuración de producción

- `AUTH_SECRET` es obligatorio en producción y debe tener al menos 32 caracteres.
- Define `REACT_APP_API_URL` al compilar el frontend solo si la API vive en otro origen. Sin esa variable, producción usa `/api` en el mismo dominio.
- Ejecuta `npx prisma migrate deploy` y `npm run db:seed` durante el despliegue.
- Sirve `build/` desde el proxy web y dirige `/api` al proceso Express.

La topología compartida actual y el despliegue seguro de la API móvil están en
[`docs/mobile-api-operations.md`](./docs/mobile-api-operations.md). El antiguo
despliegue de sitio completo se conserva únicamente como referencia histórica
en [`DEPLOYMENT.md`](./DEPLOYMENT.md).
