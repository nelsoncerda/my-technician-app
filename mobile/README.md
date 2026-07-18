# Técnicos en RD — aplicación móvil

Aplicación nativa para clientes, creada con Expo SDK 57 y React Native. Consume la API existente de Técnicos en RD y comparte sus usuarios, técnicos, calificaciones agregadas y reservas.

## Alcance de la versión 1

- Directorio de técnicos con autocompletado, filtros, perfiles y calificaciones.
- Vista de mapa con zonas aproximadas de servicio y acceso rápido al perfil o reserva.
- GPS opcional en primer plano para reconocer la zona y completar una dirección.
- Solicitud de servicios con fecha, horarios disponibles y dirección manual o detectada.
- Lista y detalle de reservas, contacto y cancelación.
- Registro, inicio de sesión, recuperación de contraseña y almacenamiento seguro de sesión.
- Eliminación permanente de cuenta dentro de la aplicación.
- Política de privacidad y términos en español.

El acelerómetro y el acceso en segundo plano no se solicitan: no existe todavía una función de producto que los necesite.

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
