const AF3_API_KEY = process.env.AF3_API_KEY!
const AF3_BASE = 'https://alphafoldserver.com/api/v1'

export interface AF3Result {
  sequence: string
  plddt: number
  structureUrl: string
}

export async function submitToAF3(sequence: string, jobName: string): Promise<string> {
  const res = await fetch(`${AF3_BASE}/predictions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AF3_API_KEY}`,
    },
    body: JSON.stringify({
      name: jobName,
      sequences: [{ proteinChain: { sequence, count: 1 } }],
    }),
  })
  if (!res.ok) throw new Error(`AF3 submit failed: ${await res.text()}`)
  const data = await res.json()
  return data.name as string
}

export async function getAF3Result(predictionName: string): Promise<AF3Result | null> {
  const res = await fetch(`${AF3_BASE}/predictions/${predictionName}`, {
    headers: { 'Authorization': `Bearer ${AF3_API_KEY}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.status !== 'COMPLETE') return null
  return {
    sequence: data.sequences?.[0]?.proteinChain?.sequence ?? '',
    plddt: data.summaryConfidences?.meanPlddt ?? 0,
    structureUrl: data.cifUrl ?? '',
  }
}
