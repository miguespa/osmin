import { useState } from 'react'
import { applyReminder, readReminder, type Reminder } from '../lib/reminder'

/**
 * Ajuste del recordatorio diario, dentro del panel de cuenta. Solo se pinta en
 * el binario nativo: quien decide si se muestra es AccountPanel.
 */
export default function DailyReminderCard() {
  const [reminder, setReminder] = useState<Reminder>(readReminder)
  const [busy, setBusy] = useState(false)
  const [denied, setDenied] = useState(false)
  const [failed, setFailed] = useState(false)

  const update = async (next: Reminder) => {
    setBusy(true)
    setFailed(false)
    // El interruptor no se mueve hasta que responde el sistema. La primera vez
    // iOS abre su diálogo de permiso y se queda esperando: pintarlo encendido
    // antes prometería un aviso que quizá nunca llegue a programarse.
    try {
      const applied = await applyReminder(next)
      setReminder(applied)
      setDenied(next.enabled && !applied.enabled)
    } catch (err) {
      // Sin esto el interruptor se quedaría encendido prometiendo un aviso que
      // el sistema nunca llegó a aceptar.
      console.error('[Osmin] no se pudo programar el recordatorio:', err)
      setReminder(readReminder())
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>
            Recordatorio diario
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.45 }}>
            Un aviso en el móvil para no dejar el día sin anotar.
          </div>
        </div>

        <button
          role="switch"
          aria-checked={reminder.enabled}
          aria-label="Recordatorio diario"
          disabled={busy}
          onClick={() => update({ ...reminder, enabled: !reminder.enabled })}
          style={{
            flexShrink: 0,
            width: 44,
            height: 26,
            padding: 3,
            border: 'none',
            borderRadius: 13,
            cursor: busy ? 'wait' : 'pointer',
            background: reminder.enabled ? 'var(--accent)' : 'var(--line-strong)',
            transition: 'background 160ms',
            display: 'flex',
            justifyContent: reminder.enabled ? 'flex-end' : 'flex-start',
          }}
        >
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'all 160ms' }} />
        </button>
      </div>

      {reminder.enabled && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
          <label htmlFor="osmin-reminder-time" style={{ fontFamily: 'Inter, sans-serif', fontSize: 12.5, color: 'var(--text)' }}>
            Hora
          </label>
          <input
            id="osmin-reminder-time"
            type="time"
            value={reminder.time}
            disabled={busy}
            onChange={e => update({ ...reminder, time: e.target.value })}
            style={{
              padding: '7px 10px',
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: 'var(--surface-alt)',
              color: 'var(--text)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 13,
            }}
          />
        </div>
      )}

      {failed && (
        <div style={{ marginTop: 14, fontFamily: 'Inter, sans-serif', fontSize: 11.5, color: '#E05252', lineHeight: 1.45 }}>
          No se ha podido programar el recordatorio. Inténtalo de nuevo.
        </div>
      )}

      {denied && (
        <div style={{ marginTop: 14, fontFamily: 'Inter, sans-serif', fontSize: 11.5, color: '#E05252', lineHeight: 1.45 }}>
          iOS tiene bloqueadas las notificaciones de Osmin. Se activan en Ajustes → Osmin → Notificaciones.
        </div>
      )}
    </div>
  )
}
