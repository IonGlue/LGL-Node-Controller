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
  mode?: string
  temperature?: number
  cpu_percent?: number
  uptime_secs?: number
  [key: string]: unknown
}

export interface SystemInfo {
  hostname?: string
  version?: string
  uptime_secs?: number
  [key: string]: unknown
}

export interface NodeConfig {
  [key: string]: unknown
}

export interface DecimatorStatus {
  locked?: boolean
  input?: string
  output?: string
  [key: string]: unknown
}

export interface DecimatorSettings {
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

function proxyUrl(nodeId: string, path: string): string {
  return `/api/portal/nodes/${nodeId}/proxy${path}`
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

// ─── Status ────────────────────────────────────────────────────────────────────

export const getStatus = (id: string) => nodeGet<DeviceStatus>(id, '/api/status')
export const getSystemInfo = (id: string) => nodeGet<SystemInfo>(id, '/api/system/info')

// ─── Config ────────────────────────────────────────────────────────────────────

export const getConfig = (id: string) => nodeGet<NodeConfig>(id, '/api/config')
export const postConfig = (id: string, config: NodeConfig) => nodePost(id, '/api/config', config)
export const restartService = (id: string) => nodePost(id, '/api/restart')

// ─── Display ──────────────────────────────────────────────────────────────────

export const setMode = (id: string, mode: string) => nodePost(id, '/api/mode', { mode })
export const setStress = (id: string, on: boolean) => nodePost(id, '/api/display/stress', { enabled: on })
export const setDevMode = (id: string, on: boolean) => nodePost(id, '/api/display/dev-mode', { enabled: on })
export const setBootMenu = (id: string, on: boolean) => nodePost(id, '/api/display/boot-menu', { enabled: on })

// ─── Scope ────────────────────────────────────────────────────────────────────

export const setScopeView = (id: string, view: string) => nodePost(id, '/api/scope/view', { view })
export const setScopeBrightness = (id: string, level: number) => nodePost(id, '/api/scope/brightness', { level })
export const quitScope = (id: string) => nodePost(id, '/api/scope/quit')

// ─── Decimator ────────────────────────────────────────────────────────────────

export const getDecimatorStatus = (id: string) => nodeGet<DecimatorStatus>(id, '/api/decimator/status')
export const postDecimatorSettings = (id: string, settings: DecimatorSettings) =>
  nodePost(id, '/api/decimator/settings', settings)
export const postDecimatorAudio = (id: string, routing: unknown) =>
  nodePost(id, '/api/decimator/audio', routing)
export const flipDeciItem = (id: string, item: string) => nodePost(id, '/api/decimator/flipatem', { item })

// ─── System ───────────────────────────────────────────────────────────────────

export const rebootNode = (id: string) => nodePost(id, '/api/system/reboot')
export const restartSystemService = (id: string, service: string) =>
  nodePost(id, '/api/system/restart-service', { service })
