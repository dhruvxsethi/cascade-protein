const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY!
const RUNPOD_BASE = 'https://rest.runpod.io/v1'

interface CreatePodOptions {
  name: string
  imageName: string
  gpuTypeId: string
  containerDiskInGb: number
  volumeInGb: number
  startScript: string
}

export interface PodStatus {
  id: string
  desiredStatus: string
  runtime: { gpus: Array<{ id: string }> } | null
}

export async function createRunpodPod(opts: CreatePodOptions): Promise<string> {
  const res = await fetch(`${RUNPOD_BASE}/pods`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RUNPOD_API_KEY}`,
    },
    body: JSON.stringify({
      name: opts.name,
      imageName: opts.imageName,
      gpuTypeId: opts.gpuTypeId,
      containerDiskInGb: opts.containerDiskInGb,
      volumeInGb: opts.volumeInGb,
      startJupyter: false,
      startSsh: true,
      env: [{ key: 'START_SCRIPT', value: opts.startScript }],
    }),
  })
  if (!res.ok) throw new Error(`RunPod create failed: ${await res.text()}`)
  const data = await res.json()
  return data.id
}

export async function getPodStatus(podId: string): Promise<PodStatus> {
  const res = await fetch(`${RUNPOD_BASE}/pods/${podId}`, {
    headers: { 'Authorization': `Bearer ${RUNPOD_API_KEY}` },
  })
  if (!res.ok) throw new Error(`RunPod status failed: ${await res.text()}`)
  return res.json()
}

export async function terminatePod(podId: string): Promise<void> {
  const res = await fetch(`${RUNPOD_BASE}/pods/${podId}/terminate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RUNPOD_API_KEY}` },
  })
  if (!res.ok) throw new Error(`RunPod terminate failed: ${await res.text()}`)
}
