import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export async function runCommand(command: string, args: string[], timeoutMs = 120000, env?: NodeJS.ProcessEnv): Promise<CommandResult> {
  const result = await execFileAsync(command, args, {
    timeout: timeoutMs,
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 20,
    env: {
      ...process.env,
      ...env
    }
  });

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? ''
  };
}

export function ffprobeCommandFromFfmpeg(ffmpegCommand: string): string {
  if (!ffmpegCommand) return 'ffprobe';
  if (ffmpegCommand.endsWith('ffmpeg.exe')) return ffmpegCommand.replace(/ffmpeg\.exe$/i, 'ffprobe.exe');
  if (ffmpegCommand.endsWith('ffmpeg')) return ffmpegCommand.replace(/ffmpeg$/i, 'ffprobe');
  return 'ffprobe';
}

export async function probeDurationSeconds(audioPath: string, ffmpegCommand: string, timeoutMs = 120000): Promise<number> {
  const ffprobeCommand = ffprobeCommandFromFfmpeg(ffmpegCommand);
  const { stdout } = await runCommand(
    ffprobeCommand,
    [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      audioPath
    ],
    timeoutMs
  );

  const duration = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(duration)) {
    throw new Error(`Unable to determine audio duration for ${audioPath}`);
  }
  return duration;
}

export async function transcodeSliceToWav(
  ffmpegCommand: string,
  sourcePath: string,
  destinationPath: string,
  startSec: number,
  durationSec: number,
  timeoutMs = 600000
): Promise<void> {
  await runCommand(
    ffmpegCommand,
    [
      '-y',
      '-ss', String(startSec),
      '-t', String(durationSec),
      '-i', sourcePath,
      '-vn',
      '-ac', '1',
      '-ar', '16000',
      destinationPath
    ],
    timeoutMs
  );
}

export async function compressDirectoryWindows(sourceDir: string, zipPath: string, timeoutMs = 600000): Promise<void> {
  await runCommand(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `if (Test-Path -LiteralPath '${zipPath.replace(/'/g, "''")}') { Remove-Item -LiteralPath '${zipPath.replace(/'/g, "''")}' -Force }; Compress-Archive -LiteralPath '${sourceDir.replace(/'/g, "''")}' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`
    ],
    timeoutMs
  );
}
