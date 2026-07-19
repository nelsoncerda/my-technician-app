# Paridad web, iOS y Android

iOS y Android comparten la misma aplicación Expo en `mobile/src`. Una función añadida allí debe comportarse igual en ambas plataformas; las diferencias se limitan a APIs nativas como mapas, permisos y almacenamiento seguro.

## Matriz funcional

| Área | Web | iOS | Android |
| --- | --- | --- | --- |
| Directorio, autocompletado, filtros y rating | Sí | Sí | Sí |
| Lista/mapa de zonas aproximadas | Sí | Sí | Sí |
| GPS opcional para zona/dirección | — | Sí | Sí |
| Perfil del técnico y reserva | Sí | Sí | Sí |
| Registro como cliente o profesional | Sí | Sí | Sí |
| Conversión de cliente a profesional | Sí | Sí | Sí |
| Verificación y recuperación de contraseña | Sí | Sí | Sí |
| Reservas contratadas y solicitudes recibidas | Sí | Sí | Sí |
| Confirmar, iniciar, completar y cancelar | Sí | Sí | Sí |
| Calificación después de servicio completado | Sí | Sí | Sí |
| Editar perfil, foto e historial | Sí | Sí | Sí |
| Servicios, zona y visibilidad del mapa | Sí | Sí | Sí |
| Disponibilidad semanal | Sí | Sí | Sí |
| Puntos, logros, ranking y recompensas | Sí | Sí | Sí |
| Administración de técnicos y usuarios | Sí | Sí | Sí |
| Reservas y reportes administrativos | Sí | Sí | Sí |
| Consentimiento de normas de la comunidad | Sí | Sí | Sí |
| Reportar perfiles, fotos y conducta | Sí | Sí | Sí |
| Bloquear/desbloquear usuarios | Sí | Sí | Sí |
| Seguimiento de reportes propios | Sí | Sí | Sí |
| Moderación previa de perfiles y fotos | Sí | Sí | Sí |
| Cola administrativa, SLA y resoluciones | Sí | Sí | Sí |
| Catálogo de servicios y ubicaciones | Sí | Sí | Sí |
| Cómo funciona, privacidad, términos y soporte | Sí | Sí | Sí |
| Eliminación permanente de cuenta | Sí | Sí | Sí |

## Diferencias deliberadas

- El restablecimiento de contraseña termina en la página segura alojada por la API, abierta desde el enlace del correo. No duplica el formulario sensible dentro de cada cliente.
- La web usa OpenStreetMap/Leaflet; iOS y Android usan el proveedor nativo configurado para cada plataforma. Todos muestran únicamente zonas aproximadas.
- Web, iOS y Android usan la misma reseña estructurada: estrellas y frases controladas, sin publicar texto libre. Los perfiles muestran el agregado de calificaciones con el mismo contrato de API.
- La foto se elige desde la biblioteca. Las apps no solicitan cámara ni micrófono.
- No se solicita ubicación en segundo plano, movimiento ni acelerómetro. Esos permisos solo se añadirán cuando exista una función aprobada que realmente los necesite.

## Regla para cambios futuros

Antes de publicar una función nueva:

1. Añadirla a esta matriz y definir si aplica a los tres clientes.
2. Reutilizar el mismo contrato de API y los mismos permisos por rol.
3. Probar cliente, técnico y administrador en iOS y Android.
4. Actualizar metadatos, declaraciones de datos y notas de revisión si cambia el tratamiento de datos o permisos.
5. Generar builds nativos nuevos cuando cambien dependencias, permisos o configuración nativa.
