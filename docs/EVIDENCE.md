# Evidencia de la corrida

Corrida real contra Paperclip v2026.1106.0 (Node 24.22, modo `local_trusted`).

## Estado final de las tareas
| Tarea | Canal | Stages | Resultado |
|---|---|---|---|
| OPS-1 | instagram | review | done |
| OPS-2 | whatsapp | review → approval (humano) | done tras aprobación humana |
| OPS-3 | grok-bot | review | done |

## Flujo observado (OPS-2)
1. `todo` → Operator hace checkout → publica comentario con el payload dry-run (JSON).
2. Operator pasa a `done` → el runtime lo **rutea al Reviewer** (stage `review`).
3. Reviewer aprueba con comentario → el runtime lo rutea al **usuario humano** (stage `approval`): estado `in_review`, asignado a `local-board`.
4. `PATCH status=done` sin comentario → **HTTP 422**: *"Approving a review or approval stage requires a comment…"*.
5. `PATCH status=done` con comentario de decisión → **HTTP 200**, `executionState.status = completed`.

## Dónde mirar
- UI de Paperclip: Ops Lab → Issues → abrir OPS-1/2/3 (hilo completo).
- `web/data/handoffs.json`: export del historial (comentarios + payloads).
- `handoff/out/OPS-*.json`: copia local de cada payload.

## Nota
Todos los payloads tienen `dry_run: true`. No se envió ningún mensaje ni publicación.
