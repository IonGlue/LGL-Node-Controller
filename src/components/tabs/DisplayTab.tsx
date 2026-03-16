import { useState } from 'react'
import { setMode, setStress, setDevMode, setBootMenu } from '../../api.ts'

const MODES = ['encoder', 'scope', 'decimator'] as const

function Toggle({
  label,
  onToggle,
}: {
  label: string
  onToggle: (on: boolean) => Promise<void>
}) {
  const [active, setActive] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handle() {
    setBusy(true)
    try {
      const next = !active
      await onToggle(next)
      setActive(next)
    } catch {
      // ignore
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px solid #1e1e2a',
        fontSize: 14,
      }}
    >
      <span>{label}</span>
      <button
        onClick={handle}
        disabled={busy}
        style={{
          background: active ? '#8b5cf6' : '#2a2a3a',
          border: 'none',
          borderRadius: 14,
          width: 44,
          height: 24,
          cursor: 'pointer',
          position: 'relative',
          transition: 'background .2s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: active ? 22 : 3,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left .2s',
          }}
        />
      </button>
    </div>
  )
}

export default function DisplayTab({ nodeId }: { nodeId: string }) {
  const [activeMode, setActiveMode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleMode(mode: string) {
    setBusy(true)
    setOk(null)
    setError(null)
    try {
      await setMode(nodeId, mode)
      setActiveMode(mode)
      setOk(`Mode set to ${mode}.`)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h3
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#6b6b7f',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 12,
        }}
      >
        Mode
      </h3>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => handleMode(m)}
            disabled={busy}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 8,
              border: '1px solid',
              borderColor: activeMode === m ? '#8b5cf6' : '#2a2a3a',
              background: activeMode === m ? '#2d1f4e' : '#1a1a24',
              color: activeMode === m ? '#c4b5fd' : '#9999b0',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {ok && <div style={{ color: '#10b981', fontSize: 13, marginBottom: 12 }}>{ok}</div>}

      <h3
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#6b6b7f',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 8,
        }}
      >
        Overlays & Test Patterns
      </h3>

      <Toggle label="Stress test pattern" onToggle={(on) => setStress(nodeId, on)} />
      <Toggle label="Developer mode overlay" onToggle={(on) => setDevMode(nodeId, on)} />
      <Toggle label="Boot menu on next restart" onToggle={(on) => setBootMenu(nodeId, on)} />
    </div>
  )
}
