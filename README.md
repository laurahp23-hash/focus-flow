# Focus Flow

Una app web simple de temporizador Pomodoro para gestionar sesiones de enfoque, descansos y tareas.

## Funcionalidades

- Temporizador con tres modos: Enfoque (25 min), Descanso corto (5 min) y Descanso largo (15 min).
- Cambio automático de modo: tras cada 4 sesiones de enfoque se activa un descanso largo.
- Lista de tareas: añade tareas, márcalas como completadas, elimínalas y selecciona una tarea activa para la sesión en curso.
- Contador de "tomates" (🍅) por tarea, que suma uno por cada sesión de enfoque completada mientras esa tarea está activa.
- Racha de días (🔥) que se mantiene mientras completes al menos una sesión de enfoque por día.
- Notificaciones del navegador y aviso sonoro al terminar cada sesión.
- El progreso se guarda automáticamente en `localStorage`, por lo que persiste entre recargas.
- Modo claro/oscuro automático según las preferencias del sistema.

## Uso

Abre `index.html` en tu navegador; no requiere instalación ni servidor.

```bash
open index.html
```

## Estructura

- `index.html` — Marcado de la interfaz.
- `style.css` — Estilos y temas claro/oscuro.
- `script.js` — Lógica del temporizador, tareas, rachas y persistencia.
