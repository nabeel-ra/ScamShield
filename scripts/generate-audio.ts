import { loadEnvConfig } from '@next/env';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { scenario } from '../src/lib/scenario';

async function main() {
  loadEnvConfig(process.cwd());
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) throw new Error('Add ELEVENLABS_API_KEY to .env.local before generating audio.');
  if (!key.startsWith('sk_')) throw new Error('ELEVENLABS_API_KEY must be the secret key beginning sk_, not the key ID. Copy the secret shown when creating or rotating the key.');
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || 'JBFqnCBsd6RMkjVDRZzb';
  const modelId = 'eleven_multilingual_v2';
  const output = join(process.cwd(), 'public', 'audio');
  await mkdir(output, { recursive: true });
  const clips: { text: string; url: string }[] = [];
  for (const [index, line] of scenario.entries()) {
    const body = { text: line.text, model_id: modelId, voice_settings: { stability: 0.6, similarity_boost: 0.75 } };
    const hash = createHash('sha256').update(JSON.stringify({ voiceId, body })).digest('hex').slice(0, 16);
    const filename = `caller-${index + 1}-${hash}.mp3`;
    const path = join(output, filename);
    const existing = await readFile(path).catch(() => null);
    if (existing && existing.length > 1000) {
      console.log(`Clip ${index + 1}/${scenario.length}: using saved audio`);
    } else {
      console.log(`Clip ${index + 1}/${scenario.length}: generating with ElevenLabs`);
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
        method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) throw new Error(`ElevenLabs returned HTTP ${response.status}. Check key permissions, voice access, and credits. Saved clips will be reused on retry.`);
      if (!response.headers.get('content-type')?.includes('audio/')) throw new Error('ElevenLabs did not return audio.');
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 1000) throw new Error('ElevenLabs returned an empty or incomplete clip.');
      await writeFile(`${path}.tmp`, bytes);
      await rename(`${path}.tmp`, path);
    }
    clips.push({ text: line.text, url: `/audio/${filename}` });
  }
  // Publish only after all six clips are saved. No credentials are included.
  const manifest = { provider: 'ElevenLabs', voiceId, modelId, clips };
  const manifestPath = join(output, 'manifest.json');
  await writeFile(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2) + '\n');
  await rename(`${manifestPath}.tmp`, manifestPath);
  console.log('All caller clips ready. Refresh ScamShield and select ElevenLabs voice.');
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Audio generation failed.'); process.exitCode = 1; });
