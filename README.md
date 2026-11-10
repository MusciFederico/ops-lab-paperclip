# Ops Lab — Paperclip multi-agent workflow

> **¿Primera vez?** Seguí [`EMPEZA_AQUI.md`](EMPEZA_AQUI.md): tiene el paso a paso para Windows, desde PowerShell hasta GitHub, Vercel, Loom y entrega en TIM.

Demo individual de una compañía mínima de agentes para operaciones de Growth en una empresa de dispositivos médicos.

**Qué demuestra:** Paperclip coordina tareas; Operator prepara un handoff; Reviewer aplica reglas deterministas de compliance; y la tarea de WhatsApp agrega una aprobación humana antes de considerarse finalizada.

**Alcance real de esta entrega:** los tres canales están implementados como *dry-run*. Se generan payloads y contratos de salida para Instagram, WhatsApp y Grok Bot, pero **no se publican posts ni se envían mensajes** y Grok Bot no está autenticado/conectado a una cuenta real. No hay credenciales ni tokens dentro del repositorio.

## Entregables

- `RESEARCH.md`: investigación de Paperclip, arquitectura y límites.
- `DECISIONS.md`: decisiones técnicas, resultados y próximos pasos.
- `agent/`: agentes Operator y Reviewer para el adaptador `process`.
- `handoff/builders.mjs`: builders de payloads para los tres canales.
- `scripts/seed.mjs`: crea la compañía, dos agentes y tres tareas.
- `scripts/export.mjs`: exporta el historial de Paperclip al dashboard.
- `tests/`: pruebas automáticas de los builders y reglas básicas.
- `web/`: dashboard estático que se puede publicar en Vercel.

## Requisitos

- Windows 10/11, macOS o Linux.
- **Node.js 24.11.0 o superior** para Paperclip. Verificá con `node --version`.
- Git, solamente para publicar el repositorio en GitHub.
- No requiere API keys para ejecutar el flujo local en modo `local_trusted`.

Paperclip requiere Node 24.11+; con Node 22 el instalador puede advertir o fallar. Instalador oficial: <https://nodejs.org/en/download>.

## Ejecutar en Windows (PowerShell)

### 1. Extraer y abrir el proyecto

Extraé `ops-lab-paperclip.zip`. Abrí la carpeta `ops-lab-paperclip` y abrí una terminal PowerShell dentro de esa carpeta.

```powershell
node --version
npm --version
```

Si `node --version` muestra una versión menor que `v24.11.0`, instalá Node.js 24 LTS desde el enlace anterior, cerrá todas las terminales y abrí una nueva.

### 2. Ejecutar las pruebas locales

Desde la carpeta raíz del proyecto:

```powershell
npm test
```

Esto valida los builders sin conectarse a servicios externos.

### 3. Iniciar Paperclip — Terminal 1

```powershell
npx paperclipai onboard --yes
```

Esperá a que termine el onboarding y abrí <http://localhost:3100>. Dejá esta terminal abierta: mantiene Paperclip en ejecución. Ejecutalo como usuario normal, no como administrador.

### 4. Crear la compañía y las tareas — Terminal 2

Abrí otra terminal PowerShell en la misma carpeta del proyecto y ejecutá:

```powershell
node scripts/seed.mjs
```

En Paperclip, seleccioná **Ops Lab → Issues**. El proyecto crea dos agentes:

- **Operator:** arma el payload en modo dry-run.
- **Reviewer:** revisa claims médicos prohibidos y reglas específicas del canal.

Y tres tareas:

| ID | Canal | Flujo esperado |
|---|---|---|
| OPS-1 | Instagram | Operator → Reviewer → done |
| OPS-2 | WhatsApp | Operator → Reviewer → aprobación humana → done |
| OPS-3 | Grok Bot | Operator → Reviewer → done |

Los heartbeats están configurados cada 15 segundos. La primera ejecución puede tardar alrededor de un minuto. Si no avanzan, revisá que ambos agentes estén `ready` y con heartbeat activo.

### 5. Aprobar la tarea humana de WhatsApp

Abrí **OPS-2** en Paperclip cuando Reviewer termine. La tarea debe quedar esperando la etapa `approval` humana. Aprobala desde la UI agregando un comentario de decisión; el runtime exige ese comentario para completar la aprobación.

### 6. Exportar y visualizar la evidencia

En Terminal 2:

```powershell
node scripts/export.mjs
```

Para visualizar el dashboard local, podés usar:

```powershell
npx --yes serve web
```

Abrí la URL local que muestre el comando. El dashboard consume `web/data/handoffs.json`.

## Publicar el repositorio en GitHub

1. Creá un repositorio vacío en GitHub llamado `ops-lab-paperclip` (sin README, sin licencia y sin `.gitignore`).
2. Desde PowerShell, dentro de esta carpeta, ejecutá:

```powershell
git init -b main
git add .
git commit -m "Initial commit: Ops Lab Paperclip challenge"
git remote add origin https://github.com/TU-USUARIO/ops-lab-paperclip.git
git push -u origin main
```

Reemplazá `TU-USUARIO` por tu usuario de GitHub. Estos comandos inicializan el proyecto con tu propia identidad de Git y publican la rama `main`.

## Publicar el dashboard en Vercel

1. Entrá a <https://vercel.com/new> e importá el repositorio de GitHub.
2. En **Root Directory**, elegí `web`.
3. Elegí **Other** como framework si Vercel no lo detecta automáticamente.
4. No hace falta build command ni install command. El dashboard es HTML/CSS/JS estático y `web/data/handoffs.json` debe quedar incluido.
5. Hacé clic en **Deploy** y guardá la URL resultante.

## Video demo (máximo 2 minutos y medio)

Mostrá la ejecución real, no solo el código:

1. (20 s) Presentá Ops Lab y el flujo Operator → Reviewer → humano.
2. (35 s) Mostrá OPS-1 y OPS-3 con sus handoffs aprobados.
3. (50 s) Abrí OPS-2: payload de WhatsApp, comentario del Reviewer y aprobación humana.
4. (25 s) Mostrá el dashboard desplegado con los tres payloads e historial.
5. (15 s) Aclaración explícita: es dry-run; no se mandaron mensajes ni publicaciones y Grok Bot no quedó autenticado.

No afirmes que hubo envíos o integraciones reales cuando no los hubo.

## Comandos de referencia

```powershell
npm test
node scripts/seed.mjs
node scripts/export.mjs
```

## Estructura

```text
agent/                 Operator, Reviewer y cliente API compartido
handoff/builders.mjs   payloads dry-run de Instagram, WhatsApp y Grok Bot
handoff/out/           copias locales de los payloads generados
scripts/               seed y export del historial
 tests/                pruebas automáticas de los builders
web/                   dashboard estático y datos exportados
RESEARCH.md            investigación de Paperclip
DECISIONS.md           decisiones, evidencia y límites
```
