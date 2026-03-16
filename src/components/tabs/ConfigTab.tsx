import { useEffect, useState } from 'react'
import { getConfig, postConfig, restartService } from '../../api.ts'

export default function ConfigTab({ nodeId }: { nodeId: string }) {
  const [raw, setRaw] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  useEffect(() => {
    getConfig(nodeId)
      .then((cfg) => {
        setRaw(JSON.stringify(cfg, null, 2))
        setLoading(false)
      })
      .catch((e) => {
        setError(String(e))
        setLoading(false)
      })
  }, [nodeId])

  async function handleApply() {
    setError(null)
    setOk(null)
    setSaving(true)
    try {
      const parsed = JSON.parse(raw)
      await postConfig(nodeId, parsed)
      setOk('Config applied.')
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleRestart() {
    setError(null)
    setOk(null)
    setRestarting(true)
    try {
      await restartService(nodeId)
      setOk('Service restart requested.')
    } catch (e) {
      setError(String(e))
    } finally {
      setRestarting(false)
    }
  }

  if (loading) return <div style={{ color: '#6b6b7f', fontSize: 14 }}>Loading…</div>

  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#6b6b7f', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        JSON Config
      </h3>

      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        spellCheck={false}
        style={{
          width: '100%',
          height: 320,
          background: '#0f0f14',
          color: '#c9d1d9',
          border: '1px solid #2a2a3a',
          borderRadius: 6,
          fontFamily: 'monospace',
          fontSize: 13,
          padding: 14,
          resize: 'vertical',
          outline: 'none',
        }}
      />

      {error && <div style={{ color: '#f87171', fontSize: 13, marginTop: 8 }}>{error}</div>}
      {ok && <div style={{ color: '#10b981', fontSize: 13, marginTop: 8 }}>{ok}</div>}

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button onClick={handleApply} disabled={saving} style={btnStyle('#8b5cf6')}>
          {saving ? 'Applying…' : 'Apply Config'}
        </button>
        <button onClick={handleRestart} disabled={restarting} style={btnStyle('#374151')}>
          {restarting ? 'Restarting…' : 'Restart Service'}
        </button>
      </div>
    </div>
  )
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    border: 'none',
    borderRadius: 6,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 18px',
    cursor: 'pointer',
  }
}
