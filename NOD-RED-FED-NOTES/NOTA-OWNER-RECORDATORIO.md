# Nota — Owner · Recordatorio operativo Pub.Rooms federado

> **Para:** owner del VPS Scriptorium (tú).
> **Cuándo:** antes de invitar a tus amigos al `ROOMS_LAB`.
> **Propósito:** un único recordatorio DRY del entorno, cómo generar y rotar tokens, y la checklist de validación previa a invitar. Todo lo demás vive en el dossier; aquí solo lo imprescindible para no repetirte.

## Lo que ya está hecho (no toques)

Cierre completo en [RELEASE_NOTES_TASK-10.md](../../RELEASE_NOTES_TASK-10.md). Lo que asumes operativo:

- `https://rooms.scriptorium.escrivivir.co` con TLS válido y `/healthz` 200.
- `wss://rooms.scriptorium.escrivivir.co/runtime` con auth shared-secret.
- Volumen Gandi montado en `/data` y secret en `/run/secrets/rooms` (read-only).
- Contribs `0.2.0` + SDK `1.4.0` instalados sobre `/data`.

## Mapa de paths que importan en el VPS

Fuente única: [`ScriptoriumVps/RUNBOOK.md`](https://github.com/escrivivir-co/aleph-scriptorium/blob/integration/beta/scriptorium/ScriptoriumVps/RUNBOOK.md). Resumen mínimo:

| Path host | Qué es |
|---|---|
| `/srv/oasis/scriptorium/node-red/data` | bind mount → `/data` del contenedor (flows + node_modules) |
| `/srv/oasis/scriptorium/node-red/secrets/rooms-secrets.json` | secrets shared-secret por room (`600 1000:1000`) |
| `/srv/oasis/scriptorium/node-red/secrets/` | dir con perms `700`, owner Node-RED |
| `/srv/oasis/scriptorium/backups/` | backups Node-RED y compose |
| `/opt/aleph-scriptorium/ScriptoriumVps/PATTERN-DOCKER/docker-compose.yml` | compose del stack (path real confirmado) |

**Regla de oro:** nada vive en `/opt/.../data` ni `/srv/scriptorium/`. Si algún día caes ahí, lo estás haciendo en el disco de boot (`vps-boot`), no en el volumen Gandi de 40 GB. Ver lección en [`sala/agente-aleph/VENTANA_CONTROLADA_VPS-08.md`](https://github.com/escrivivir-co/aleph-scriptorium/blob/integration/beta/scriptorium/sala/agente-aleph/VENTANA_CONTROLADA_VPS-08.md).

## Generar y entregar tokens (shared secret por room)

Una sola fuente de verdad: `rooms-secrets.json` en el VPS. Forma:

```json
{
  "ROOMS_LAB": "TOKEN_OWNER",
  "ROOMS_LAB_AMIGO_A": "TOKEN_AMIGO_A",
  "ROOMS_LAB_AMIGO_B": "TOKEN_AMIGO_B"
}
```

Convención DRY que recomiendo y que ya respeta el SDK:

- una entrada **por persona** (no compartir el mismo token entre dos amigos);
- el `key` es el **room** al que ese token da acceso (un amigo = un room propio dentro del mesh, o todos al mismo si quieres conversación abierta);
- el `value` es el **token** que esa persona pondrá en el cliente.

### Generar un token nuevo

```bash
ssh debian@92.243.24.163  -i GANDI_DEVOPS_FOLDER/.ssh/gandi_pub_ed25519
openssl rand -base64 32 | tr -d '=+/' | cut -c1-40
```

Copia el resultado **una sola vez**. No lo loguees. No lo pegues en chats no cifrados.

### Añadir el token al fichero secrets

```bash
sudo nano /srv/oasis/scriptorium/node-red/secrets/rooms-secrets.json
# editar y guardar; mantener perms 600 1000:1000
sudo chown 1000:1000 /srv/oasis/scriptorium/node-red/secrets/rooms-secrets.json
sudo chmod 600 /srv/oasis/scriptorium/node-red/secrets/rooms-secrets.json
```

### Recargar el flow Rooms sin reiniciar contenedor

Desde tu Node-RED admin (https://scriptorium.escrivivir.co/red/), abre el flow Rooms y hazle "Deploy modified flows". Eso re-inicializa el `authValidator` con el JSON nuevo. **No** `docker restart`. **No** `docker compose up -d nodered` salvo que cambies compose.

### Rotar un token

Borra la entrada vieja, mete la nueva con otra `value`, deploy del flow. Avisa al amigo afectado por canal seguro.

## Reparto del token a un amigo

- **No** mandes el token por email plano ni por chat público.
- Canal recomendado: Signal, mensaje cifrado o nota efímera (1 view).
- Manda **a la vez**:
  1. el token (un único string),
  2. el nombre del room (`ROOMS_LAB_AMIGO_A` por ejemplo),
  3. el enlace a la nota de su perfil:
     - amigo con Node-RED ya operativo → [NOTA-AMIGO-PEER-NODE-RED.md](NOTA-AMIGO-PEER-NODE-RED.md)
     - amigo desde cero → [NOTA-AMIGO-DESDE-CERO.md](NOTA-AMIGO-DESDE-CERO.md)

## Checklist DRY antes de invitar

Hazlo una vez tú mismo desde **tu otra máquina con Node-RED** (la que el PO ya tiene preparada). Si tú no entras, no entrará nadie:

- [ ] `curl -I https://rooms.scriptorium.escrivivir.co/healthz` → `200 OK`.
- [ ] Tienes un token tuyo de prueba en `rooms-secrets.json` (entrada `ROOMS_LAB`).
- [ ] Has hecho deploy del flow tras editar secrets.
- [ ] Ejecutas el bootstrap público con variables de entorno, por ejemplo:
      ```bash
      curl -fsSL https://raw.githubusercontent.com/escrivivir-co/scriptorium-vps/integration/beta/scriptorium/scripts/bootstrap-mesh-client.sh \
        | ROOMS_USER="owner" ROOMS_ROOM="ROOMS_LAB" ROOMS_SECRET="<tu-token>" bash
      ```
- [ ] Arrancas Node-RED con `source ~/.node-red/.env.rooms && node-red`.
- [ ] Importas `~/.node-red/flows_pub-room-client.json` y haces deploy.
- [ ] El nodo `alephscript-core-client` se conecta y termina en status `connected`.
- [ ] Smoke negativo: cambias el token a basura, redeployas; el nodo termina en `auth: unauthorized` y emite `msg.topic='auth_error'`.
- [ ] Restauras tu token bueno y vuelves a ver `connected`.

Solo cuando los 7 puntos están en verde, manda las dos notas a tus amigos.

## Bootstrap helper (qué entrega y dónde vivirá)

El script reproducible que dan tus dos notas a los amigos vive aquí (rama pública):

`https://github.com/escrivivir-co/aleph-scriptorium/blob/integration/beta/scriptorium/ScriptoriumVps/scripts/bootstrap-mesh-client.sh`

> **Estado 2026-05-09:** existe y está publicado. También existe el flow template `ScriptoriumVps/node-red-projects/pub-room-client.flow.json`.

Lo que hace el script en sus máquinas:

- valida prerequisitos (node ≥ 18, npm, curl);
- instala los dos contribs desde Verdaccio público;
- coloca un flow template para `pub-room-client`;
- pide token y nombre de room al ejecutar si no vienen por env;
- escribe `~/.node-red/.env.rooms` (`600`) y el flow usa `$(ROOMS_SECRET)`, `$(ROOMS_ROOM)`, `$(ROOMS_USER)`.

## Si algo se rompe

Lee siempre `LAST_UPDATE.md` antes de inventar:

- [`sala/dossiers/scriptorium-vps/LAST_UPDATE.md`](../../LAST_UPDATE.md)
- [`ScriptoriumVps/RUNBOOK.md`](https://github.com/escrivivir-co/aleph-scriptorium/blob/integration/beta/scriptorium/ScriptoriumVps/RUNBOOK.md) §"Pub.Rooms federado"

Y respeta el candado:

- nunca `docker restart pub-web`;
- nunca publicar `3010` al host;
- nunca tocar el Caddyfile sin `caddy validate` y `caddy reload` (preserva inode con `cat >`, no con `cp`).
