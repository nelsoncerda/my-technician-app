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

## 2. Cuentas necesarias

1. Crear o confirmar una cuenta de Expo en <https://expo.dev>.
2. Inscribirse en Apple Developer Program y aceptar los contratos de App Store Connect.
3. Crear una cuenta de Google Play Console y completar la verificación del desarrollador.
4. Definir un correo público y monitoreado para soporte y solicitudes de privacidad.

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

- Registro, verificación de correo, inicio y cierre de sesión.
- Recuperación de contraseña.
- Búsqueda y selección desde el autocompletado.
- Permiso de GPS aceptado y rechazado.
- Reserva completa con dirección manual y con GPS.
- Consulta y cancelación de reserva.
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

Declaración funcional de ubicación: acceso preciso o aproximado, iniciado por el usuario, solo mientras usa la aplicación; se utiliza para sugerir zona y completar dirección. No hay rastreo ni ubicación en segundo plano.

## 6. App Store Connect

1. Crear la ficha con bundle ID `com.tecnicosenrd.app`.
2. Completar App Privacy y la información de revisión.
3. Generar el build:

   ```bash
   npx eas-cli@latest build --profile production --platform ios
   ```

4. Enviar a App Store Connect:

   ```bash
   npx eas-cli@latest submit --profile production --platform ios
   ```

5. Probar con TestFlight antes de solicitar revisión pública.

Proporciona al equipo de revisión una cuenta de demostración si las reservas autenticadas no pueden evaluarse sin credenciales.

## 7. Google Play Console

1. Crear la aplicación con package `com.tecnicosenrd.app`.
2. Completar Data safety, App access, clasificación de contenido y eliminación de cuenta.
3. Generar el Android App Bundle:

   ```bash
   npx eas-cli@latest build --profile production --platform android
   ```

4. En cuentas nuevas, el primer `.aab` puede requerir carga manual antes de utilizar envíos automatizados.
5. Completar las pruebas cerradas que Google exija para el tipo y antigüedad de la cuenta.
6. Después de la primera carga, los siguientes builds pueden enviarse con:

   ```bash
   npx eas-cli@latest submit --profile production --platform android
   ```

## 8. Lanzamiento gradual

Comienza con TestFlight y prueba interna/cerrada de Play. Corrige fallos, confirma el correo transaccional y supervisa la API antes de ampliar el porcentaje de usuarios. Mantén el portal administrativo y las funciones de técnicos en la web durante esta primera versión móvil orientada a clientes.
