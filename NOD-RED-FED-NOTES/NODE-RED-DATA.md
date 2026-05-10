## R10-02A.0 — Pre-paso 0 ejecutado, esperando OK del PO antes de mutar

### Hallazgos del descubrimiento remoto (sin mutaciones)

| Campo | Valor verificado en `92.243.24.163` | ¿Coincide con plan/RUNBOOK? |
|---|---|---|
| Host | `escrivivirco-scriptorium-pub-oasis` (Debian 13, kernel 6.12.38) | sí |
| Compose path real | `/opt/aleph-scriptorium/ScriptoriumVps/PATTERN-DOCKER/docker-compose.yml` | sí, coincide con repo local |
| Compose project | `scriptorium-vps` | sí |
| UID/GID proceso Node-RED dentro del contenedor | `uid=1000(node-red) gid=1000(node-red)` | sí, `1000:1000` esperado |
| data interno (perms) | `1000:1000 775` | consistente |
| Volumen Gandi | `/dev/xvdb` ext4 → `/srv/oasis`, **40 G total, 37 G libres**, 350 M usados | sí |
| Precedente persistente | `/srv/oasis/scriptorium/verdaccio/storage` con `10001:65533 755` (proceso verdaccio interno); el padre `verdaccio/` es `1000:1000 755` | sí, patrón verificado |
| `/srv/oasis/scriptorium/` ya creado | `ARCHIVO/`, `caddy/`, `node-red/` (¡ya existe vacío!), `verdaccio/` — dueño `debian:debian 755` | ⚠️ ver D1 |
| `/srv/oasis/scriptorium/backups/` | no existe | esperado, hay que crearlo |
| Tamaño data interno | **1.3 G**, 28 750 entradas (mayoría node_modules) | nuevo dato útil para backup |
| Mounts actuales del contenedor (literal) | `/srv/oasis/scriptorium/ARCHIVO → /data/ARCHIVO` (rw), `/srv/oasis/scriptorium/ARCHIVO/DISCO → /data/ARCHIVO/DISCO` (rw), `/opt/aleph-scriptorium/ScriptoriumVps/node-red-projects → /data/projects` (rw), `/opt/aleph-scriptorium/ScriptoriumVps/PATTERN-DOCKER/nodered → /opt/aleph/node-red-pattern` (ro). **No hay bind para data raíz** | confirma deuda heredada |

Contenido vivo de data (sobrevive al restart del contenedor pero no a recreación): `flows.json`, `flows.json.pre-rooms-20260509T140227`, package.json, package-lock.json, node_modules (369 paquetes), `settings.js`, `lib/`, `.config.*.json`, `.npm/`, además de `projects/` y `ARCHIVO/` que ya son bind mounts.

### Discrepancias con el plan registrado — pido decisión PO antes de A.0

**D1. Nomenclatura del directorio host.** El plan TASK-10 dice `/srv/oasis/scriptorium/nodered/data`. En el host **ya existe** `/srv/oasis/scriptorium/node-red/` (con guion, vacío, `debian:debian 755`), creado por el bootstrap inicial. Tres opciones:

- **D1a (recomendada por mí):** alinear el plan al directorio existente → bind `/srv/oasis/scriptorium/node-red/data:/data`. Coherente con lo ya provisionado, sin tocar la decisión del bootstrap.
- D1b: borrar el directorio vacío `/srv/oasis/scriptorium/node-red/` y crear `nodered/` para alinear con el nombre del servicio compose. Cosmético, sin valor operativo.
- D1c: mantener literal el plan y dejar `node-red/` huérfano (peor: dos paths similares conviviendo).

**D2. Subrutas ya bindeadas dentro de data.** El backup `docker cp /data` capturará también `/data/ARCHIVO` y `/data/projects`, que **ya** son bind mounts a sus rutas reales. Si lo replicamos tal cual al nuevo bind con `cp -aT` (como dice el plan), duplicamos ese contenido bajo el nuevo árbol y, al subir el contenedor, los hijos volverán a montarse encima ocultando esa copia muerta (ocupa espacio, induce confusión). Propuesta:

- **D2a (recomendada):** backup completo igual (snapshot íntegro a backups), pero al **rellenar el bind destino** usar `rsync -aHAX --delete` con `--exclude=/ARCHIVO --exclude=/projects` para no dejar copias fantasma bajo los puntos de mount hijos. Los directorios vacíos `ARCHIVO/` y `projects/` se crearán antes en el destino con perms `1000:1000` para que los binds hijos puedan superponerse al arrancar.

**D3. Edición del compose.** El compose real es exactamente el del repo. Edición mínima propuesta sobre el servicio `nodered`: añadir una línea `- /srv/oasis/scriptorium/node-red/data:/data` en `volumes:`, sin tocar nada más. Antes de aplicar, copia con timestamp del compose y `docker compose config` para validar.

**D4. Backup destino.** El plan lo coloca en `/srv/oasis/scriptorium/backups/nodered-data-<ts>/` — ese directorio no existe, hay que crearlo (mismo volumen Gandi, 37 GB libres → 1.3 G de backup cabe sin problema). Cumple la regla "backup en el mismo volumen de datos, no en boot".

### Propuesta operativa exacta de A.0 (pendiente de OK)

Una sola ventana, secuencia atómica, rollback definido. Asume D1a + D2a + D4.

```bash
# 0) Pre-checks (ya hechos en Pre-paso 0; se repiten por idempotencia)
ssh debian@VPS 'docker ps --filter name=scriptorium-vps-nodered-1 --format "{{.Names}} {{.Status}}"'

# 1) Preparar destino bind y backup (sin tocar el contenedor todavía)
ssh debian@VPS 'sudo install -d -o debian -g debian -m 755 /srv/oasis/scriptorium/backups
                sudo install -d -o 1000  -g 1000  -m 775 /srv/oasis/scriptorium/node-red/data
                sudo install -d -o 1000  -g 1000  -m 775 /srv/oasis/scriptorium/node-red/data/ARCHIVO
                sudo install -d -o 1000  -g 1000  -m 775 /srv/oasis/scriptorium/node-red/data/projects'

# 2) Parar Node-RED limpiamente para snapshot consistente de flows.json + node_modules
ssh debian@VPS 'docker stop scriptorium-vps-nodered-1'

# 3) Backup full atómico al volumen Gandi (incluye contenido visible de los binds hijos)
ts=$(date -u +%Y%m%dT%H%M%SZ)
ssh debian@VPS "docker cp scriptorium-vps-nodered-1:/data /srv/oasis/scriptorium/backups/nodered-data-${ts}/
                du -sh /srv/oasis/scriptorium/backups/nodered-data-${ts}/
                find /srv/oasis/scriptorium/backups/nodered-data-${ts}/ | wc -l"
# checksums esperados ≈ 1.3 G / 28 750 entradas (margen ±5 %)

# 4) Rellenar el bind destino sin duplicar lo que ya viene por sub-bind
ssh debian@VPS "sudo rsync -aHAX --delete \
  --exclude='/ARCHIVO' --exclude='/projects' \
  /srv/oasis/scriptorium/backups/nodered-data-${ts}/ \
  /srv/oasis/scriptorium/node-red/data/
                sudo chown -R 1000:1000 /srv/oasis/scriptorium/node-red/data
                ls -la /srv/oasis/scriptorium/node-red/data | head -20"

# 5) Editar compose: añadir UNA línea de volume al servicio nodered
ssh debian@VPS "cd /opt/aleph-scriptorium/ScriptoriumVps/PATTERN-DOCKER
                cp docker-compose.yml docker-compose.yml.before-r10-02A0-${ts}
                # editar (sed o patch dirigido) para insertar:
                #   - /srv/oasis/scriptorium/node-red/data:/data
                # como primer item del bloque volumes: del servicio nodered
                docker compose -f docker-compose.yml config | grep -A 30 'nodered:' | head -50"

# 6) Aplicar cambio
ssh debian@VPS 'cd /opt/aleph-scriptorium/ScriptoriumVps/PATTERN-DOCKER && docker compose up -d nodered'

# 7) Validaciones
ssh debian@VPS 'docker exec scriptorium-vps-nodered-1 sh -c "ls -la /data | head -20; cat /data/flows.json | wc -c; ls /data/node_modules | wc -l; mount | grep /data"'
ssh debian@VPS 'docker network inspect oasis-pub-scriptorium_oasis_pub_net --format "{{range .Containers}}{{.Name}} {{.IPv4Address}} aliases={{.Aliases}}{{println}}{{end}}" 2>/dev/null || true'
curl -I https://scriptorium.escrivivir.co/red/
curl -I https://admin.scriptorium.escrivivir.co/red/
```

Criterios de éxito (todos requeridos para cerrar):
- `mount | grep /data` dentro del contenedor muestra el bind a `/srv/oasis/scriptorium/node-red/data`.
- `flows.json` y package.json coinciden con los del backup (md5 / `wc -c`).
- node_modules conserva los 369 paquetes del MVP.
- Subrutas `/data/ARCHIVO` y `/data/projects` siguen accesibles (vienen de sus propios binds).
- `scriptorium.escrivivir.co/red/` y `admin.scriptorium.escrivivir.co/red/` siguen `200`.
- Red `oasis-pub-scriptorium_oasis_pub_net` reasignada con aliases previos.

Rollback (si cualquiera falla):
1. `docker compose down nodered` (parar el contenedor con bind nuevo).
2. Restaurar `docker-compose.yml.before-r10-02A0-${ts}`.
3. `docker compose up -d nodered` con compose original.
4. Como el contenedor previo ya se eliminó, **el estado vivo lo reconstruimos desde el backup**: `docker cp /srv/oasis/scriptorium/backups/nodered-data-${ts}/. scriptorium-vps-nodered-1:/data/` (con `chown 1000:1000` interno) y `docker restart`. **Aviso explícito al PO antes de seguir con A.1.**

### Lo que necesito del PO antes de ejecutar

1. Confirmación o veto a **D1a** (`/srv/oasis/scriptorium/node-red/data` con guion, alineado con el directorio ya existente).
2. Confirmación a **D2a** (rsync con `--exclude=/ARCHIVO --exclude=/projects` al rellenar el bind, para no dejar copias fantasma bajo sub-mounts).
3. OK explícito para abrir la **ventana controlada** (parar contenedor + backup + bind mount + restart). Estimación de impacto: Node-RED parado durante el backup + rsync (~1.3 G a disco local del mismo volumen → minutos, no horas). Caída visible en `scriptorium.escrivivir.co/red/`, `dashboard/rooms` y `admin.scriptorium.escrivivir.co/red/` durante la ventana.

No encadeno con A.1. Si A.0 falla, rollback al backup y aviso antes de seguir, como pide el plan.