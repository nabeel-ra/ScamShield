export type AudioManifest = { provider: 'ElevenLabs'; clips: { text: string; url: string }[] };
export function validAudioManifest(value: unknown, lines: readonly string[]): value is AudioManifest {
  if (!value || typeof value !== 'object' || !('provider' in value) || value.provider !== 'ElevenLabs' || !('clips' in value) || !Array.isArray(value.clips) || value.clips.length !== lines.length) return false;
  return value.clips.every((clip, index) => clip && typeof clip === 'object' && clip.text === lines[index] && typeof clip.url === 'string' && /^\/audio\/caller-\d+-[a-f0-9]{16}\.mp3$/.test(clip.url));
}
