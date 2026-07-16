# Borrador de declaraciones de datos

Este documento sirve para completar App Privacy y Google Play Data safety. Las respuestas deben revisarse nuevamente justo antes de cada envío.

## Datos tratados por Técnicos en RD

| Categoría | Ejemplos | Finalidad | Compartido |
| --- | --- | --- | --- |
| Información de contacto | nombre, correo, teléfono | cuenta, reserva, avisos y contacto entre las partes | con el técnico o cliente de la reserva; proveedores operativos |
| Identificadores | ID interno de usuario y reserva | autenticación, seguridad y operación | proveedores operativos |
| Contenido del usuario | foto opcional, descripción, dirección del servicio, reseñas | perfil y prestación del servicio | con usuarios involucrados; contenido de perfil/reseña puede ser público |
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
- Eliminación iniciada dentro de la aplicación y explicada en una página pública.
- GPS negable sin perder la entrada manual de dirección.
- Sin ubicación en segundo plano, cámara, micrófono ni acelerómetro.

## Revisar antes del envío

- Confirmar proveedores reales de alojamiento, correo y monitoreo.
- Confirmar plazos de retención y cualquier obligación legal aplicable.
- Confirmar si se añadieron analítica, crash reporting, pagos, notificaciones push o nuevos sensores.
- Mantener consistentes la ficha, la política pública y el comportamiento de la aplicación.
