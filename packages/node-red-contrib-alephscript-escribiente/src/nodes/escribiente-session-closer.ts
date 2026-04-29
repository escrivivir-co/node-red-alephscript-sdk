import fs from 'fs';
import path from 'path';
import { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red';
import { EscribienteConfigNode } from '../node-types';
import { SessionManifest } from '../types';
import { listFilesRecursive, nowIso, readJsonFile, sortChunkPaths, updateManifest } from '../utils/fs-utils';
import { runCommand } from '../utils/process-utils';

interface SessionCloserNodeDef extends NodeDef {
  config: string;
  timeoutMs: number;
}

interface SessionCloserCommand {
  action?: 'close';
  sessionId?: string;
}

interface SessionCloserNode extends Node {
  configNode: EscribienteConfigNode;
}

function buildManifestPath(sessionsRoot: string, sessionId: string): string {
  return path.join(sessionsRoot, sessionId, 'manifest.json');
}

function shouldHandleCloserMessage(msg: NodeMessage, payload: SessionCloserCommand): boolean {
  return payload.action === 'close' || msg.topic === 'close_session_request' || msg.topic === 'session_closing';
}

async function compressSession(session: SessionManifest, timeoutMs: number): Promise<string | null> {
  if (process.platform !== 'win32') {
    return null;
  }

  const exportZip = path.join(session.sessionDir, 'export.zip');
  const literalPaths = [
    path.join(session.sessionDir, 'audio'),
    path.join(session.sessionDir, 'text'),
    path.join(session.sessionDir, 'full.txt'),
    path.join(session.sessionDir, 'informe.md')
  ]
    .filter((candidate) => fs.existsSync(candidate))
    .map((candidate) => `'${candidate.replace(/'/g, "''")}'`)
    .join(', ');

  if (!literalPaths) {
    return null;
  }

  await runCommand(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `if (Test-Path -LiteralPath '${exportZip.replace(/'/g, "''")}') { Remove-Item -LiteralPath '${exportZip.replace(/'/g, "''")}' -Force }; Compress-Archive -LiteralPath ${literalPaths} -DestinationPath '${exportZip.replace(/'/g, "''")}' -Force`
    ],
    timeoutMs
  );

  return exportZip;
}

export = function (RED: NodeAPI) {
  function EscribienteSessionCloserNode(this: SessionCloserNode, config: SessionCloserNodeDef) {
    RED.nodes.createNode(this, config);

    this.configNode = RED.nodes.getNode(config.config) as EscribienteConfigNode;
    if (!this.configNode) {
      this.error('Escribiente config node not found');
      return;
    }

    const timeoutMs = Number(config.timeoutMs) || 600000;

    this.on('input', async (msg: NodeMessage, send, done) => {
      const payload = (msg.payload || {}) as SessionCloserCommand;
      if (!shouldHandleCloserMessage(msg, payload)) {
        done();
        return;
      }

      try {
        const resolved = this.configNode.getResolvedConfig();
        const sessionId = payload.sessionId || (msg as NodeMessage & { sessionId?: string }).sessionId;
        if (!sessionId) {
          throw new Error('sessionId is required to close a session');
        }

        const manifestPath = buildManifestPath(resolved.sessionsRoot, sessionId);
        const manifest = readJsonFile<SessionManifest>(manifestPath, {} as SessionManifest);
        if (!manifest.sessionId) {
          throw new Error(`Session manifest not found for ${sessionId}`);
        }

        this.status({ fill: 'blue', shape: 'dot', text: 'closing session' });

        const textFiles = sortChunkPaths(listFilesRecursive(manifest.textDir, (filePath) => filePath.endsWith('.txt')));
        const fullText = textFiles.map((filePath) => fs.readFileSync(filePath, 'utf8').trim()).filter(Boolean).join('\n\n');
        const fullTextPath = path.join(manifest.sessionDir, 'full.txt');
        fs.writeFileSync(fullTextPath, fullText, 'utf8');

        const reportLines: string[] = [
          `# Informe final — ${manifest.sessionId}`,
          '',
          `- **Slug:** ${manifest.slug}`,
          `- **Creada:** ${manifest.createdAt}`,
          `- **Fuente:** ${manifest.source}`,
          `- **Modelo:** ${manifest.model} / ${manifest.device} / ${manifest.computeType}`,
          `- **Idioma:** ${manifest.language}`,
          `- **Chunk sec:** ${manifest.chunkSec}`,
          `- **Chunks completados:** ${manifest.chunksCompleted}`,
          `- **Chunks fallidos:** ${manifest.chunksFailed}`,
          '',
          '## Tramos',
          '',
          '| Chunk | Archivo | Preview |',
          '|---|---|---|'
        ];

        for (const textFile of textFiles) {
          const preview = fs.readFileSync(textFile, 'utf8').replace(/\s+/g, ' ').trim().slice(0, 120);
          reportLines.push(`| ${path.basename(textFile, '.txt')} | ${path.basename(textFile)} | ${preview.replace(/\|/g, '\\|')} |`);
        }

        reportLines.push('', '## Texto consolidado', '', fullText || '_Sin texto_');

        const reportPath = path.join(manifest.sessionDir, 'informe.md');
        fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf8');

        let exportZip: string | null = null;
        try {
          exportZip = await compressSession(manifest, timeoutMs);
        } catch (error) {
          this.warn(`Unable to generate zip export: ${error instanceof Error ? error.message : String(error)}`);
        }

        const updated = updateManifest(manifestPath, (draft) => ({
          ...draft,
          updatedAt: nowIso(),
          status: 'closed',
          closedAt: nowIso(),
          exportZip: exportZip || undefined
        }));

        this.status({ fill: 'green', shape: 'dot', text: 'session closed' });
        send({
          ...msg,
          sessionId,
          topic: 'session_closed',
          payload: {
            session: updated,
            fullTextPath,
            reportPath,
            exportZip
          }
        });
        done();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.status({ fill: 'red', shape: 'dot', text: 'close error' });
        done(new Error(message));
      }
    });
  }

  RED.nodes.registerType('alephscript-escribiente-session-closer', EscribienteSessionCloserNode);
};
