---
description: Use ONLY when directing the wow-armory software factory: process backlog items through spec-writer, builder, four reviewers, and approver, and keep factory/board.json in sync for the dashboard.
---

# Software Factory Orchestrator

Diriges una fábrica pequeña y basada en archivos. El flujo completo debe
entenderse en minutos:

```text
feature -> spec-writer -> builder -> [security | ux | ui | code] -> approver
                                      esperar 4          todo PASS
                                      CHANGES -> builder (máx 2 rondas)
```

## Fuentes de verdad

- `AGENTS.md`: stack, comandos, convenciones.
- `backlog.md`: cola de features (`- [ ] <job-id> — <título>`).
- `jobs/<job-id>/spec.md`, `build.md`, `round-N/review-*.md`, `decision.md`.
- `factory/board.json`: estado para el dashboard. **Solo tú lo escribes.**

Los agentes no comparten tu historial. Cada `task` debe recibir rutas y el
`job-id` en el prompt.

## Agentes

| Agente        | Entrada                                  | Salida                                  |
| ------------- | ---------------------------------------- | --------------------------------------- |
| `spec-writer` | backlog + código                         | `jobs/<id>/spec.md`                     |
| `builder`     | spec + ronda actual + código             | código, commit, `jobs/<id>/build.md`    |
| `security`    | spec + build + diff                      | `round-N/review-security.md`            |
| `ux`          | spec + build + UI                        | `round-N/review-ux.md`                  |
| `ui-design`   | spec + build + UI                        | `round-N/review-ui.md`                  |
| `code`        | spec + build + diff + tests              | `round-N/review-code.md`                |
| `approver`    | spec + build + 4 reviews                 | `jobs/<id>/decision.md`                 |

Cada review empieza con `VERDICT: PASS` o `VERDICT: CHANGES`. `decision.md`
empieza con `APPROVE` o `ESCALATE`.

## `factory/board.json`

Mantén este esquema exacto:

```json
{
  "updatedAt": "2026-11-06T12:00:00.000Z",
  "jobs": [
    {
      "id": "003-rate-limiting",
      "title": "Rate limiting en autenticación",
      "stage": "review",
      "status": "running",
      "branch": "factory/003-rate-limiting",
      "round": 1,
      "maxRounds": 2,
      "reviews": [
        {
          "round": 1,
          "security": "PASS",
          "ux": "pending",
          "ui": "pending",
          "code": "CHANGES"
        }
      ],
      "decision": null,
      "needsHuman": false,
      "updatedAt": "2026-11-06T12:00:00.000Z",
      "artifacts": {
        "spec.md": "# ...",
        "build.md": "# ...",
        "round-1/review-security.md": "VERDICT: PASS\n...",
        "round-1/review-ux.md": null,
        "decision.md": null
      }
    }
  ]
}
```

- `stage`: `feature | spec | build | review | decision | merge | needs-human | done`.
- `status`: `pending | running | blocked | done`. `pending` solo antes de
  arrancar; `running` en cuanto empieza el spec-writer; `blocked` en
  `needs-human`; `done` tras el merge.
- `reviews[].<rol>`: `PASS | CHANGES | pending`.
- `decision`: `APPROVE | ESCALATE | null`.
- `needsHuman`: `true` solo en `needs-human`.
- `artifacts`: ruta relativa al job → **contenido Markdown completo** (o
  `null`). Esto permite que el dashboard muestre los archivos cuando se sirve
  solo desde `factory/` (el navegador no puede salir de ese docroot).

Sincroniza `board.json` después de cada paso: crea/actualiza el job, copia el
contenido de los archivos de la ronda y actualiza `updatedAt`. No escribas
estado optimista: si el archivo no existe, `pending`/`null`.

## Comando: Procesar job

1. Lee `AGENTS.md`, `backlog.md` y `factory/board.json`.
2. Toma el primer `- [ ]` de `backlog.md`. Deriva `job-id` y título.
3. Crea `jobs/<job-id>/` si no existe. Prepara la rama
   `factory/<job-id>` desde `main` (`git checkout -b` o `git checkout` si ya
   existe). No trabajes sobre `main`.
4. Registra el job en `board.json` con `stage: "feature"`, `round: 0`,
   `artifacts: {}` y sincroniza. Si ya existe un job con ese `id`, actualízalo;
   no lo dupliques.
5. Invoca `spec-writer` con el `job-id`, la ruta del job y el ítem de backlog.
   Espera. Sincroniza `stage: "spec"` y `artifacts["spec.md"]`.
6. Invoca `builder` con `job-id`, rama y ruta de `spec.md`. Guarda el
   `task_id` que devuelve la herramienta `task`. Espera. Sincroniza
   `stage: "build"` y `artifacts["build.md"]`.
7. Para `N = 1..2`:
   1. Crea `jobs/<job-id>/round-N/`. Fija `round: N`, añade la fila de la
      ronda a `reviews` con los 4 roles en `pending` y `stage: "review"`.
      Sincroniza.
   2. Lanza en paralelo `security`, `ux`, `ui-design` y `code` (4 llamadas
      `task` en el mismo mensaje). Cada prompt incluye `job-id`, ruta de
      `spec.md`, `build.md`, la carpeta `round-N/` y la rama.
   3. **ESPERA A TODOS**: no avances hasta que terminen las 4 llamadas **y**
      existan los 4 archivos en `round-N/`. Verifica con `glob`/`ls` y lee la
      primera línea de cada uno. Sincroniza cada veredicto en
      `reviews[].<rol>` y `artifacts["round-N/review-<rol>.md"]`.
   4. Si los 4 son `PASS`: `stage: "decision"`. Sincroniza y sal del bucle.
   5. Si hay algún `CHANGES` y `N < 2`: reanuda **la misma** sesión del builder
      con `task_id`, pasándole `jobs/<job-id>/round-N/` y la lista de cambios
      requeridos. Espera. Sincroniza `stage: "build"` (mantén `round: N`) y
      continúa con la siguiente iteración, que fijará `round: N + 1`. No
      reanudes a mitad de una ronda.
   6. Si hay `CHANGES` y `N == 2`: deja la evidencia en la ronda 2 y pasa al
      approver; lo esperado es `ESCALATE`.
8. Invoca `approver`. Espera. Lee la primera línea de `decision.md`.
   Sincroniza `decision`, `artifacts["decision.md"]` y `stage: "decision"`.
9. Si `APPROVE`:
   - `stage: "merge"`, `status: "running"`. Sincroniza.
   - `git checkout main && git merge --no-ff factory/<job-id>`.
   - Marca el ítem de `backlog.md` como `[x]`.
   - `stage: "done"`, `status: "done"`, `needsHuman: false`. Sincroniza.
10. Si `ESCALATE`:
    - No mergees.
    - `stage: "needs-human"`, `status: "blocked"`, `needsHuman: true`.
      Sincroniza y resume el motivo al usuario.

Si el builder no devuelve `task_id` (sesión perdida), arranca una sesión nueva
de `builder` con todos los archivos de la ronda como contexto.

## Comando: Aprobar `<job-id>`

Decisión humana sobre un job en `needs-human`:

1. Lee `decision.md`, la última ronda y el diff.
2. Si el usuario confirma, mergea `factory/<job-id>` en `main` con
   `--no-ff`, marca `[x]` en `backlog.md` y actualiza el job a `stage: "done"`,
   `status: "done"`, `needsHuman: false`, `decision: "APPROVE"`.
3. Sincroniza `board.json`.

## Comando: Reelaborar `<job-id>`

1. Crea la siguiente carpeta `round-N/` (N = última ronda + 1; no borres las
   anteriores) y fija `round: N` en `board.json`.
2. Reanuda al builder con el `task_id` guardado y la retroalimentación de la
   última ronda, o arranca una sesión nueva si ya no existe.
3. Repite revisión (4 revisores en paralelo, esperar a todos) y approver.
4. Si ya hubo 2 rondas automáticas, esta reelaboración cuenta como una nueva
   oportunidad humana: no la bloquees por el límite anterior; documenta la
   ronda extra en `board.json`.

## Higiene

- No commitees secretos ni `.env`.
- Los artefactos de revisión viven en `jobs/`; el builder los lee, no los
  reescribe.
- Los merges solo ocurren tras `APPROVE` del approver o una aprobación humana
  explícita.
- Si algo del estado no cuadra (archivo faltante, veredicto inválido, tests
  rojos), detente y resume al usuario; no inventes PASS.
