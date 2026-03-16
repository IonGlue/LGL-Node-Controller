import { useState } from 'react'
import { setScopeView, setScopeBrightness, quitScope } from '../../api.ts'

const VIEWS = ['waveform', 'vectorscope', 'histogram', 'parade'] as const

export default function ScopeTab({ nodeId }: { nodeId: string }) {
  const [activeView, setActiveView] = useState<string | null>(null)
  const [brightness, setBrightness] = useState(80)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function wrap<T>(fn: () => Promise<T>, label: string) {
    return async () => {
      setBusy(true)
      setOk(null)
      setError(null)
      try {
        await fn()
        setOk(label)
      } catch (e) {
        setError(String(e))
      } finally {
        setBusy(false)
      }
    }
  }

  async function handleView(view: string) {
    setBusy(true)
    setOk(null)
    setError(null)
    try {
      await setScopeView(nodeId, view)
      setActiveView(view)
      setOk(`View set to ${view}.`)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleBrightness(val: number) {
    setBrightness(val)
    try {
      await setScopeBrightness(nodeId, val)
    } catch {
      // ignore slider noise errors
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
        View Mode
      </h3>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
        {VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => handleView(v)}
            disabled={busy}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: '1px solid',
              borderColor: activeView === v ? '#8b5cf6' : '#2a2a3a',
              background: activeView === v ? '#2d1f4e' : '#1a1a24',
              color: activeView === v ? '#c4b5fd' : '#9999b0',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {v}
          </button>
        ))}
      </div>

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
        Brightness
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <input
          type="range"
          min={0}
          max={100}
          value={brightness}
          onChange={(e) => handleBrightness(Number(e.target.value))}
          style={{ flex: 1, accentColor: '#8b5cf6' }}
        />
        <span style={{ fontFamily: 'monospace', fontSize: 14, width: 36, textAlign: 'right' }}>
          {brightness}%
        </span>
      </div>

      <button
        onClick={wrap(() => quitScope(nodeId), 'Scope quit.')}
        disabled={busy}
        style={{
          background: '#2a2a3a',
          border: 'none',
          borderRadius: 6,
          color: '#e2e2e8',
          fontSize: 13,
          fontWeight: 600,
          padding: '8px 18px',
          cursor: 'pointer',
        }}
      >
        Quit Scope
      </button>

      {error && <div style={{ color: '#f87171', fontSize: 13, marginTop: 12 }}>{error}</div>}
      {ok && <div style={{ color: '#10b981', fontSize: 13, marginTop: 12 }}>{ok}</div>}
    </div>
  )
}
