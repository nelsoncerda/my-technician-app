# Técnicos en RD — aplicación móvil

Aplicación nativa compartida para iOS y Android, creada con Expo SDK 57 y React Native. Consume la misma API que la aplicación web de Técnicos en RD y comparte cuentas, técnicos, reservas, calificaciones, perfiles y recompensas.

## Funciones compartidas con la web

- Directorio de técnicos con autocompletado, filtros, perfiles y calificaciones.
- Vista de mapa con zonas aproximadas de servicio y acceso rápido al perfil o reserva.
- GPS opcional en primer plano para reconocer la zona y completar una dirección.
- Solicitud de servicios con fecha, horarios disponibles y dirección manual o detectada.
- Agenda separada para servicios contratados y solicitudes recibidas por técnicos.
- Flujo de reservas completo: confirmar, iniciar, completar, contactar y cancelar según el rol.
- Calificación posterior a un servicio mediante estrellas y opciones de experiencia controladas.
- Registro de clientes o profesionales, conversión de cuenta y almacenamiento seguro de sesión.
- Edición de perfil, foto opcional, historial de cambios y verificación de correo.
- Servicios, zona aproximada, visibilidad en el mapa y disponibilidad semanal para profesionales.
- Puntos, niveles, logros, clasificación y canje de recompensas.
- Panel móvil para administradores con reportes, técnicos, usuarios, reservas y catálogo.
- Moderación previa de perfiles y fotos, consentimiento versionado de normas, reportes confidenciales y bloqueo separado.
- Seguimiento de reportes, administración de usuarios bloqueados y cola móvil con SLA y decisiones auditables.
- Eliminación permanente de cuenta dentro de la aplicación.
- Página “Cómo funciona”, política de privacidad, términos y soporte en español.

La selección de foto usa únicamente la biblioteca del sistema. No se solicitan cámara, micrófono, acelerómetro ni ubicación en segundo plano porque ninguna función del producto los necesita.

La matriz que evita nuevas diferencias entre clientes está en [FEATURE_PARITY.md](./FEATURE_PARITY.md).

## Desarrollo local

Requiere Node.js 24 (también son compatibles las versiones declaradas en `package.json`).

```bash
cd mobile
npm install
cp .env.example .env.local
npm start
```

La API de producción predeterminada es `https://api.tecnicosenrd.com`. Para usar otra:

```dotenv
EXPO_PUBLIC_API_URL=https://api.ejemplo.com
```

El mapa nativo usa `react-native-maps`. Expo Go ya incluye lo necesario para
probarlo, pero un build Android independiente necesita la variable de entorno
`GOOGLE_MAPS_ANDROID_API_KEY`. Configúrala en el entorno de producción de EAS,
sin guardarla en Git. En Google Cloud, habilita Maps SDK for Android y restringe
la clave al package `com.tecnicosenrd.app` y al SHA-1 de firma de Google Play.

Comprobaciones antes de cada build:

```bash
npm run typecheck
npm run lint
npm run doctor
npm run export:web
```

## Identificadores permanentes

- Nombre: `Técnicos en RD`
- Slug de Expo: `tecnicos-en-rd`
- Esquema: `tecnicosenrd`
- Bundle ID de iOS: `com.tecnicosenrd.app`
- Package de Android: `com.tecnicosenrd.app`

No deben cambiarse después de crear las fichas en App Store Connect y Google Play Console.

## Publicación

La configuración de EAS está en `eas.json`. Consulta [PUBLISHING.md](./PUBLISHING.md) para el recorrido completo.

Resumen:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --profile preview --platform all
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --profile production --platform ios
npx eas-cli@latest submit --profile production --platform android
```

No envíes builds a revisión pública hasta confirmar si Google Play usará el correo público de soporte de iOS (`ncerda@hotmail.com`) y completar las cuentas de Apple/Google. La política, los términos, el soporte y la eliminación web ya están publicados en `api.tecnicosenrd.com`.
