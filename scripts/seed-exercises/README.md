# Seed de biblioteca de ejercicios

Importa una selección curada de ejercicios desde **free-exercise-db**.

## Fuente y licencia

- Repositorio: https://github.com/yuhonas/free-exercise-db
- Licencia: **The Unlicense** (dominio público). Datos e imágenes de uso libre.
- JSON: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json`
- Imágenes: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/<ruta_de_images>`
  - El campo `images` del JSON trae rutas relativas (ej: `"Bench_Press/0.jpg"`).
  - En esta fase (V1) guardamos `media_url` apuntando a esa URL externa (raw GitHub).
    Migrar las imágenes a Supabase Storage queda para una fase futura.

## Uso

```bash
node scripts/seed-exercises/seed.mjs
```

Genera `scripts/seed-exercises/exercises.seed.sql` con ~100 ejercicios curados.
Ese SQL se aplica a Supabase (vía MCP `apply_migration` o `psql`).

Cada ejercicio queda con `source = 'free_exercise_db'` y `external_id` = id original,
de modo que el admin puede editar / activar / desactivar y se evita duplicar en reimportes
(`ON CONFLICT` por `gym_id, external_id`).

## Mapeo de taxonomía

- `primaryMuscles[0]` → `muscle_group` (enum local)
- `secondaryMuscles` → `secondary_muscle_groups` (enum local, deduplicado)
- `equipment` → `equipment` (enum local)
- `category` → `exercise_type` (strength/powerlifting/strongman/plyometrics → fuerza, cardio → cardio, stretching → estiramiento)
- `instructions` (array) → texto unido
- `images[0]` → `media_url` (URL raw externa)
