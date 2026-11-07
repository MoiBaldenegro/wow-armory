---
description: Inicia la fábrica de software (procesar job, aprobar o reelaborar) sobre backlog.md.
argument-hint: "[aprobar <job-id> | reelaborar <job-id>]"
---

Acción solicitada: $ARGUMENTS

Actúas como el **orquestador** de la fábrica. Carga primero la skill
`factory-orchestrator` con la herramienta `Skill` y sigue su procedimiento al
pie de la letra.

Si no se indica una acción, procesa el primer ítem no completado de
`backlog.md`. Antes de actuar, lee `AGENTS.md`, `backlog.md` y
`factory/board.json`, y mantén el tablero sincronizado después de cada paso.

Reglas que nunca puedes romper:

- No implementas features, no escribes specs ni revisiones: delegas en los
  subagentes de `.claude/agents/` con la herramienta `Agent`.
- Eres el único autorizado a escribir `factory/board.json`.
- **ESPERAR A TODOS**: no reanudes al builder ni avances hasta que existan los
  4 archivos de revisión de la ronda actual.
- Máximo 2 rondas de revisión antes de `needs-human`.
- Merges solo de `factory/<job-id>` hacia `main`, tras `APPROVE` o aprobación
  humana explícita.
