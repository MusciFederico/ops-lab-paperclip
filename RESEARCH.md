# Research: Paperclip (Parte 1)

*Basado en el repo `paperclipai/paperclip` (MIT, v2026.1106.0), su carpeta `docs/` y `doc/`, y en haberlo levantado y operado de verdad para este desafío.*

## 1. Qué es y qué no es
**Es** una app (server Node + UI web) para **orquestar agentes de IA como si fueran una empresa**: organigrama, tareas, presupuestos, aprobaciones y un historial auditable. Es open source y self-hosted.
**No es** un modelo ni un agente: no "piensa" por sí solo. Es el sistema de control que despierta a agentes externos (CLIs como Claude/Codex/Grok, un script, un webhook) y registra lo que hacen. Tampoco es una herramienta de publicación: no postea en redes ni manda WhatsApp; eso lo hacen las "manos" que le conectás.

## 2. Cómo se organiza el trabajo
- **Company** → agentes con **rol**, título y jefe (`reportsTo`).
- **Tasks (issues)** con prefijo propio (OPS-1), estado, asignado y **hilo de comentarios**: es el historial y la evidencia.
- **Heartbeats**: cada agente se despierta cada N segundos (o por asignación), toma su bandeja, hace *checkout* de una tarea y la actualiza. Sin heartbeat no pasa nada.
- **Execution policy**: por tarea se definen *stages* ordenados de `review` y `approval`, con participantes que pueden ser **agentes o usuarios humanos**. El runtime lo fuerza: el ejecutor no puede marcar `done` directo, la tarea se rutea al revisor, y aprobar exige un comentario de decisión en el mismo request (si no, responde 422; lo comprobé).
- **Budgets**: topes mensuales por empresa/agente con auto-pausa por costo.
- **Adaptadores**: `claude-local`, `codex-local`, `grok-local`, `hermes`, `openclaw-gateway`, etc., más dos genéricos: `process` (ejecuta un comando) y `http` (llama un webhook).

## 3. Dónde corre, keys y datos
- Corre **en tu máquina**: `npx paperclipai onboard --yes` levanta server + UI en `127.0.0.1:3100` con **Postgres embebido** y modo `local_trusted` (sin login).
- **Requiere Node ≥ 24.11** (con Node 22 el `doctor` bloquea).
- **Keys**: Paperclip en sí no pide ninguna. Las pide cada adaptador de LLM (su CLI/cuenta). El adaptador `process` no necesita ninguna: por eso este proyecto es reproducible sin credenciales.
- **Queda local**: tareas, comentarios, estados, aprobaciones. **Sale a un provider**: lo que el agente le mande a su modelo; y a las redes/WhatsApp, lo que la herramienta de salida publique. Los logs muestran además un exportador de **telemetría** activo por defecto.

## 4. Limitaciones que encontré
- **Setup con aristas**: Node 24 obligatorio; los agentes nacen **pausados y con heartbeat desactivado**; pasan por un estado `verifying` y si el comando no resuelve quedan trabados.
- **API con comportamientos sutiles**: `POST /issues` **ignora** `executionPolicy` (hay que usar `PATCH`); `command` del adaptador `process` es solo el ejecutable y los argumentos van en `args`; la URL inyectada al agente puede venir sin `/api`.
- **Madurez**: versión por fecha, mucho cambio rápido, partes marcadas *experimental* (Grok Bot, MCP, Runner), docs que no siempre coinciden con el comportamiento.
- **Integración externa difícil**: Paperclip coordina pero **no trae conectores** de WhatsApp/Instagram. Grok Bot se conecta como agente externo en Cloud (experimental) con código de emparejamiento, y sus plugins son a nivel cuenta, no por bot.
- **Gap de gobernanza real**: no hay reglas de compliance (p. ej. claims médicos) listas; hay que construirlas como un agente revisor, como hace este repo.
