const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY!
const GRAPHQL_URL = `https://api.runpod.io/graphql?api_key=${RUNPOD_API_KEY}`

interface CreatePodOptions {
  name: string
  imageName: string
  gpuTypeIds: string[]
  containerDiskInGb: number
  env: Record<string, string>
}

export interface PodStatus {
  id: string
  desiredStatus: string
  runtime: { gpus: Array<{ id: string }> } | null
}

async function gql(query: string, variables: Record<string, unknown>) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(JSON.stringify(json.errors))
  return json.data
}

export async function createRunpodPod(opts: CreatePodOptions): Promise<string> {
  const envArray = Object.entries(opts.env).map(([key, value]) => ({ key, value }))

  // Try each GPU type until one has availability
  for (const gpuTypeId of opts.gpuTypeIds) {
    try {
      const data = await gql(`
        mutation CreatePod($input: PodFindAndDeployOnDemandInput!) {
          podFindAndDeployOnDemand(input: $input) { id }
        }
      `, {
        input: {
          name: opts.name,
          imageName: opts.imageName,
          gpuTypeId,
          gpuCount: 1,
          containerDiskInGb: opts.containerDiskInGb,
          dockerArgs: 'bash -c "bash <(curl -fsSL $SCRIPT_URL)"',
          env: envArray,
          cloudType: 'SECURE',
        },
      })
      return data.podFindAndDeployOnDemand.id
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isUnavailable = msg.includes('no instance') || msg.includes('No instance') ||
        msg.includes('available') || msg.includes('resources') || msg.includes('machine')
      if (isUnavailable) continue
      throw err
    }
  }
  throw new Error('No GPU instances available across all types. Try again in a few minutes.')
}

export async function getPodStatus(podId: string): Promise<PodStatus> {
  const data = await gql(`
    query GetPod($id: String!) {
      pod(input: { podId: $id }) { id desiredStatus runtime { gpus { id } } }
    }
  `, { id: podId })
  return data.pod
}

export async function terminatePod(podId: string): Promise<void> {
  await gql(`
    mutation TerminatePod($id: String!) {
      podTerminate(input: { podId: $id })
    }
  `, { id: podId })
}
