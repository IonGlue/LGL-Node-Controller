import { useEffect, useState } from 'react'
import {
  getDecimatorStatus,
  postDecimatorSettings,
  postDecimatorAudio,
  setDecimatorFlip,
  type DecimatorStatus,
  type DecimatorSettings,
} from '../../api.ts'

// SDI/HDMI output source options
const SOURCE_OPTIONS = [
  { value: 0, label: 'SDI' },
  { value: 1, label: 'HDMI' },
  { value: 2, label: 'DUC' },
]

const DUC_SOURCE_OPTIONS = [
  { value: 0, label: 'SDI' },
  { value: 1, label: 'HDMI' },
]

const GENLOCK_OPTIONS = [
  { value: 0, label: 'Free Run' },
  { value: 1, label: 'SDI' },
  { value: 2, label: 'HDMI' },
]

// Pair 0-3 = HDMI out, 4-11 = SDI out
const HDMI_PAIRS = Array.from({ length: 4 }, (_, i) => i)
const SDI_PAIRS = Array.from({ length: 8 }, (_, i) => i + 4)
const AUDIO_SOURCE_OPTIONS = [
  ...Array.from({ length: 8 }, (_, i) => ({ value: i, label: `Group ${i}` })),
  { value: 15, label: 'OFF' },
]

export default function DecimatorTab({ nodeId }: { nodeId: string }) {
  const [status, setStatus] = useState<DecimatorStatus | null>(null)
  const [settings, setSettings] = useState<DecimatorSettings>({})
  const [flipEnabled, setFlipEnabled] = useState(false)
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

  async function handleAudioPair(pair: number, value: number) {
    try {
      await postDecimatorAudio(nodeId, pair, value)
    } catch {
      // ignore individual pair errors
    }
  }

  async function handleFlip(enabled: boolean) {
    try {
      await setDecimatorFlip(nodeId, enabled)
      setFlipEnabled(enabled)
    } catch {
      // ignore
    }
  }

  return (
    <div>
      {/* Status */}
      <h3 style={sectionHeader}>Status</h3>
      {status ? (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={badge}>
              <span style={{ color: '#6b6b7f', marginRight: 6 }}>Connected</span>
              <span style={{ fontFamily: 'monospace', color: status.connected ? '#22c55e' : '#ef4444' }}>
                {status.connected ? 'Yes' : 'No'}
              </span>
            </div>
            {status.serial && (
              <div style={badge}>
                <span style={{ color: '#6b6b7f', marginRight: 6 }}>Serial</span>
                <span style={{ fontFamily: 'monospace' }}>{status.serial}</span>
              </div>
            )}
            {status.firmware_major != null && (
              <div style={badge}>
                <span style={{ color: '#6b6b7f', marginRight: 6 }}>Firmware</span>
                <span style={{ fontFamily: 'monospace' }}>{status.firmware_major}.{status.firmware_minor}</span>
              </div>
            )}
          </div>
          {(status.input1 || status.input2) && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              {status.input1 && (
                <div style={{ ...badge, gap: 8 }}>
                  <span style={{ color: '#6b6b7f' }}>SDI IN</span>
                  <span style={{ fontFamily: 'monospace', color: status.input1.locked ? '#22c55e' : '#6b6b7f' }}>
                    {status.input1.locked ? status.input1.format : 'No Lock'}
                  </span>
                </div>
              )}
              {status.input2 && (
                <div style={{ ...badge, gap: 8 }}>
                  <span style={{ color: '#6b6b7f' }}>HDMI IN</span>
                  <span style={{ fontFamily: 'monospace', color: status.input2.locked ? '#22c55e' : '#6b6b7f' }}>
                    {status.input2.locked ? status.input2.format : 'No Lock'}
                  </span>
                </div>
              )}
              {status.duc_format && (
                <div style={badge}>
                  <span style={{ color: '#6b6b7f', marginRight: 6 }}>DUC Out</span>
                  <span style={{ fontFamily: 'monospace' }}>{status.duc_format}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ color: '#6b6b7f', fontSize: 13, marginBottom: 20 }}>No device found (503 = not connected).</div>
      )}

      {/* Settings */}
      <h3 style={sectionHeader}>Output Routing</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <SelectField
          label="SDI Out Source"
          options={SOURCE_OPTIONS}
          value={settings.sdi_source ?? ''}
          onChange={(v) => setSettings({ ...settings, sdi_source: Number(v) })}
        />
        <SelectField
          label="HDMI Out Source"
          options={SOURCE_OPTIONS}
          value={settings.hdmi_source ?? ''}
          onChange={(v) => setSettings({ ...settings, hdmi_source: Number(v) })}
        />
        <SelectField
          label="DUC Scaler Input"
          options={DUC_SOURCE_OPTIONS}
          value={settings.duc_source ?? ''}
          onChange={(v) => setSettings({ ...settings, duc_source: Number(v) })}
        />
        <SelectField
          label="Genlock"
          options={GENLOCK_OPTIONS}
          value={settings.genlock ?? ''}
          onChange={(v) => setSettings({ ...settings, genlock: Number(v) })}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 13, color: '#8b8ba0' }}>DUC Format ID</label>
          <input
            type="number"
            value={settings.duc_format ?? ''}
            onChange={(e) => setSettings({ ...settings, duc_format: Number(e.target.value) })}
            style={{ ...inputStyle, width: 70 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 13, color: '#8b8ba0' }}>SDI Loop-through</label>
          <input
            type="checkbox"
            checked={settings.loop_enable ?? false}
            onChange={(e) => setSettings({ ...settings, loop_enable: e.target.checked })}
            style={{ accentColor: '#8b5cf6', width: 16, height: 16 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <button onClick={handleSaveSettings} disabled={busy} style={btn('#8b5cf6')}>
          {busy ? 'Saving…' : 'Save Settings'}
        </button>
        <button
          onClick={() => handleFlip(!flipEnabled)}
          style={{ ...btn(flipEnabled ? '#4a3f7a' : '#374151'), border: '1px solid', borderColor: flipEnabled ? '#8b5cf6' : 'transparent' }}
        >
          {flipEnabled ? 'Flip: On' : 'Flip: Off'}
        </button>
      </div>

      {/* Audio routing */}
      <h3 style={sectionHeader}>Audio Routing — HDMI Out (pairs 0–3)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        {HDMI_PAIRS.map((pair) => (
          <AudioPairSelect key={pair} pair={pair} label={`Pair ${pair}`} onChange={handleAudioPair} />
        ))}
      </div>

      <h3 style={sectionHeader}>Audio Routing — SDI Out (pairs 4–11)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        {SDI_PAIRS.map((pair) => (
          <AudioPairSelect key={pair} pair={pair} label={`Pair ${pair}`} onChange={handleAudioPair} />
        ))}
      </div>

      {error && <div style={{ color: '#f87171', fontSize: 13, marginTop: 12 }}>{error}</div>}
      {ok && <div style={{ color: '#10b981', fontSize: 13, marginTop: 12 }}>{ok}</div>}
    </div>
  )
}

function SelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: number; label: string }[]
  value: number | string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <label style={{ fontSize: 13, color: '#8b8ba0', minWidth: 110 }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function AudioPairSelect({
  pair,
  label,
  onChange,
}: {
  pair: number
  label: string
  onChange: (pair: number, value: number) => void
}) {
  const [value, setValue] = useState(0)

  function handle(v: number) {
    setValue(v)
    onChange(pair, v)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: '#6b6b7f' }}>{label}</span>
      <select
        value={value}
        onChange={(e) => handle(Number(e.target.value))}
        style={{ ...inputStyle, padding: '4px 6px' }}
      >
        {AUDIO_SOURCE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
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
