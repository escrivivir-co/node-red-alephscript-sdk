# Invitación · Federarte al Pub.Rooms desde cero

> **Para:** amigo que parte sin Node-RED instalado.
> **De:** owner Scriptorium.
> **Lo que vas a obtener:** un Node-RED local arrancando en `http://localhost:1880`, con un flow ya conectado a `rooms.scriptorium.escrivivir.co`. No abres puertos en tu lado.

## Lo que necesitas tener antes de empezar

- Linux, macOS o WSL2 en Windows. (Si solo tienes Windows nativo, dímelo y mando variante PowerShell.)
- `node ≥ 18` y `npm`. Si no los tienes, el script te avisa.
- Acceso a internet saliente HTTPS/WSS.
- El token y el room que te he mandado por canal seguro.
- 10 minutos.

## Paso 0 — pega aquí lo que te mandé

```
TU_TOKEN     = <<PEGA_AQUI_TU_TOKEN>>
TU_ROOM      = <<PEGA_AQUI_EL_ROOM>>          # ej. ROOMS_LAB_AMIGO_B
TU_NOMBRE    = <<TU_ALIAS_LEGIBLE>>           # ej. amigo-b
```

**Nunca** pongas el token en un commit ni en un chat público.

## Paso 1 — instalar Node-RED si partes de cero

Si `node-red` no existe todavía:

```bash
npm install -g node-red
```

## Paso 2 — bootstrap Pub.Rooms

```bash
curl -fsSL https://raw.githubusercontent.com/escrivivir-co/scriptorium-vps/integration/beta/scriptorium/scripts/bootstrap-mesh-client.sh \
   | ROOMS_USER="$TU_NOMBRE" ROOMS_ROOM="$TU_ROOM" ROOMS_SECRET="$TU_TOKEN" bash
```

> Si prefieres descargarlo y revisarlo antes de ejecutarlo (recomendado): [`bootstrap-mesh-client.sh`](https://github.com/escrivivir-co/aleph-scriptorium/blob/integration/beta/scriptorium/ScriptoriumVps/scripts/bootstrap-mesh-client.sh).

Lo que hace el script:

1. Valida `node ≥ 18` y avisa si `node-red` no está en PATH.
2. Crea/usa `~/.node-red` y hace backup si ya había contenido.
3. Instala desde el Verdaccio público `node-red-contrib-alephscript-core@^0.2.0` y `node-red-dashboard-2-alephscript-rooms@^0.2.0`.
4. Copia `~/.node-red/flows_pub-room-client.json` con un cliente Rooms que apunta a `https://rooms.scriptorium.escrivivir.co`, namespace `/runtime`.
5. Escribe `~/.node-red/.env.rooms` (`600`) con tu user, room y token. El flow usa `$(ROOMS_USER)`, `$(ROOMS_ROOM)`, `$(ROOMS_SECRET)`; el token no va en el JSON.

Arranca Node-RED así:

```bash
source ~/.node-red/.env.rooms
node-red
```

Luego abre `http://localhost:1880/red/` e importa `~/.node-red/flows_pub-room-client.json`.

## Paso 3 — comprobar que estás dentro

1. Abre `http://localhost:1880/red/`.
2. El nodo `alephscript-core-client` debe verse en verde con texto `connected`.
3. Atajo de salud sin abrir el editor:
   ```bash
   curl -I https://rooms.scriptorium.escrivivir.co/healthz
   # esperado: HTTP/2 200, body 'scriptorium rooms edge ok'
   ```

Si tu cliente queda en `auth: unauthorized`, es token o room mal copiado: avisa al owner.

## Paso 4 — primera interacción

Hay un nodo `inject` precableado para mandar un `HELLO` al room. Pulsa el botón de `inject` y el owner verá tu cliente. A partir de ahí, puedes editar libremente el flow para mandar y recibir lo que quieras dentro del room.

## Si algo no va

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `node` no encontrado | falta runtime | instalar Node 20 LTS desde [nodejs.org](https://nodejs.org) |
| Node-RED no arranca | puerto 1880 ocupado | `pkill -f node-red` o cambiar puerto en `~/.node-red/settings.js` |
| `auth: unauthorized` | token/room mal | revisar copy/paste con el owner |
| `connect_error: timeout` | red sin salida 443 | habilitar HTTPS saliente |
| el contrib no aparece en la paleta | install fallido | `cd ~/.node-red && npm i node-red-contrib-alephscript-core@^0.2.0 --registry https://npm.scriptorium.escrivivir.co` y reiniciar |
| Verdaccio pide credenciales | no debería: la lectura es pública | comprobar la URL del registry exacta |
| el nodo queda sin credenciales | arrancaste Node-RED sin env | `source ~/.node-red/.env.rooms && node-red`, luego redeploy |

## Higiene

- El token vive en `~/.node-red/.env.rooms` con permisos `600`. El bootstrap se asegura de las perms.
- El flow **no contiene** el token en claro.
- Para retirarte: `rm -rf ~/.node-red` y `npm un -g node-red` (cuidado: borra todos tus flows si reusabas Node-RED, en perfil `fresh` no debería haber nada más).

## Contexto y por qué te invitamos así

Estás entrando a un mesh de Node-RED federado vía Socket.IO autenticado por shared-secret por room. Más detalle:

- Release notes: [RELEASE_NOTES_TASK-10.md](https://github.com/escrivivir-co/aleph-scriptorium/blob/integration/beta/scriptorium/sala/dossiers/scriptorium-vps/RELEASE_NOTES_TASK-10.md)
- Repo: [github.com/escrivivir-co/aleph-scriptorium](https://github.com/escrivivir-co/aleph-scriptorium/tree/integration/beta/scriptorium)
- Endpoint vivo: [rooms.scriptorium.escrivivir.co](https://rooms.scriptorium.escrivivir.co)
