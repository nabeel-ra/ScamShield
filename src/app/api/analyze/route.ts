import { AnalysisError, classifyTranscript } from '@/lib/nemotron';
import { getScenario, type Scenario } from '@/lib/scenarios';

export const runtime = 'nodejs';
export const maxDuration = 60;
const failure = (error: string, status: number) => Response.json({ error }, { status });

export async function POST(request: Request) {
  let lineCount: number;
  let selected: Scenario | undefined;
  try {
    // Only allowlisted synthetic scenarios and visible prefixes reach the provider.
    const raw = await request.text();
    if (raw.length > 1000) return failure('Request too large.', 413);
    const input = JSON.parse(raw);
    selected = getScenario(input?.scenarioId === undefined ? 'bank-fraud' : input.scenarioId);
    if (!selected || !input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => key !== 'lineCount' && key !== 'scenarioId') || !Number.isInteger(input.lineCount) || input.lineCount < 1 || input.lineCount > selected.lines.length) return failure('Choose a valid synthetic transcript prefix.', 400);
    lineCount = input.lineCount;
  } catch { return failure('Invalid request JSON.', 400); }

  try {
    const result = await classifyTranscript(selected.lines.slice(0, lineCount).map(line => line.text), { signal: request.signal });
    return Response.json({ ...result, lineCount });
  } catch (error) {
    return Response.json({ error: error instanceof AnalysisError ? error.message : 'Analysis failed.', attempts: error instanceof AnalysisError ? error.attempts : 0, retries: error instanceof AnalysisError ? error.retries : [] }, { status: error instanceof AnalysisError ? error.status : 502 });
  }
}
