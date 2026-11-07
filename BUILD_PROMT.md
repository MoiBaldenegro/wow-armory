Construye una "fábrica de software" simple y visual en este repositorio utilizando un orchestrator skill de OpenCode, subagentes y archivos markdown. Mantén el proyecto pequeño: un observador debe ser capaz de entender todo el flujo en cuestión de minutos. Inspecciona primero el repositorio para que los agentes conozcan su lenguaje, comando de pruebas (test runner) y convenciones de código.

## El Orquestador
La fábrica está dirigida por un agente orquestador principal (o prompt/comando personalizado de sesión). Ejecuta el bucle descrito a continuación, instancia cada subagente y es el único autorizado para escribir en `factory/board.json`.

## El Bucle de Trabajo
               ┌──────────────────┐
               │     feature      │
               └─────────┬────────┘
                         ▼
               ┌──────────────────┐
               │   spec-writer    │
               └─────────┬────────┘
                         ▼
               ┌──────────────────┐
               │     builder      │◄────────────────────┐
               └─────────┬────────┘                     │
    ┌─────────────┬──────┴──────┬─────────────┐         │
    ▼             ▼             ▼             ▼         │
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ │
│ security  │ │    ux     │ │ ui design │ │   code    │ │
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ │
      └─────────────┴──────┬──────┴─────────────┘       │
                           ▼                            │
               ┌──────────────────┐ Cualquier CHANGES:  │
               │ ESPERAR A TODOS  ├─────────────────────┘
               │  4 revisiones    │ reanudar builder
               └─────────┬────────┘ (máx 2 rondas)
                         ▼ Todo PASS
               ┌──────────────────┐
               │     approver     │
               └─┬───────────────┬┘
                 │ APPROVE       │ ESCALATE
                 ▼               ▼
          ┌─────────────┐ ┌─────────────┐
          │ merge a main│ │ needs-human │
          └─────────────┘ └─────────────┘

## Estructura del Sistema de Archivos Target
.opencode/
  agents/
    spec-writer.md
    builder.md
    security.md
    ux.md
    ui-design.md
    code.md
    approver.md
factory/
  board.json          # Estado persistente que alimenta el dashboard
  dashboard.html      # Tablero visual que hace polling a board.json
backlog.md            # Cola de features a procesar por la fábrica
jobs/
  003-rate-limiting/  # Una carpeta por cada tarea
    spec.md
    build.md
    round-1/          # Una carpeta por cada ronda de revisión
      review-security.md # Un archivo por cada revisor
      review-ux.md
      review-ui.md
      review-code.md
    decision.md

## Configuración de Subagentes (.opencode/agents/<nombre>.md)
Usa el formato de frontmatter de OpenCode. Para mantener un modelo unificado en todo el pipeline, omite la propiedad `model` (o defínela globalmente) para que los subagentes hereden el modelo activo de la sesión:

---
description: Descripción de una línea sobre cuándo el orquestador debe invocar este agente.
mode: subagent
---
[Instrucciones de prompt de sistema específicas para el rol del agente...]

## Reglas de Operación
- Los agentes obtienen contexto exclusivamente de los archivos (no del historial de la conversación) y escriben únicamente en el archivo que les corresponde.
- Cada archivo de revisión debe iniciar estrictamente con `VERDICT: PASS` o `VERDICT: CHANGES`. El archivo `decision.md` debe iniciar con `APPROVE` o `ESCALATE`.
- El `builder` implementa y realiza sus commits en una rama separada (`factory/`) y ejecuta pruebas contra los criterios de aceptación del `spec.md`.
- **ESPERAR A TODOS**: Una ronda de revisión se considera terminada únicamente cuando existe el archivo de cada uno de los 4 revisores en la carpeta de la ronda. Nunca reanudes el `builder` a mitad de una ronda.
- Instancia el `builder` y reanuda esa misma sesión de subagente para cada nueva ronda, pasándole como referencia la carpeta de la ronda actual.

## Flujo de Trabajo / Comandos del Orquestador
- **Procesar Job**: Toma el primer ítem no completado en `backlog.md` y ejecútalo a través del bucle: spec-writer -> builder -> reviewers -> approver.
- **Aprobar**: Realiza el merge a la rama `main` de las tareas en estado `needs-human`.
- **Reelaborar**: Envía la tarea de vuelta al `builder` adjuntando la retroalimentación de la revisión.

## Dashboard
Un archivo HTML autocontenido servido mediante `python3 -m http.server` desde la carpeta `factory/`. Las tareas se muestran como tarjetas que avanzan a lo largo de las etapas del bucle. Cada ronda de revisión se visualiza como una fila de chips por revisor que cambian según sus dictámenes. Las tareas en `needs-human` deben destacar visualmente. Al hacer clic en una tarjeta, se muestran sus archivos markdown correspondientes. Diseño limpio y minimalista.