# Publicación de Técnicos en RD

## 1. Estado técnico

La aplicación está preparada para builds de iOS y Android con EAS. La API móvil vive en:

```text
https://api.tecnicosenrd.com
```

Verificación rápida:

```bash
curl -fsS https://api.tecnicosenrd.com/health
curl -fsS https://api.tecnicosenrd.com/api/settings
```

El dominio principal `tecnicosenrd.com` actualmente sirve otra aplicación. No lo uses como URL de soporte o privacidad hasta decidir si Técnicos en RD recuperará ese dominio o utilizará otro.

### Builds de lanzamiento — 16 de julio de 2026

- Proyecto Expo: `@nelsoncerda/tecnicos-en-rd`.
- Android de tienda (AAB, versión `1.0.0`, código `3`): build `99643332-00bd-4164-9eb2-c975b59f0cae`, finalizado y validado. Artefacto: <https://expo.dev/artifacts/eas/gla3aP0nWveWByE4ZgoncOl9zNzcdzzAfc1OBDHf_JQ.aab>.
- iOS para simulador: build `c56f4643-0742-42c2-ab7d-30f2faa9996a`, finalizado y probado.
- iOS para TestFlight/App Store (IPA, versión `1.0.0`, build `5`): build `2c3e7e5f-7aca-4b0b-a624-e7e773a1a7e7`, finalizado, firmado y validado. Se verificó directamente que el `Info.plist` del IPA incluye las descripciones de movimiento y ubicación. Artefacto: <https://expo.dev/artifacts/eas/lsO4V5fQS55x4ymRkdnZoLl7avnyopVHlzixuF5_O-k.ipa>.
- Ficha de App Store Connect: Apple ID `6791414260`, vinculada en `eas.json`.
- El build 4 quedó obsoleto después de que Apple reportó `ITMS-90683` por la ausencia de `NSMotionUsageDescription`. La configuración se corrigió y se añadió una prueba de regresión.
- Entrega del build 5 a App Store Connect: submission EAS `a054c1be-1ead-42bb-8a92-3c87ee629c77`, finalizada sin errores y procesada por Apple.
- Envío a App Review: submission Apple `46fef2e4-a062-4ed7-93bb-6fd06f55a286`, estado `Waiting for Review` desde el 16 de julio de 2026. La publicación permanece manual después de la aprobación.
- Metadatos reproducibles: `store.config.js`, validados y sincronizados con EAS Metadata. Incluyen la ficha en español, categoría Lifestyle, lanzamiento manual, las cuatro capturas de iPhone y la cuenta dedicada de revisión obtenida desde macOS Keychain.
- Capturas: cuatro imágenes para iPhone de 6.3 pulgadas y cuatro para el grupo obligatorio de 6.5 pulgadas (`1242 × 2688`).
- Clasificación de edad: 4+; las preguntas nuevas de redes sociales y acceso social para menores de 13 se respondieron `No`.
- EAS Metadata v0 todavía no representa esas dos preguntas sociales; después de futuras sincronizaciones de metadatos, verificarlas manualmente en App Information antes de enviar otra versión.
- App Privacy publicada para el build anterior: nueve tipos de datos, usados para funcionalidad, vinculados a la identidad y sin rastreo. Antes de enviar la versión con mapa, añadir `Ubicación aproximada` para las zonas de servicio publicadas por técnicos.

Los artefactos anteriores no contienen la paridad móvil añadida después: cuentas profesionales, agenda recibida/contratada, ciclo completo de reservas, disponibilidad, perfiles editables, fotos, recompensas y panel administrativo. Estas funciones requieren un build nuevo; `expo-image-picker` añade código nativo y no puede entregarse como una simple actualización de JavaScript.

### Controles de contenido generado por usuarios

La versión actual implementa los controles necesarios dentro del producto: aceptación explícita y versionada de las normas, filtros de texto público, revisión previa de perfiles profesionales y fotos, reporte confidencial con motivos controlados, bloqueo separado entre usuarios, seguimiento de reportes y cola administrativa con SLA, notas de resolución, retiro de contenido y suspensión. Las fotos candidatas no se publican hasta ser aprobadas; una entrega rechazada o reemplazada se limpia del almacenamiento temporal.

Antes de solicitar revisión pública todavía debe completarse la preparación operativa: desplegar la migración y API de moderación, verificar que `ncerda@hotmail.com` esté monitoreado para soporte y apelaciones, asignar responsables de revisar la cola diariamente y probar los flujos completos en producción. Mantener `userGeneratedContent` en `true` y responder coherentemente en Apple y Google. Consulta la [directriz 1.2 de Apple](https://developer.apple.com/app-store/review/guidelines/#user-generated-content) y la [política de contenido generado por usuarios de Google Play](https://support.google.com/googleplay/android-developer/answer/9876937).

Los builds se consultan en `https://expo.dev/accounts/nelsoncerda/projects/tecnicos-en-rd/builds`.

## 2. Cuentas necesarias

1. Crear o confirmar una cuenta de Expo en <https://expo.dev>.
2. Inscribirse en Apple Developer Program y aceptar los contratos de App Store Connect.
3. Crear una cuenta de Google Play Console y completar la verificación del desarrollador.
4. Correo público y monitoreado de soporte para iOS: `ncerda@hotmail.com`. Confirmar si Google Play usará el mismo.

Las credenciales, códigos de doble factor y acuerdos legales deben ser manejados por el titular de cada cuenta.

## 3. Vincular el proyecto a Expo

Desde `mobile/`:

```bash
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest init
```

`eas init` añadirá el `projectId` permanente a la configuración. Revisa el cambio antes de continuar.

## 4. Build interno

Primero crea builds para pruebas, sin enviarlos a revisión:

```bash
npx eas-cli@latest build --profile preview --platform android
npx eas-cli@latest build --profile preview --platform ios
```

Prueba como mínimo:

- Registro como cliente y como profesional; conversión de una cuenta existente.
- Verificación de correo, reenvío/actualización del estado, inicio y cierre de sesión.
- Recuperación de contraseña.
- Búsqueda y selección desde el autocompletado.
- Permiso de GPS aceptado y rechazado.
- Reserva completa con dirección manual y con GPS.
- Agenda de servicios contratados y solicitudes recibidas.
- Confirmar, iniciar y completar una reserva como técnico; registrar precio opcional.
- Consulta, contacto y cancelación desde ambos roles.
- Calificación estructurada después de completar un servicio y prevención de duplicados.
- Aceptación explícita y no preseleccionada de las normas al crear cuenta y para cuentas antiguas antes de publicar.
- Perfil/foto pendientes hasta aprobación; rechazo y reemplazo sin publicar la candidata.
- Reportar y Bloquear como acciones distintas desde perfiles y contactos de reservas, en ambos sentidos.
- Consulta de Mis reportes, administración de bloqueos y desbloqueo.
- Cola administrativa: antigüedad/SLA, notas requeridas, aprobar/rechazar fotos y perfiles, advertir, retirar, suspender, resolver y descartar.
- Edición de perfil, foto permitida/denegada, historial y visibilidad del mapa.
- Selección de foto en Android 12 o anterior sin solicitar acceso amplio a la biblioteca; cancelación del selector y reemplazo de una foto existente.
- Configuración de disponibilidad semanal y validación de horas.
- Puntos, logros, clasificación y canje de recompensas.
- Acceso denegado/permitido al panel administrativo y cada mutación protegida.
- Eliminación de cuenta.
- Tamaños de texto grandes, VoiceOver/TalkBack y teléfonos pequeños.

## 5. Material de las tiendas

Preparar para ambas tiendas:

- Nombre: Técnicos en RD.
- Descripción corta y descripción completa en español.
- Ícono de alta resolución y capturas reales de teléfonos.
- Categoría sugerida: Estilo de vida o Servicios para el hogar, según las opciones vigentes.
- URL pública de política de privacidad.
- URL pública para solicitar eliminación de cuenta.
- Correo y URL de soporte.
- Declaraciones de recopilación de datos coherentes con la aplicación.

Declaración funcional de ubicación: el GPS del cliente es iniciado por el usuario, solo mientras usa la aplicación, y sirve para sugerir zona y completar dirección. Además, un técnico puede publicar una zona de servicio aproximada vinculada a su perfil para aparecer en el mapa. No hay rastreo, ubicación en segundo plano ni publicación de domicilios exactos.

Declaración funcional de fotos: el selector se abre únicamente al pulsar “Elegir foto” o “Cambiar foto”, acepta una sola imagen de perfil y no solicita cámara ni micrófono. Actualiza App Privacy y Data safety antes de enviar el nuevo binario.

## 6. App Store Connect

1. Crear la ficha con bundle ID `com.tecnicosenrd.app`.
2. Completar App Privacy y la información de revisión.
   Confirmar que `userGeneratedContent` permanece en `true`, que la API de moderación está desplegada y que la cola operativa está siendo monitoreada.
3. Generar el build:

   ```bash
   npx eas-cli@latest build --profile production --platform ios
   ```

4. Enviar a App Store Connect:

   ```bash
   npx eas-cli@latest submit --profile production --platform ios
   ```

5. Cuando Apple termine de procesar el binario, sincronizar la ficha y las capturas:

   ```bash
   npx eas-cli@latest metadata:lint
   npx eas-cli@latest metadata:push --profile production
   ```

6. Probar con TestFlight antes de solicitar revisión pública.

Proporciona al equipo de revisión una cuenta de demostración si las reservas autenticadas no pueden evaluarse sin credenciales.

## 7. Google Play Console

Estado actual: la cuenta de Play Console ya está verificada, la ficha está creada y el AAB con código `3` está disponible en la prueba interna. Ese build es anterior al mapa y debe reemplazarse por un AAB nuevo después de configurar Google Maps.

1. Crear la aplicación con package `com.tecnicosenrd.app`.
2. En Google Cloud, habilitar Maps SDK for Android y crear una clave restringida
   al package `com.tecnicosenrd.app` y al SHA-1 de App Signing de Google Play.
   Guardarla como variable sensible `GOOGLE_MAPS_ANDROID_API_KEY` en el entorno
   de producción de EAS; no copiar la clave a `app.json` ni guardarla en Git.
3. Completar Data safety, App access, clasificación de contenido y eliminación de cuenta.
   Declarar la foto de perfil como contenido/foto opcional y confirmar contenido generado por usuarios mientras pueda publicarse en el directorio.
4. Generar un Android App Bundle nuevo después de configurar la clave. El AAB
   con código `3` es anterior al mapa y no debe publicarse como esta versión:

   ```bash
   npx eas-cli@latest build --profile production --platform android
   ```

5. En cuentas nuevas, el primer `.aab` puede requerir carga manual antes de utilizar envíos automatizados.
6. Completar las pruebas cerradas que Google exija para el tipo y antigüedad de la cuenta.
7. Después de la primera carga, los siguientes builds pueden enviarse con:

   ```bash
   npx eas-cli@latest submit --profile production --platform android
   ```

## 8. Lanzamiento gradual

Comienza con TestFlight y prueba interna/cerrada de Play. Prueba por separado cuentas de cliente, técnico y administrador; corrige fallos, confirma el correo transaccional y supervisa la API antes de ampliar el porcentaje de usuarios. Mantén la web disponible como canal alternativo durante el lanzamiento de la versión móvil con paridad funcional.
