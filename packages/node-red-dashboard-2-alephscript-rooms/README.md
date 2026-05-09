# node-red-dashboard-2-alephscript-rooms

Rooms MVP package for Node-RED Dashboard 2 using `@alephscript/mcp-core-sdk`.

## Included nodes

- `alephscript-rooms-config`
- `alephscript-rooms-server`
- `alephscript-rooms-agent-dummy`
- `alephscript-rooms-dashboard`

## Runtime modes

- `managed-port` — default MVP mode. Starts the SDK runtime in-process on a dedicated port inside the Node-RED container.
- `external` — points at an existing runtime.
- `same-origin` — intentionally marked experimental/not enabled by default in this MVP because the current SDK creates its own Socket.IO server with the default `/socket.io` path, which is unsafe to share blindly with the Socket.IO stack already used by Node-RED Dashboard 2.

## Publication

The package follows the Verdaccio publication expectations already enforced by `ScriptoriumVps/scripts/publish-package.sh`:

- `author` and `maintainers` are present;
- `prepublishOnly` builds both Node-RED runtime code and the Dashboard 2 UMD bundle;
- the tarball includes `dist/` and `resources/`.