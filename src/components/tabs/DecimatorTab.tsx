import { useEffect, useState } from 'react'
import { getDecimatorStatus, postDecimatorSettings, postDecimatorAudio, flipDeciItem, type DecimatorStatus } from '../../api.ts'

const CHANNELS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function DecimatorTab({ nodeId }: { nodeId: string }) {
  const [status, setStatus] = useState<DecimatorStatus | null>(null)
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [audioMatrix, setAudioMatrix] = useState<Record<number, number>>(
    Object.fromEntries(CHANNELS.map((c) => [c, c])),
  )
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDecimatorStatus(nodeId)
      .then(setStatus)
      .catch(() => setStatus(null))
  }, [nodeId])

  async function handleSaveSettings() {
    setBusy(true)
    setOk(null)
    setError(null)
    try {
      await postDecimatorSettings(nodeId, settings)
      setOk('Settings saved.')
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveAudio() {
    setBusy(true)
    setOk(null)
    setError(null)
    try {
      await postDecimatorAudio(nodeId, audioMatrix)
      setOk('Audio routing saved.')
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleFlip(item: string) {
    try {
      await flipDeciItem(nodeId, item)
    } catch {
      // ignore
    }
  }

  return (
    <div>
      {/* Status */}
      <h3 style={sectionHeader}>Status</h3>
      {status ? (
        <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          {Object.entries(status).map(([k, v]) => (
            <div key={k} style={badge}>
              <span style={{ color: '#6b6b7f', marginRight: 6 }}>{k}</span>
              <span style={{ fontFamily: 'monospace' }}>{String(v)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: '#6b6b7f', fontSize: 13, marginBottom: 20 }}>No status available.</div>
      )}

      {/* Settings */}
      <h3 style={sectionHeader}>Settings</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {['resolution', 'framerate', 'output_format'].map((field) => (
          <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ fontSize: 13, color: '#8b8ba0', width: 120 }}>{field}</label>
            <input
              value={settings[field] ?? ''}
              onChange={(e) => setSettings({ ...settings, [field]: e.target.value })}
              style={inputStyle}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <button onClick={handleSaveSettings} disabled={busy} style={btn('#8b5cf6')}>
          {busy ? 'Saving…' : 'Save Settings'}
        </button>
        <button onClick={() => handleFlip('atem')} style={btn('#374151')}>
          Flip ATEM
        </button>
      </div>

      {/* 12-channel audio routing matrix */}
      <h3 style={sectionHeader}>Audio Routing (12 ch)</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          marginBottom: 20,
        }}
      >
        {CHANNELS.map((ch) => (
          <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#6b6b7f', width: 28 }}>Ch {ch}</span>
            <select
              value={audioMatrix[ch]}
              onChange={(e) => setAudioMatrix({ ...audioMatrix, [ch]: Number(e.target.value) })}
              style={{ ...inputStyle, padding: '4px 6px', flex: 1 }}
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <button onClick={handleSaveAudio} disabled={busy} style={btn('#8b5cf6')}>
        Save Audio Routing
      </button>

      {error && <div style={{ color: '#f87171', fontSize: 13, marginTop: 12 }}>{error}</div>}
      {ok && <div style={{ color: '#10b981', fontSize: 13, marginTop: 12 }}>{ok}</div>}
    </div>
  )
}

const sectionHeader: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#6b6b7f',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 12,
}

const badge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  fontSize: 13,
  background: '#1a1a24',
  border: '1px solid #2a2a3a',
  borderRadius: 6,
  padding: '6px 12px',
}

const inputStyle: React.CSSProperties = {
  background: '#1a1a24',
  border: '1px solid #2a2a3a',
  borderRadius: 6,
  color: '#e2e2e8',
  fontSize: 13,
  padding: '6px 10px',
  outline: 'none',
  flex: 1,
}

function btn(bg: string): React.CSSProperties {
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
