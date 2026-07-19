# Operación de moderación — Técnicos en RD

Versión vigente de las reglas comunitarias: `2026-07-18`
Correo público de soporte y apelaciones: `ncerda@hotmail.com`
Objetivo interno de primera revisión: menos de 24 horas

## Alcance

Este procedimiento cubre perfiles profesionales, fotos de perfil y conducta entre usuarios. Las fotos y los perfiles profesionales nuevos no deben hacerse públicos hasta que una persona administradora los apruebe. Los reportes permanecen en la cola hasta que se documente una decisión.

## Revisión diaria

1. Abrir **Administración → Moderación** al menos una vez al día.
2. Atender primero los elementos marcados como vencidos y los reportes de violencia, amenazas, explotación, fraude, privacidad o suplantación.
3. Revisar la información disponible sin copiar datos personales fuera de las herramientas autorizadas.
4. Registrar una nota breve y objetiva. No incluir opiniones, diagnósticos ni datos que no sean necesarios.
5. Elegir una decisión explícita:
   - aprobar o rechazar un perfil o una foto;
   - retirar contenido;
   - registrar una advertencia interna; si se notifica por soporte, documentar también el canal y la fecha;
   - suspender el perfil profesional;
   - resolver sin acción cuando no haya infracción;
   - descartar únicamente reportes duplicados, falsos o sin relación con las reglas.
6. Confirmar que la acción se refleje en el directorio público y que la entrada de auditoría exista.

## Criterios de decisión

Se rechaza o retira contenido que incluya material sexual explícito, explotación de menores, amenazas o violencia, odio o discriminación, acoso, fraude, spam, suplantación, exposición de datos privados, servicios ilegales o imágenes ajenas sin autorización. También se rechaza texto diseñado para evadir los filtros.

Una foto debe representar a la persona o negocio del perfil, ser apropiada para todo público y no mostrar datos sensibles, documentos de identidad, números de pago, direcciones residenciales, menores identificables ni contenido protegido usado sin autorización.

La suspensión se usa cuando existe riesgo para otras personas, fraude, conducta grave o reincidencia. Un error menor corregible puede tratarse con rechazo o advertencia. Las decisiones deben aplicarse de forma consistente sin discriminar por características protegidas.

## Situaciones urgentes

- **Amenaza creíble o peligro inmediato:** conservar solamente la evidencia necesaria, suspender preventivamente el perfil, escalar de inmediato al responsable del servicio y recomendar al reportante contactar a emergencias. La aplicación no sustituye a las autoridades.
- **Posible explotación sexual de menores:** no descargar, reenviar ni duplicar el material. Restringir el acceso, suspender la cuenta y escalar inmediatamente para cumplir las obligaciones de reporte aplicables.
- **Datos privados expuestos:** retirar el contenido, limitar su difusión y evaluar si corresponde una notificación de incidente.
- **Fraude activo o suplantación:** suspender la visibilidad mientras se verifica la identidad y conservar el registro mínimo necesario para investigar.

## Reportes, bloqueo y apelaciones

Reportar y bloquear son acciones separadas. Un bloqueo debe ocultar al proveedor para quien bloquea y evitar nuevas reservas entre ambas cuentas; no se debe retirar automáticamente el historial que la persona necesita para resolver una disputa.

La persona reportante puede consultar el estado del reporte, pero no recibe notas internas, identidad del revisor ni información privada de la cuenta denunciada. Una persona afectada por rechazo, retiro o suspensión puede apelar escribiendo a `ncerda@hotmail.com`. La apelación debe revisarla, cuando sea posible, una persona distinta de quien tomó la primera decisión.

## Privacidad y retención

- No enviar imágenes o detalles de reportes a servicios personales, chats externos ni dispositivos no autorizados.
- Una imagen pendiente puede verse solamente en la cola administrativa. Al aprobarla se conserva la copia pública necesaria; al aprobar o rechazar una entrega, el contenido binario de la entrega de moderación se elimina y queda únicamente el estado, la nota y la auditoría.
- Los respaldos de base de datos se eliminan dentro de 30 días conforme al procedimiento de producción.
- La eliminación de una cuenta borra el perfil y los datos operativos, pero no elimina reportes, decisiones ni la evidencia mínima necesaria para seguridad, apelaciones, fraude o disputas. La cuenta se sustituye por un registro seudónimo y las identidades vinculadas al reporte quedan en instantáneas inmutables sin guardar el correo original.
- Si al eliminarse la cuenta había una suspensión de cuenta o de perfil técnico, se conserva un marcador HMAC seudónimo que impide volver a registrar el mismo correo mientras la medida siga activa. El correo original no se almacena en el marcador. Si una apelación levanta la suspensión del registro seudónimo, la recreación deja de estar restringida.

## Control antes de cada lanzamiento

- Probar consentimiento de reglas con una cuenta nueva y con una cuenta existente.
- Probar reporte y bloqueo por separado desde iOS, Android y web.
- Comprobar que una foto pendiente no sea pública y que aprobación/rechazo elimine su copia de la cola.
- Comprobar que un perfil pendiente, rechazado o suspendido no aparezca en búsquedas ni permita nuevas reservas.
- Verificar el correo de alerta y el correo público de soporte.
- Revisar la cola y cerrar los datos de demostración antes de enviar el binario a las tiendas.
- Confirmar que las declaraciones de privacidad y seguridad de datos coincidan con el binario final.
