# Borrador de declaraciones de datos

Este documento sirve para completar App Privacy y Google Play Data safety. Las respuestas deben revisarse nuevamente justo antes de cada envío.

## Datos tratados por Técnicos en RD

| Categoría | Ejemplos | Finalidad | Compartido |
| --- | --- | --- | --- |
| Información de contacto | nombre, correo, teléfono | cuenta, reserva, avisos y contacto entre las partes | con el técnico o cliente de la reserva; proveedores operativos |
| Identificadores | ID interno de usuario y reserva | autenticación, seguridad y operación | proveedores operativos |
| Contenido del usuario | foto opcional, descripción, dirección del servicio y calificaciones | perfil y prestación del servicio | con usuarios involucrados; las calificaciones solo se muestran de forma agregada |
| Actividad de la aplicación | historial y estado de reservas | ofrecer y administrar la función solicitada | proveedores operativos |
| Diagnóstico/seguridad | IP y registros básicos del servidor | seguridad, prevención de abuso y disponibilidad | proveedor de alojamiento |

## Ubicación

El permiso de GPS es opcional, explícito y solo en primer plano. Las coordenadas se utilizan temporalmente para obtener una zona/dirección y no se envían como latitud/longitud a la API de Técnicos en RD. Si el usuario confirma una reserva, la dirección resultante sí se almacena como contenido de la reserva.

Antes de contestar que el desarrollador “recopila ubicación precisa”, confirma la definición vigente de cada tienda: el procesamiento efímero en el dispositivo puede quedar fuera de la declaración de recopilación, aunque el permiso y su finalidad siempre deben explicarse.

## Prácticas generales

- Sin anuncios ni SDK publicitario.
- Sin venta de datos.
- Sin rastreo entre aplicaciones o sitios.
- Contraseñas almacenadas mediante hash; token de sesión guardado con SecureStore.
- Cifrado en tránsito mediante HTTPS.
- Eliminación disponible dentro de la aplicación y mediante inicio de sesión seguro en la página pública, incluso después de desinstalarla.
- GPS negable sin perder la entrada manual de dirección.
- Sin ubicación en segundo plano, cámara, micrófono ni acelerómetro.

## App Privacy de Apple — versión 1.0

Declarar todos los elementos siguientes como **sin rastreo** y con la finalidad
**funcionalidad de la aplicación**:

| Tipo de Apple | Recopilado | Vinculado a la identidad |
| --- | --- | --- |
| Nombre | Sí | Sí |
| Dirección de correo electrónico | Sí | Sí |
| Número de teléfono | Sí | Sí |
| Dirección física | Sí | Sí |
| Otro contenido del usuario | Sí | Sí |
| ID de usuario | Sí | Sí |
| Historial de compras | Sí | Sí |
| ID del dispositivo | Sí | Sí |
| Otros datos de diagnóstico | Sí | Sí |

`Otro contenido del usuario` cubre la descripción y el motivo de cancelación
de una reserva. `Historial de compras` cubre la solicitud de un servicio físico,
su técnico, fecha, hora, estado, duración y precio final aunque el pago ocurra
fuera de la aplicación. `ID del dispositivo` cubre la dirección IP conservada
en los registros operativos y de seguridad. `Otros datos de diagnóstico` cubre
la ruta solicitada, fecha, agente de usuario y resultado HTTP conservados en
esos mismos registros.

No declarar coordenadas precisas o aproximadas: el GPS se procesa en el
dispositivo y la API no recibe latitud/longitud. Si la persona confirma la
dirección resultante, esa información ya queda cubierta por `Dirección física`.
No declarar historial de búsqueda, fotos o videos, analítica, datos de fallos ni
rendimiento para este build.

## Proveedores y conservación confirmados

- Alojamiento y base de datos: Amazon Lightsail.
- Correo transaccional: Amazon Simple Email Service (SES).
- Registros de acceso de Nginx: incluyen IP y ruta solicitada, rotan diariamente
  y se conservan durante 14 días.
- No hay SDK de publicidad, analítica, seguimiento o reporte de fallos.
- Las copias de seguridad de la base de datos todavía no tienen una eliminación
  automática documentada. Definir y aplicar el plazo antes de solicitar revisión.

## Revisar antes del envío

- Definir y aplicar el plazo de retención de copias de seguridad y cualquier
  obligación legal aplicable.
- Confirmar si se añadieron analítica, crash reporting, pagos, notificaciones push o nuevos sensores.
- Mantener consistentes la ficha, la política pública y el comportamiento de la aplicación.
