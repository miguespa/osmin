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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7.5 1.6a4 4 0 00-4 4v2.2L2.3 10.3h10.4L11.5 7.8V5.6a4 4 0 00-4-4z" />
              <path d="M6.1 12.2a1.5 1.5 0 002.8 0" />
            </svg>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>
              Recordatorio diario
            </div>
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.45 }}>
            Un aviso a tu hora para cerrar el día antes de que se te pase.
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

      {!reminder.enabled && (
        <div style={{ marginTop: 14, padding: '11px 12px', background: 'var(--surface-alt)', border: '1px solid var(--line-soft)', borderRadius: 9 }}>
          <span style={{ display: 'inline-block', fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, fontWeight: 600, letterSpacing: '.05em', color: 'var(--accent)', background: 'rgba(201,122,42,.12)', border: '1px solid rgba(201,122,42,.28)', borderRadius: 5, padding: '2px 8px' }}>
            LO QUE MÁS AYUDA
          </span>
          <p style={{ margin: '9px 0 0', fontFamily: 'Inter, sans-serif', fontSize: 11.5, color: 'var(--text-soft)', lineHeight: 1.5 }}>
            Ponerle hora a un hábito es lo que separa proponérselo de hacerlo.
            Elige la tuya y deja de depender de acordarte.
          </p>
        </div>
      )}

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
