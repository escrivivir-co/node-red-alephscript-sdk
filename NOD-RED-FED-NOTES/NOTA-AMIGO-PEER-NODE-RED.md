# Invitación · Federarte al Pub.Rooms con tu Node-RED ya operativo

> **Para:** amigo con Node-RED ya en marcha (mesh peer).
> **De:** owner Scriptorium.
> **Lo que vas a obtener:** tu Node-RED se federa con `rooms.scriptorium.escrivivir.co` y aparece como cliente autenticado en el room que te he asignado, sin abrir puertos en tu lado.

## Lo que necesitas tener antes de empezar

- Tu Node-RED arrancando bien en local (cualquier versión ≥ 3.x con Node ≥ 18).
- Acceso a internet saliente HTTPS/WSS (no necesitas inbound).
- El token y el nombre de room que te he mandado por canal seguro.
- 5 minutos.

## Paso 0 — pega aquí lo que te mandé

Sustituye estos placeholders en tu cabeza (o en un editor local que no sincronices con nada):

```
TU_TOKEN     = <<PEGA_AQUI_TU_TOKEN>>
TU_ROOM      = <<PEGA_AQUI_EL_ROOM>>          # ej. ROOMS_LAB_AMIGO_A
TU_NOMBRE    = <<TU_ALIAS_LEGIBLE>>           # ej. amigo-a
```

**Nunca** pongas el token en un commit ni en un chat público.

## Paso 1 — bootstrap (una sola línea)

Desde tu máquina con Node-RED parado o vivo (es indistinto):

```bash
curl -fsSL https://raw.githubusercontent.com/escrivivir-co/scriptorium-vps/integration/beta/scriptorium/scripts/bootstrap-mesh-client.sh \
  | ROOMS_USER="$TU_NOMBRE" ROOMS_ROOM="$TU_ROOM" ROOMS_SECRET="$TU_TOKEN" bash
```

> Si prefieres descargarlo y revisarlo antes de ejecutarlo (recomendado): [`bootstrap-mesh-client.sh`](https://github.com/escrivivir-co/aleph-scriptorium/blob/integration/beta/scriptorium/ScriptoriumVps/scripts/bootstrap-mesh-client.sh).

Lo que hace el script:

1. Valida `node ≥ 18` y `npm`.
2. Detecta tu directorio de Node-RED (`~/.node-red` por defecto) y respeta tu instalación.
3. Hace backup timestampeado de `~/.node-red` si ya contiene datos.
4. Instala desde el Verdaccio público:
   - `node-red-contrib-alephscript-core@^0.2.0`
   - `node-red-dashboard-2-alephscript-rooms@^0.2.0` (no arrancas server en tu lado; queda instalado por compatibilidad de paleta/flow).
5. Copia `flows_pub-room-client.json` a `~/.node-red/`.
6. Escribe `~/.node-red/.env.rooms` (`600`) con tu user, room y token. El flow usa `$(ROOMS_USER)`, `$(ROOMS_ROOM)`, `$(ROOMS_SECRET)`, así que el token no va en el JSON.

## Paso 2 — arrancar Node-RED con env, importar y deploy

```bash
source ~/.node-red/.env.rooms
node-red
```

1. Abre tu Node-RED admin.
2. Menú → Import → importa `~/.node-red/flows_pub-room-client.json`.
3. Deploy.

El nodo `alephscript-core-client` debería terminar en status verde `connected`. Si ves `auth: unauthorized` significa token o room incorrectos: revisa con el owner.

## Paso 3 — verificación rápida

Desde tu Node-RED, manda un mensaje de prueba al room (cualquier `inject` → `alephscript-core-client` con `msg.event='HELLO'`). El owner verá tu cliente registrado en el dashboard de su VPS.

Atajo de salud sin ni siquiera Node-RED:

```bash
curl -I https://rooms.scriptorium.escrivivir.co/healthz
# esperado: HTTP/2 200, body 'scriptorium rooms edge ok'
```

## Si algo no va

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `auth: unauthorized` | token o room mal copiado | revisar copy/paste; el owner puede regenerarte el token |
| `connect_error: timeout` | red local sin egreso 443 | habilitar HTTPS saliente |
| nodo en gris infinito | versión vieja del contrib | `npm i node-red-contrib-alephscript-core@^0.2.0 --registry https://npm.scriptorium.escrivivir.co` y reiniciar Node-RED |
| el SDK pide credenciales para Verdaccio | no debería: la lectura es pública | comprobar que estás usando exactamente esa URL de registry |
| sigue sin auth tras importar | arrancaste Node-RED sin env | `source ~/.node-red/.env.rooms && node-red`, luego redeploy |

## Higiene

- El token es solo tuyo: si crees que se filtró, dile al owner para rotártelo.
- El bootstrap **no escribe el token dentro del flow**; lo guarda en `~/.node-red/.env.rooms` con permisos `600` para que lo cargues al arrancar Node-RED.
- Para retirarte: borra el flow importado y `npm uninstall node-red-contrib-alephscript-core`.

## Más contexto si quieres saber dónde te estás conectando

- Release notes: [RELEASE_NOTES_TASK-10.md](https://github.com/escrivivir-co/aleph-scriptorium/blob/integration/beta/scriptorium/sala/dossiers/scriptorium-vps/RELEASE_NOTES_TASK-10.md)
- Repo: [github.com/escrivivir-co/aleph-scriptorium](https://github.com/escrivivir-co/aleph-scriptorium/tree/integration/beta/scriptorium)
- Endpoint vivo: [rooms.scriptorium.escrivivir.co](https://rooms.scriptorium.escrivivir.co)
