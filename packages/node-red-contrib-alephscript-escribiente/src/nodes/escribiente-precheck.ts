import { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red';
import { EscribienteConfigNode } from '../node-types';
import { runCommand } from '../utils/process-utils';

interface PrecheckNodeDef extends NodeDef {
  config: string;
  runOnDeploy: boolean;
  timeoutMs: number;
}

interface PrecheckNode extends Node {
  configNode: EscribienteConfigNode;
  runPrecheck(msg?: NodeMessage): Promise<void>;
}

export = function (RED: NodeAPI) {
  function EscribientePrecheckNode(this: PrecheckNode, config: PrecheckNodeDef) {
    RED.nodes.createNode(this, config);

    this.configNode = RED.nodes.getNode(config.config) as EscribienteConfigNode;
    if (!this.configNode) {
      this.error('Escribiente config node not found');
      return;
    }

    const timeoutMs = Number(config.timeoutMs) || 180000;

    this.runPrecheck = async (msg?: NodeMessage) => {
      try {
        const resolved = this.configNode.getResolvedConfig();
        this.status({ fill: 'blue', shape: 'dot', text: 'running precheck' });

        const { stdout } = await runCommand(
          resolved.pythonCommand,
          [
            resolved.precheckScript,
            '--sessions-root', resolved.sessionsRoot,
            '--queue-root', resolved.queueRoot,
            '--ffmpeg-command', resolved.ffmpegCommand
          ],
          timeoutMs,
          {
            ESCRIBIENTE_SESSIONS_ROOT: resolved.sessionsRoot,
            ESCRIBIENTE_QUEUE_ROOT: resolved.queueRoot,
            ESCRIBIENTE_FFMPEG: resolved.ffmpegCommand
          }
        );

        const payload = JSON.parse(stdout);
        this.status({
          fill: payload.ready ? (payload.warnings?.length ? 'yellow' : 'green') : 'red',
          shape: payload.ready ? 'dot' : 'ring',
          text: payload.ready ? 'ready' : 'not ready'
        });

        this.send({
          ...(msg || {}),
          topic: 'precheck_result',
          payload
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.status({ fill: 'red', shape: 'dot', text: 'precheck error' });
        this.error(message);
        this.send({
          ...(msg || {}),
          topic: 'precheck_error',
          payload: {
            ready: false,
            error: message
          }
        });
      }
    };

    this.on('input', async (msg: NodeMessage, _send, done) => {
      const shouldRun = msg.topic === 'run_precheck' || (msg.payload as { action?: string } | undefined)?.action === 'precheck';
      if (!shouldRun) {
        done();
        return;
      }
      await this.runPrecheck(msg);
      done();
    });

    if (config.runOnDeploy) {
      setTimeout(() => {
        void this.runPrecheck();
      }, 250);
    }
  }

  RED.nodes.registerType('alephscript-escribiente-precheck', EscribientePrecheckNode);
};
