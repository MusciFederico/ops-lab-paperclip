# DECISIONS

## Qué elegí y por qué
**Combo B1 + B2 + B3, todo en dry-run**, con un solo "motor" común: agentes del adaptador `process` de Paperclip.
- **B3 Instagram** (OPS-1): draft de caption + hint de formato + las dos llamadas de la Graph API (media container → media_publish) con placeholders.
- **B2 WhatsApp** (OPS-2): template message de la Cloud API listo para aprobar, con regla de opt-in y línea de baja. Es la única con **aprobación humana**, porque es la que contacta personas directamente.
- **B1 Grok Bot** (OPS-3): handoff en forma de brief/instrucción que Grok Bot ejecutaría, con la restricción explícita de no publicar.

Los ejemplos de endpoints Meta usan Graph API `v27.0` (versión vigente consultada al 10/11/2026); antes de activar un envío real hay que volver a verificar la versión y permisos requeridos.

Elegí `process` en vez de un adaptador de LLM para que **cualquiera lo levante sin keys** en 10 minutos y para que el resultado sea determinista. El valor está en la orquestación (roles, review, historial), no en el copy.

Agregué un **Reviewer con reglas de compliance** (claims médicos prohibidos, opt-out, disclaimer, límite de caracteres) porque el contexto es una empresa de dispositivos médicos, donde un claim mal puesto es un riesgo real.

## Qué funcionó (verificado corriendo Paperclip)
- Company "Ops Lab", 2 roles (Operator, Reviewer), 3 tareas, con `seed.mjs` idempotente.
- Heartbeats despiertan a los agentes y las tareas avanzan solas: Operator deja el payload en el hilo → Reviewer aprueba → `done`.
- **Review humano forzado por el runtime** en OPS-2: tras el Reviewer queda `in_review` asignada al usuario humano; intentar `done` sin comentario devolvió **422**, con comentario pasó a `done`.
- Evidencia en el historial de cada tarea y exportada a `web/data/handoffs.json`.

## Qué no funcionó / límites
- **No hay envío real**: no conecté una cuenta de WhatsApp Business ni de Instagram. Todo es dry-run (payloads con placeholders `{TOKEN}`, `{PHONE_NUMBER_ID}`).
- **Grok Bot no está conectado de verdad.** En Paperclip es un agente externo *experimental* que se habilita en Cloud con código de emparejamiento y routine con webhook; no tuve esa cuenta/acceso, así que dejé el handoff como brief. No lo probé.
- **El "copy" es una plantilla**, no generado por un LLM.
- El **loop de "cambios pedidos"** (Reviewer rechaza → Operator corrige) está implementado pero **no lo ejercité de punta a punta**.
- Tropiezos de plataforma que resolví y quedaron documentados en `RESEARCH.md`: Node 24 obligatorio, agentes nacen pausados, `command` vs `args`, `executionPolicy` ignorado en `POST` (solo vale por `PATCH`), URL inyectada sin `/api`.

## Qué haría la semana siguiente
1. Conectar **un** canal real en sandbox: WhatsApp Cloud API con número de prueba (template aprobado en Meta) y enviar a mi propio número tras la aprobación humana.
2. Habilitar el agente externo **Grok Bot** en Cloud y reemplazar el brief por una asignación real con respuesta autenticada.
3. Pasar el Operator a un adaptador de LLM (con presupuesto mensual) para generar variantes de copy, manteniendo al Reviewer determinista como guardarraíl.
4. Probar y testear el loop de cambios pedidos; agregar tests de los builders y del Reviewer.
5. Medir: qué % de drafts pasa el Reviewer a la primera.

## Cómo lo hice
Armé esto con ayuda de Claude (asistente de IA) para investigar y escribir código, y lo fui verificando contra un Paperclip corriendo. Lo entiendo y puedo explicar cada decisión en la defensa.
