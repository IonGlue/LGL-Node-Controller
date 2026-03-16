import { useEffect, useState } from 'react'
import { getStatus, getSystemInfo, type DeviceStatus, type SystemInfo } from '../../api.ts'

function Row({ label, value }: { label: string; value: unknown }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '9px 0',
        borderBottom: '1px solid #1e1e2a',
        fontSize: 13,
      }}
    >
      <span style={{ color: '#8b8ba0' }}>{label}</span>
      <span style={{ fontFamily: 'monospace', color: '#e2e2e8' }}>{String(value ?? '—')}</span>
    </div>
  )
}

export default function StatusTab({ nodeId }: { nodeId: string }) {
  const [status, setStatus] = useState<DeviceStatus | null>(null)
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      const [s, i] = await Promise.all([getStatus(nodeId), getSystemInfo(nodeId)])
      setStatus(s)
      setInfo(i)
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [nodeId])

  if (error) return <div style={{ color: '#f87171', fontSize: 14 }}>{error}</div>

  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#6b6b7f', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        Telemetry
      </h3>
      {status ? (
        <>
          {Object.entries(status).map(([k, v]) => (
            <Row key={k} label={k} value={v} />
          ))}
        </>
      ) : (
        <div style={{ color: '#6b6b7f', fontSize: 13 }}>Loading…</div>
      )}

      {info && (
        <>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#6b6b7f',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginTop: 24,
              marginBottom: 12,
            }}
          >
            System Info
          </h3>
          {Object.entries(info).map(([k, v]) => (
            <Row key={k} label={k} value={v} />
          ))}
        </>
      )}
    </div>
  )
}
