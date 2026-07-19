# Borrador de declaraciones de datos

Este documento sirve para completar App Privacy y Google Play Data safety. Las respuestas deben revisarse nuevamente justo antes de cada envío.

## Datos tratados por Técnicos en RD

| Categoría | Ejemplos | Finalidad | Compartido |
| --- | --- | --- | --- |
| Información de contacto | nombre, correo, teléfono | cuenta, reserva, avisos y contacto entre las partes | con el técnico o cliente de la reserva; proveedores operativos |
| Identificadores | ID interno de usuario y reserva | autenticación, seguridad y operación | proveedores operativos |
| Contenido del usuario | foto opcional, descripción, dirección del servicio y calificaciones estructuradas | perfil y prestación del servicio | la foto profesional puede mostrarse en el directorio; los detalles de reserva se limitan a las partes; las calificaciones se muestran de forma agregada |
| Ubicación aproximada | centro redondeado y radio de la zona de servicio que un técnico decide publicar | mostrar cobertura y permitir búsquedas en el mapa | públicamente en el perfil del técnico; proveedores operativos |
| Actividad de la aplicación | historial/estado de reservas, disponibilidad, puntos, logros y canjes | ofrecer y administrar las funciones solicitadas | proveedores operativos |
| Diagnóstico/seguridad | IP y registros básicos del servidor | seguridad, prevención de abuso y disponibilidad | proveedor de alojamiento |
| Seguridad de la comunidad | reportes, motivo, detalles opcionales, bloqueos y estado/resolución | moderación, prevención de abuso, soporte y apelaciones | proveedores operativos; autoridades cuando la ley lo requiera |
| Consentimiento y auditoría | versión de normas, fecha, IP/agente de usuario, decisiones y notas administrativas | demostrar consentimiento, aplicar reglas y documentar decisiones | proveedores operativos |
| Telemetría de Google Maps en Android | metadatos de solicitud y dispositivo, IP, identificador seudónimo del SDK, trazas/métricas de fallos e interacciones opcionales con el mapa | prestar, proteger, mantener y mejorar el servicio de mapas y su estabilidad | Google |

## Ubicación

Para clientes, el permiso de GPS es opcional, explícito y solo en primer plano. Las coordenadas se utilizan después de pulsar “Usar mi ubicación” para obtener una zona/dirección y no se envían como latitud/longitud a la API de Técnicos en RD. En Android, `expo-location` utiliza los servicios de ubicación del dispositivo y `android.location.Geocoder`; la documentación de Android advierte que la geocodificación inversa puede consultar la red. Por eso, para Google Play se adopta la declaración conservadora de ubicación aproximada y precisa recopilada opcionalmente para funcionalidad/personalización, sin afirmar que Técnicos en RD la conserva. Si el usuario confirma una reserva, la dirección resultante sí se almacena como contenido de la reserva.

Los técnicos pueden elegir una zona aproximada para que los clientes encuentren su perfil en el mapa. La aplicación redondea el centro, guarda un radio de cobertura y muestra que se trata de una ubicación aproximada. Nunca debe publicarse una dirección residencial o la dirección de una reserva. Esta ubicación se vincula al perfil del técnico, se usa exclusivamente para la funcionalidad de la aplicación y no se usa para rastreo.

Antes de cada envío, vuelve a confirmar la definición y la guía del proveedor de cada tienda. La API propia no recibe coordenadas GPS del cliente, pero la geocodificación del dispositivo puede transmitirlas fuera del dispositivo. No marcar el tratamiento como efímero en Google Play mientras el proveedor no confirme que no conserva datos después de resolver la solicitud.

## Prácticas generales

- Sin anuncios ni SDK publicitario.
- Sin venta de datos.
- Sin rastreo entre aplicaciones o sitios.
- Sin producto de analítica propio ni perfilado de usuarios. Google Maps SDK para Android sí recopila telemetría técnica limitada y eventos de interacción del mapa para mantener y mejorar sus servicios.
- Contraseñas almacenadas mediante hash; token de sesión guardado con SecureStore.
- Cifrado en tránsito mediante HTTPS.
- Eliminación disponible dentro de la aplicación y mediante inicio de sesión seguro en la página pública, incluso después de desinstalarla.
- GPS negable sin perder la entrada manual de dirección.
- La foto de perfil se elige de forma voluntaria mediante la biblioteca del sistema.
- Perfiles profesionales y fotos candidatas se revisan antes de publicarse. La foto aprobada anterior se mantiene mientras una nueva está pendiente.
- Reportar y Bloquear son acciones separadas; el usuario puede consultar reportes y administrar/deshacer bloqueos desde Cuenta.
- La identidad de quien reporta no se muestra al usuario reportado. Los administradores ven únicamente lo necesario para investigar y documentar el caso.
- Sin ubicación en segundo plano, cámara, micrófono ni acelerómetro.

## Contenido generado por usuarios — controles implementados

La foto profesional aprobada puede mostrarse públicamente en el directorio. Aunque las reseñas móviles se limitan a estrellas y frases predefinidas, las fotos, perfiles, reservas y detalles opcionales de reportes constituyen contenido generado por usuarios. Mantener `apple.advisory.userGeneratedContent` en `true` y responder de forma coherente en Google Play.

La app exige consentimiento explícito y versionado, filtra texto público, mantiene perfiles/fotos fuera del directorio hasta aprobación, permite reportar y bloquear por separado, ofrece seguimiento y desbloqueo, y presenta a administradores una cola con antigüedad/SLA, notas requeridas y medidas de resolución. Antes del envío público se debe desplegar y probar la API/migración, confirmar que `ncerda@hotmail.com` está monitoreado y asignar cobertura operativa diaria a la cola.

## Google Play Data safety — Android 1.0

Respuestas globales recomendadas para el binario que incluye Google Maps SDK:

- **¿Recopila o comparte datos?** Sí.
- **¿Comparte datos?** Sí, por la telemetría técnica que Google Maps SDK transmite a Google. No contar Amazon Lightsail/SES como “compartido” porque operan como proveedores del servicio, ni el contacto con el técnico seleccionado cuando aplica la excepción de transferencia iniciada por el usuario.
- **¿Todos los datos están cifrados en tránsito?** Sí; la aplicación usa HTTPS para la API. Confirmar nuevamente el comportamiento de todos los SDK del AAB final antes de enviar.
- **¿Existe un mecanismo de eliminación?** Sí, dentro de Cuenta y en `https://api.tecnicosenrd.com/account-deletion`.
- **¿Permite crear cuenta?** Sí, directamente dentro de la aplicación.

La columna “Opcional” se apoya en que el directorio, el mapa y los perfiles se pueden explorar sin cuenta. La dirección y el teléfono son necesarios para completar una reserva, pero la reserva es una acción voluntaria. “No efímero” es la respuesta conservadora cuando no se controla ni se conoce la retención del proveedor de mapas/geocodificación.

| Tipo de Google Play | Recopilado | Compartido | Efímero | Opcional / requerido | Finalidad de recopilación | Finalidad al compartir |
| --- | --- | --- | --- | --- | --- | --- |
| Ubicación aproximada | Sí | No | No | Opcional | Funcionalidad; personalización | — |
| Ubicación precisa | Sí | No | No | Opcional | Funcionalidad; personalización | — |
| Nombre | Sí | No | No | Opcional | Funcionalidad; administración de cuenta | — |
| Correo electrónico | Sí | No | No | Opcional | Funcionalidad; administración de cuenta | — |
| ID de usuario | Sí | No | No | Opcional | Funcionalidad; administración de cuenta; seguridad y prevención de fraude | — |
| Dirección | Sí | No | No | Opcional | Funcionalidad | — |
| Teléfono | Sí | No | No | Opcional | Funcionalidad; administración de cuenta | — |
| Historial de compras | Sí | No | No | Opcional | Funcionalidad | — |
| Interacciones con la aplicación | Sí | Sí | No | Requerido | Analítica; seguridad y prevención de fraude | Analítica |
| Otro contenido generado por el usuario | Sí | No | No | Opcional | Funcionalidad; seguridad y prevención de fraude | — |
| Fotos | Sí | No | No | Opcional | Funcionalidad; administración de cuenta | — |
| Registros de fallos | Sí | Sí | No | Requerido | Analítica | Analítica |
| Diagnóstico | Sí | Sí | No | Requerido | Analítica; seguridad y prevención de fraude | Analítica |
| ID de dispositivo u otros ID | Sí | Sí | No | Requerido | Analítica; seguridad y prevención de fraude | Analítica |

`Historial de compras` cubre la solicitud/transacción de un servicio físico, su técnico, fecha, hora, estado, duración y precio final aunque no haya pago dentro de la aplicación. `Otro contenido generado por el usuario` cubre la descripción, el motivo de cancelación, la frase de experiencia predefinida y los detalles opcionales de un reporte. `Fotos` cubre la imagen de perfil opcional y su entrega temporal para moderación. `Interacciones`, `Registros de fallos`, `Diagnóstico` e `ID de dispositivo u otros ID` incluyen la telemetría declarada por Google Maps SDK; las interacciones, consentimientos, bloqueos y registros administrativos propios también se usan para seguridad y disponibilidad.

No seleccionar historial de búsqueda: la búsqueda y los filtros del directorio se procesan localmente y no se envían a la API. No seleccionar videos, mensajes, contactos, archivos, calendario, audio, salud, aplicaciones instaladas, navegación web ni información de pago. La app solo acepta una foto estática de perfil; no abre cámara ni micrófono.

## App Privacy de Apple — versión 1.0

Declarar todos los elementos siguientes como **sin rastreo** y con la finalidad
**funcionalidad de la aplicación**:

| Tipo de Apple | Recopilado | Vinculado a la identidad |
| --- | --- | --- |
| Nombre | Sí | Sí |
| Dirección de correo electrónico | Sí | Sí |
| Número de teléfono | Sí | Sí |
| Dirección física | Sí | Sí |
| Ubicación aproximada | Sí | Sí |
| Otro contenido del usuario | Sí | Sí |
| Fotos o videos | Sí | Sí |
| ID de usuario | Sí | Sí |
| Historial de compras | Sí | Sí |
| ID del dispositivo | Sí | Sí |
| Otros datos de diagnóstico | Sí | Sí |

`Otro contenido del usuario` cubre la descripción, el motivo de cancelación,
la frase controlada elegida al calificar y los detalles opcionales de reportes.
`Fotos o videos` cubre la foto de perfil opcional y su entrega temporal para moderación.
`Historial de compras` cubre la solicitud de un servicio físico,
su técnico, fecha, hora, estado, duración y precio final aunque el pago ocurra
fuera de la aplicación. `ID del dispositivo` cubre la dirección IP conservada
en los registros operativos y de seguridad. `Otros datos de diagnóstico` cubre
la ruta solicitada, fecha, agente de usuario y resultado HTTP conservados en
esos mismos registros.

Declarar `Ubicación aproximada` para la zona de servicio que un técnico decide
publicar. Se vincula a la identidad, se usa para funcionalidad de la aplicación,
se muestra públicamente con un radio aproximado y no se usa para rastreo. Para
Apple, volver a confirmar la guía de MapKit y geocodificación antes de mantener
la respuesta de que la ubicación precisa no se recopila: la API propia no recibe
las coordenadas del cliente, pero el servicio del sistema puede tratarlas. Si la
persona confirma la dirección resultante, esa información queda cubierta por
`Dirección física`. La telemetría de Google Maps descrita arriba corresponde al
cliente Android; no trasladarla automáticamente a la declaración de iOS.

## Proveedores y conservación confirmados

- Alojamiento y base de datos: Amazon Lightsail.
- Correo transaccional: Amazon Simple Email Service (SES).
- Mapa en Android: Google Maps SDK. Según la declaración vigente del proveedor,
  recopila automáticamente metadatos de solicitud/dispositivo, dirección IP,
  identificador seudónimo del SDK y métricas/trazas de fallos; según el uso,
  también recopila desplazamientos y cambios de zoom para mejorar sus servicios.
- Registros de acceso de Nginx: incluyen IP y ruta solicitada, rotan diariamente
  y se conservan durante 14 días.
- No hay SDK publicitario, de seguimiento entre aplicaciones ni de analítica
  propio. La telemetría operativa de Google Maps incluye analítica técnica y
  reporte de fallos limitado al SDK.
- Las copias de seguridad automáticas de la base de datos se eliminan dentro de
  30 días mediante el flujo de despliegue y una tarea diaria de retención.
- Las fotos candidatas rechazadas o reemplazadas se limpian del almacenamiento temporal. Al aprobar una foto, se conserva la copia pública necesaria y se limpia el payload de la entrega; se mantienen metadatos mínimos de revisión y auditoría.
- Los consentimientos, reportes, bloqueos y decisiones se conservan mientras sean necesarios para seguridad, prevención de reincidencia, apelaciones y obligaciones legales.

## Revisar antes del envío

- Confirmar que la tarea diaria de retención de copias de seguridad continúa
  activa en producción y revisar cualquier obligación legal aplicable.
- Revisar nuevamente la declaración de datos de Google Maps SDK para la versión
  exacta incluida en el AAB y confirmar cifrado/retención del proveedor.
- Confirmar si se añadieron otros productos de analítica, crash reporting, pagos, notificaciones push o nuevos sensores.
- Confirmar que la API/migración de moderación está desplegada, la cola cumple el SLA operativo y el correo de apelaciones está monitoreado antes de solicitar revisión pública.
- Mantener consistentes la ficha, la política pública y el comportamiento de la aplicación.
