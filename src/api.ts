/**
 * API client for the Node Controller SPA.
 *
 * All calls go to /api/portal/nodes/* which is proxied by the Express server
 * to the LGL-Ingest portal nodes API. The Express proxy injects / forwards
 * the Authorization header, so the LGL-Ingest server validates the Logto JWT.
 */

import { getToken, redirectToLogin } from './auth.ts'

export interface NodeSummary {
  id: string
  name: string
  model: string
  config: { allowed_sections: string[] }
  created_at: string
  updated_at: string
  /** Populated by the status poll — not from the list endpoint. */
  status?: DeviceStatus | null
}

export interface DeviceStatus {
  hostname?: string
  registration_state?: string
  connection?: string
  firmware_available?: string | null
  telemetry?: {
    state?: string
    subsystems?: {
      core?: string
      capture?: string
      streaming?: string
      display?: string
      registration?: string
    }
    paths?: Array<{
      interface: string
      bitrate_kbps: number
      rtt_ms: number
      loss_pct: number
      in_flight?: number
      window?: number
    }>
    encoder?: {
      pipeline?: string
      bitrate_kbps?: number
      fps?: number
      resolution?: string
      interlaced?: boolean
      audio_levels?: number[]
    }
    system?: {
      cpu_temp_c?: number
      cpu_load_1m?: number
      mem_used_mb?: number
      mem_total_mb?: number
    }
    available_interfaces?: Array<{ name: string; ip: string; mac: string }>
    available_capture_devices?: Array<{ path: string; name: string }>
    uptime_secs?: number
  }
}

export interface SystemInfo {
  cpu_temp_c?: number
  cpu_load_1m?: number
  mem_used_mb?: number
  mem_total_mb?: number
  disk_used_mb?: number
  disk_total_mb?: number
  uptime_secs?: number
}

export interface NodeConfig {
  [key: string]: unknown
}

export interface DecimatorStatus {
  connected?: boolean
  serial?: string
  firmware_major?: number
  firmware_minor?: number
  input1?: { name: string; locked: boolean; format: string }
  input2?: { name: string; locked: boolean; format: string }
  sdi_out_source?: string
  hdmi_out_source?: string
  duc_format?: string
  duc_format_id?: number
  duc_source?: string
  genlock?: string
  loop_enable?: boolean
  out_3g_b?: boolean
  hdmi_audio_pairs?: number[]
  sdi_audio_pairs?: number[]
  [key: string]: unknown
}

export interface DecimatorSettings {
  duc_format?: number
  sdi_source?: number
  hdmi_source?: number
  hdmi_type?: number
  duc_source?: number
  genlock?: number
  loop_enable?: boolean
}

// ─── ATEM types ────────────────────────────────────────────────────────────────

export interface AtemConnection {
  connected: boolean
  atem_ip?: string
  panel_ip?: string
}

export interface AtemMeState {
  program_source?: number
  preview_source?: number
  transition?: { style?: number; position?: number }
  keyers?: AtemKeyer[]
}

export interface AtemKeyer {
  on_air?: boolean
  key_type?: number
  fill_source?: number
  cut_source?: number
}

export interface AtemInput {
  id: number
  long_name?: string
  short_name?: string
}

export interface AtemState {
  inputs?: Record<string, AtemInput>
  mes?: AtemMeState[]
  tally?: Record<string, { program: boolean; preview: boolean }>
  [key: string]: unknown
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> ?? {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(path, { ...init, headers })

  if (res.status === 401) {
    redirectToLogin()
    throw new Error('Unauthorized')
  }

  return res
}

// ─── Node list ─────────────────────────────────────────────────────────────────

export async function fetchNodes(): Promise<NodeSummary[]> {
  const res = await apiFetch('/api/portal/nodes')
  if (!res.ok) throw new Error(`fetchNodes: ${res.status}`)
  return res.json()
}

export async function fetchNodeStatus(nodeId: string): Promise<{ id: string; name: string; model: string; status: DeviceStatus | null }> {
  const res = await apiFetch(`/api/portal/nodes/${nodeId}/status`)
  if (!res.ok) throw new Error(`fetchNodeStatus: ${res.status}`)
  return res.json()
}

// ─── Proxy helpers ─────────────────────────────────────────────────────────────

function proxyUrl(nodeId: string, path: string, port?: number): string {
  const base = `/api/portal/nodes/${nodeId}/proxy${path}`
  return port ? `${base}?port=${port}` : base
}

export async function nodeGet<T = unknown>(nodeId: string, path: string): Promise<T> {
  const res = await apiFetch(proxyUrl(nodeId, path))
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`)
  return res.json()
}

export async function nodePost<T = unknown>(nodeId: string, path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(proxyUrl(nodeId, path), {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`POST ${path}: ${res.status}`)
  return res.json()
}

export async function nodeGetAtem<T = unknown>(nodeId: string, path: string): Promise<T> {
  const res = await apiFetch(proxyUrl(nodeId, path, 9000))
  if (!res.ok) throw new Error(`GET ${path} (atem): ${res.status}`)
  return res.json()
}

export async function nodePostAtem<T = unknown>(nodeId: string, path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(proxyUrl(nodeId, path, 9000), {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`POST ${path} (atem): ${res.status}`)
  return res.json()
}

// ─── Status ────────────────────────────────────────────────────────────────────

export const getStatus = (id: string) => nodeGet<DeviceStatus>(id, '/api/status')
export const getSystemInfo = (id: string) => nodeGet<SystemInfo>(id, '/api/system/info')

// ─── Config ────────────────────────────────────────────────────────────────────

export const getConfig = (id: string) => nodeGet<NodeConfig>(id, '/api/config')
export const postConfig = (id: string, config: NodeConfig) => nodePost(id, '/api/config', config)
export const restartService = (id: string) => nodePost(id, '/api/restart')

// ─── Mode / Pipeline ──────────────────────────────────────────────────────────

export const getMode = (id: string) => nodeGet<{ mode: string }>(id, '/api/mode')
export const setMode = (id: string, mode: string) => nodePost(id, '/api/mode', { mode })
export const holdPipeline = (id: string) => nodePost(id, '/api/pipeline/hold')
export const resumePipeline = (id: string) => nodePost(id, '/api/pipeline/resume')

// ─── Display ──────────────────────────────────────────────────────────────────

// mode: 0=off, 1-8=pattern, 9=cycle
export const setStress = (id: string, mode: number) => nodePost(id, '/api/display/stress', { mode })
export const setDevMode = (id: string, on: boolean) => nodePost(id, '/api/display/dev-mode', { enabled: on })
export const setBootMenu = (id: string) => nodePost(id, '/api/display/boot-menu')

// ─── Firmware ─────────────────────────────────────────────────────────────────

export const applyFirmware = (id: string) => nodePost(id, '/api/firmware/apply')

// ─── Scope ────────────────────────────────────────────────────────────────────

export const setScopeView = (id: string, view: string) => nodePost(id, '/api/scope/view', { mode: view })
export const setScopeBrightness = (id: string, value: number) => nodePost(id, '/api/scope/brightness', { value })
export const quitScope = (id: string) => nodePost(id, '/api/scope/quit')

// ─── Decimator ────────────────────────────────────────────────────────────────

export const getDecimatorStatus = (id: string) => nodeGet<DecimatorStatus>(id, '/api/decimator/status')
export const postDecimatorSettings = (id: string, settings: DecimatorSettings) =>
  nodePost(id, '/api/decimator/settings', settings)
export const postDecimatorAudio = (id: string, pair: number, value: number) =>
  nodePost(id, '/api/decimator/audio', { pair, value })
export const setDecimatorFlip = (id: string, enabled: boolean) =>
  nodePost(id, '/api/decimator/flip', { enabled })

// ─── System ───────────────────────────────────────────────────────────────────

export const rebootNode = (id: string) => nodePost(id, '/api/system/reboot')
export const restartSystemService = (id: string, service: string) =>
  nodePost(id, '/api/system/restart-service', { service })

// ─── Adoption ─────────────────────────────────────────────────────────────────

export const getAdoptionCode = (id: string) => nodeGet<{ code: string }>(id, '/api/adoption')
export const regenerateAdoptionCode = (id: string) => nodePost<{ ok: boolean; code: string }>(id, '/api/adoption/regenerate')

// ─── ATEM REMI (port 9000) ────────────────────────────────────────────────────

export const getAtemConnection = (id: string) => nodeGetAtem<AtemConnection>(id, '/api/connection')
export const getAtemState = (id: string) => nodeGetAtem<AtemState>(id, '/api/state')
export const getAtemMe = (id: string, me: number) => nodeGetAtem<AtemMeState>(id, `/api/state/me/${me}`)
export const getAtemTally = (id: string) => nodeGetAtem<Record<string, { program: boolean; preview: boolean }>>(id, '/api/state/tally')

export const setAtemProgram = (id: string, me: number, source: number) =>
  nodePostAtem(id, '/api/program', { me, source })
export const setAtemPreview = (id: string, me: number, source: number) =>
  nodePostAtem(id, '/api/preview', { me, source })
export const atemCut = (id: string, me: number) => nodePostAtem(id, '/api/cut', { me })
export const atemAuto = (id: string, me: number) => nodePostAtem(id, '/api/auto', { me })
export const atemFtb = (id: string, me: number) => nodePostAtem(id, '/api/ftb', { me })
export const setUskOnAir = (id: string, me: number, keyer: number, on_air: boolean) =>
  nodePostAtem(id, '/api/usk/on-air', { me, keyer, on_air })
