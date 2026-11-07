---
description: Inicia la fábrica de software (procesar job, aprobar o reelaborar) sobre backlog.md.
agent: orchestrator
---

$ARGUMENTS

Si no se indica una acción, procesa el primer ítem no completado de
`backlog.md` siguiendo la skill `factory-orchestrator`. Antes de actuar, lee
`AGENTS.md`, `backlog.md` y `factory/board.json`, y mantén el tablero
sincronizado después de cada paso.
