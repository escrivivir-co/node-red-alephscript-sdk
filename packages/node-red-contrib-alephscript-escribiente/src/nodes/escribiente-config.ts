import { Node, NodeAPI, NodeDef } from 'node-red';
import { EscribienteResolvedConfig } from '../node-types';
import { DEFAULT_RELATIVE_PATHS, resolveConfigPath } from '../utils/fs-utils';

interface EscribienteConfigNodeDef extends NodeDef {
  pythonCommand: string;
  workerScript: string;
  precheckScript: string;
  sessionsRoot: string;
  queueRoot: string;
  ffmpegCommand: string;
  model: string;
  device: string;
  computeType: string;
  language: string;
  beamSize: number;
  chunkSec: number;
  pollIntervalMs: number;
  defaultSource: 'mic' | 'mp3' | 'mixed';
}

interface EscribienteConfigNode extends Node {
  getResolvedConfig(): EscribienteResolvedConfig;
}

export = function (RED: NodeAPI) {
  function EscribienteConfigNode(this: EscribienteConfigNode, config: EscribienteConfigNodeDef) {
    RED.nodes.createNode(this, config);

    const resolved: EscribienteResolvedConfig = {
      pythonCommand: resolveConfigPath(config.pythonCommand || DEFAULT_RELATIVE_PATHS.pythonCommand),
      workerScript: resolveConfigPath(config.workerScript || DEFAULT_RELATIVE_PATHS.workerScript),
      precheckScript: resolveConfigPath(config.precheckScript || DEFAULT_RELATIVE_PATHS.precheckScript),
      sessionsRoot: resolveConfigPath(config.sessionsRoot || DEFAULT_RELATIVE_PATHS.sessionsRoot),
      queueRoot: resolveConfigPath(config.queueRoot || DEFAULT_RELATIVE_PATHS.queueRoot),
      ffmpegCommand: config.ffmpegCommand || DEFAULT_RELATIVE_PATHS.ffmpegCommand,
      model: config.model || 'small',
      device: config.device || 'cpu',
      computeType: config.computeType || 'int8',
      language: config.language || 'es',
      beamSize: Number(config.beamSize) || 5,
      chunkSec: Number(config.chunkSec) || 60,
      pollIntervalMs: Number(config.pollIntervalMs) || 1500,
      defaultSource: config.defaultSource || 'mixed'
    };

    this.getResolvedConfig = () => resolved;
  }

  RED.nodes.registerType('alephscript-escribiente-config', EscribienteConfigNode);
};
