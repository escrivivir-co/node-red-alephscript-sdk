# node-red-contrib-alephscript-core

Core Node-RED nodes for AlephScript Socket.IO protocol integration.

This package is the P1 debt-refactor candidate for TASK-09. It deliberately avoids the old embedded Dashboard/Rooms widgets. The modern Rooms UI belongs in the P0 package `node-red-dashboard-2-alephscript-rooms`.

## Nodes

- `alephscript-core-config` — shared Socket.IO endpoint configuration.
- `alephscript-core-client` — generic protocol client for `CLIENT_REGISTER`, `CLIENT_SUSCRIBE`, `ROOM_MESSAGE`, `GET_SERVER_STATE` and raw emits.
- `alephscript-core-format` — simple envelope formatter for app/sys/ui/room messages.

## Verdaccio

The package is compatible with `ScriptoriumVps/scripts/publish-package.sh`:

- package name matches Verdaccio pattern `node-red-contrib-alephscript*`;
- `author` and `maintainers` are declared;
- `prepublishOnly` runs `npm run build:full`;
- `dist/` is generated before publish.

Install the SDK from the Scriptorium registry using the repository `.npmrc`:

```text
@alephscript:registry=https://npm.scriptorium.escrivivir.co
```