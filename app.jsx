// app.jsx — Osmin app shell + stats + month milestones

const { useState, useMemo, useEffect, useRef } = React;

// ── Persistence ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'osmin_v1';

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Basic sanity check
    if (!Array.isArray(parsed.months) || parsed.months.length === 0) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // Storage full or unavailable — fail silently
  }
}

function Logo() {
  return (
    <img
      src="logo.png"
      alt="Osmin"
      style={{
        height: 26,
        width: 'auto',
        display: 'block',
        filter: 'brightness(0) invert(1) opacity(0.88)',
      }}
    />
  );
}

function TrafficLights() {
  const dot = (c) => (
    <div style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
  );
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {dot('#ff5f57')}{dot('#febc2e')}{dot('#28c840')}
    </div>
  );
}

function NewMonthPicker({ suggested, months, onConfirm, onCancel }) {
  const [year, setYear] = React.useState(suggested.year);
  const [monthIdx, setMonthIdx] = React.useState(suggested.month);

  return (
    <div style={{
      margin: '4px 0',
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* year stepper */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px',
        borderBottom: '1px solid var(--line-soft)',
      }}>
        <button
          onClick={() => setYear(y => y - 1)}
          style={{
            width: 22, height: 22, borderRadius: 6,
            border: '1px solid var(--line)', background: 'var(--surface-alt)',
            color: 'var(--text-soft)', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, lineHeight: 1,
          }}
        >‹</button>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600,
          color: 'var(--text)', fontVariantNumeric: 'tabular-nums',
        }}>{year}</span>
        <button
          onClick={() => setYear(y => y + 1)}
          style={{
            width: 22, height: 22, borderRadius: 6,
            border: '1px solid var(--line)', background: 'var(--surface-alt)',
            color: 'var(--text-soft)', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, lineHeight: 1,
          }}
        >›</button>
      </div>

      {/* month grid 4×3 */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 3, padding: '8px',
      }}>
        {MONTHS_ES.map((name, i) => {
          const sel = i === monthIdx;
          const alreadyExists = months.some(m => m.year === year && m.month === i);
          return (
            <button
              key={i}
              onClick={() => !alreadyExists && setMonthIdx(i)}
              title={alreadyExists ? 'Ya existe este mes' : name}
              style={{
                padding: '5px 2px', borderRadius: 6,
                border: sel ? '1.5px solid var(--accent)' : '1px solid transparent',
                background: sel ? `color-mix(in oklab, var(--accent) 14%, var(--surface))` : 'transparent',
                cursor: alreadyExists ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif', fontSize: 10.5, fontWeight: sel ? 600 : 500,
                color: alreadyExists ? 'var(--text-muted)' : sel ? 'var(--text)' : 'var(--text-soft)',
                opacity: alreadyExists ? 0.4 : 1,
                textAlign: 'center',
              }}
            >{name.slice(0, 3)}</button>
          );
        })}
      </div>

      {/* actions */}
      <div style={{
        display: 'flex', gap: 6, padding: '0 8px 8px',
      }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, height: 26, borderRadius: 7,
            border: '1px solid var(--line)', background: 'transparent',
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            fontSize: 11.5, fontWeight: 500, color: 'var(--text-muted)',
          }}
        >Cancelar</button>
        <button
          onClick={() => onConfirm(year, monthIdx)}
          style={{
            flex: 1, height: 26, borderRadius: 7,
            border: 'none', background: 'var(--accent)',
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            fontSize: 11.5, fontWeight: 600, color: '#fff',
          }}
        >Crear</button>
      </div>
    </div>
  );
}

function Sidebar({ months, activeIdx, setActiveIdx, addMonth, deleteMonth, view, setView, onOpenAccount }) {
  const [hoveredIdx, setHoveredIdx] = React.useState(null);
  const [picker, setPicker] = React.useState(null); // null | { year, month }
  const [showTip, setShowTip] = React.useState(() => !localStorage.getItem('osmin_tip_dismissed'));
  const month = months[activeIdx];
  const userEmail = React.useMemo(() => localStorage.getItem('osmin_user_email') || 'usuario', []);
  const userInitial = userEmail[0].toUpperCase();

  const dismissTip = () => {
    localStorage.setItem('osmin_tip_dismissed', '1');
    setShowTip(false);
  };

  const openPicker = () => {
    const last = months[months.length - 1];
    let m = last.month + 1, y = last.year;
    if (m > 11) { m = 0; y++; }
    // skip months that already exist
    while (months.some(mo => mo.year === y && mo.month === m)) {
      m++; if (m > 11) { m = 0; y++; }
    }
    setPicker({ year: y, month: m });
  };

  const item = (id, label, count) => {
    const sel = view === id;
    return (
      <button
        key={id}
        onClick={() => setView(id)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, padding: '6px 10px', borderRadius: 7,
          border: 'none', cursor: 'pointer', textAlign: 'left',
          background: sel ? 'var(--sidebar-sel)' : 'transparent',
          color: sel ? 'var(--text)' : 'var(--text-soft)',
          fontFamily: 'Inter, sans-serif', fontSize: 13,
          fontWeight: sel ? 600 : 500,
        }}
      >
        <span>{label}</span>
        {count !== undefined && (
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10.5, color: 'var(--text-muted)',
            fontVariantNumeric: 'tabular-nums',
          }}>{count}</span>
        )}
      </button>
    );
  };

  const sectionTitle = (t) => (
    <div style={{
      fontFamily: 'Inter, sans-serif', fontSize: 10.5, fontWeight: 600,
      color: 'var(--text-muted)', textTransform: 'uppercase',
      letterSpacing: '0.08em', padding: '14px 10px 6px',
    }}>{t}</div>
  );

  return (
    <aside style={{
      width: 224, flexShrink: 0,
      background: 'var(--sidebar)', borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column',
      padding: '0 10px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 10px 16px' }}>
        <TrafficLights />
        <Logo />
      </div>

      {sectionTitle('Vista')}
      {item('month', 'Mes actual')}
      {item('year', `Año ${month.year}`)}
      {item('habits', 'Hábitos', month.habits.length)}
      {item('stats', 'Estadísticas')}

      {sectionTitle('Meses')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {months.map((m, i) => {
          const sel = i === activeIdx;
          const hovered = hoveredIdx === i;
          return (
            <div
              key={`${m.year}-${m.month}`}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
            >
              <button
                onClick={() => setActiveIdx(i)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '5px 10px', paddingRight: hovered && months.length > 1 ? 30 : 10,
                  borderRadius: 7,
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: sel ? 'var(--sidebar-sel)' : 'transparent',
                  fontFamily: 'Inter, sans-serif', fontSize: 12.5,
                  color: sel ? 'var(--text)' : 'var(--text-soft)',
                  fontWeight: sel ? 600 : 500,
                }}
              >
                <span>{MONTHS_ES[m.month]} '{String(m.year).slice(2)}</span>
                {!hovered && (
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10, color: 'var(--text-muted)',
                  }}>{m.days.length}</span>
                )}
              </button>
              {hovered && months.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMonth(i); }}
                  title="Eliminar mes"
                  style={{
                    position: 'absolute', right: 8,
                    width: 18, height: 18, borderRadius: 5,
                    border: 'none', background: 'transparent',
                    cursor: 'pointer', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          );
        })}

        {picker ? (
          <NewMonthPicker
            suggested={picker}
            months={months}
            onConfirm={(y, m) => { addMonth(y, m); setPicker(null); }}
            onCancel={() => setPicker(null)}
          />
        ) : (
          <button
            onClick={openPicker}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 7, marginTop: 2,
              border: 'none', cursor: 'pointer', textAlign: 'left',
              background: 'transparent',
              fontFamily: 'Inter, sans-serif', fontSize: 12,
              color: 'var(--text-muted)', fontWeight: 500,
              width: '100%',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Nuevo mes
          </button>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {showTip && (
        <div style={{
          padding: '11px 12px',
          border: '1px solid var(--line)',
          borderRadius: 10,
          background: 'var(--surface)',
          fontFamily: 'Inter, sans-serif', fontSize: 11.5,
          color: 'var(--text-muted)', lineHeight: 1.45,
          position: 'relative',
          marginBottom: 8,
        }}>
          <button
            onClick={dismissTip}
            title="Cerrar"
            style={{
              position: 'absolute', top: 8, right: 8,
              width: 18, height: 18,
              border: 'none', background: 'transparent',
              cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', borderRadius: 4,
            }}
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1 1l7 7M8 1l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4, paddingRight: 18 }}>
            Tip
          </div>
          Click en un día para cambiar entre laborable, festivo y vacaciones.
        </div>
      )}

      <button
        onClick={onOpenAccount}
        style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '8px 10px', borderRadius: 9,
          border: '1px solid var(--line)',
          background: 'var(--surface)',
          cursor: 'pointer', width: '100%',
          transition: 'background 140ms, border-color 140ms',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--surface-alt)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--surface)';
          e.currentTarget.style.borderColor = 'var(--line)';
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #4ECDC4, #1F8A5B)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff',
        }}>
          {userInitial}
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div style={{
            fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500,
            color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {userEmail}
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, color: 'var(--text-muted)' }}>
            Acceso anticipado
          </div>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-muted)" strokeWidth="1.4" strokeLinecap="round">
          <path d="M4.5 2l4 4-4 4"/>
        </svg>
      </button>
    </aside>
  );
}

function MonthHeader({ month, layout, setLayout, onPrev, onNext, viewMode, setViewMode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: '24px 28px 18px',
      borderBottom: '1px solid var(--line)',
    }}>
      <div>
        <div style={{
          fontFamily: 'Inter, sans-serif', fontSize: 11.5, fontWeight: 600,
          color: 'var(--text-muted)', textTransform: 'uppercase',
          letterSpacing: '0.1em', marginBottom: 6,
        }}>
          Mes activo
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <button onClick={onPrev} className="month-nav">‹</button>
          <h1 style={{
            margin: 0,
            fontFamily: 'Instrument Serif, serif',
            fontWeight: 400, fontSize: 44, lineHeight: 1,
            color: 'var(--text)', letterSpacing: '-0.01em',
          }}>
            {MONTHS_ES[month.month]}
            <span style={{
              color: 'var(--text-muted)', marginLeft: 12,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 22,
              letterSpacing: 0,
            }}>'{String(month.year).slice(2)}</span>
          </h1>
          <button onClick={onNext} className="month-nav">›</button>
          <button
            onClick={() => setViewMode(viewMode === 'overview' ? 'month' : 'overview')}
            className="overview-btn"
            data-active={viewMode === 'overview'}
            title="Vista de highlights del mes"
          >
            <svg width="13" height="13" viewBox="0 0 14 14"
                 fill={viewMode === 'overview' ? 'var(--accent)' : 'none'}
                 stroke={viewMode === 'overview' ? 'var(--accent)' : 'currentColor'}
                 strokeWidth="1.5" strokeLinejoin="round">
              <path d="M7 1.5L8.7 5l3.8.5-2.8 2.6.7 3.8L7 10.1 3.6 12l.7-3.8L1.5 5.5 5.3 5z" />
            </svg>
            <span>Highlights</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center', visibility: viewMode === 'overview' ? 'hidden' : 'visible' }}>
        <Legend />
        <div style={{
          display: 'inline-flex', padding: 3,
          background: 'var(--surface-alt)',
          border: '1px solid var(--line)', borderRadius: 9,
        }}>
          {[
            { id: 'table',  label: 'Tabla' },
            { id: 'journal',label: 'Bitácora' },
          ].map(o => (
            <button
              key={o.id}
              onClick={() => setLayout(o.id)}
              style={{
                padding: '6px 14px',
                background: layout === o.id ? 'var(--surface)' : 'transparent',
                border: 'none', cursor: 'pointer',
                borderRadius: 7,
                fontFamily: 'Inter, sans-serif', fontSize: 12,
                fontWeight: layout === o.id ? 600 : 500,
                color: layout === o.id ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: layout === o.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >{o.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      fontFamily: 'Inter, sans-serif', fontSize: 11.5,
      color: 'var(--text-soft)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 12, height: 8, borderRadius: 2, background: 'var(--c-festivo)' }} />
        Festivo
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 12, height: 8, borderRadius: 2, background: 'var(--c-vacaciones)' }} />
        Vacaciones
      </div>
    </div>
  );
}

function StatTile({ habit, month }) {
  const stats = habitStats(month, habit);
  const streak = habitStreak(month, habit);
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: habit.color }} />
        <div style={{
          fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
          color: 'var(--text)', letterSpacing: '0.01em',
        }}>{habit.label}</div>
        <div style={{ flex: 1 }} />
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5,
          color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums',
        }}>
          {habit.type === 'numeric' ? `meta ${habit.goal.toLocaleString('es')}` : 'check'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{
          fontFamily: 'Instrument Serif, serif', fontSize: 32,
          lineHeight: 1, color: 'var(--text)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {habit.type === 'numeric' ? stats.avg.toLocaleString('es') : stats.done}
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          color: 'var(--text-muted)',
        }}>
          {habit.type === 'numeric' ? 'media/día' : `de ${stats.total}`}
        </div>
      </div>

      {/* progress bar */}
      <div style={{
        height: 4, borderRadius: 2,
        background: 'var(--line)', overflow: 'hidden',
      }}>
        <div style={{
          width: `${stats.pct}%`, height: '100%', background: habit.color,
        }} />
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5,
        color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums',
      }}>
        <span>{stats.pct}% cumplido</span>
        <span>racha {streak}d</span>
      </div>
    </div>
  );
}

function MilestonesStrip({ month }) {
  const ms = month.days.filter(d => d.milestone);
  if (ms.length === 0) return null;
  return (
    <div style={{
      background: 'var(--surface-alt)',
      border: '1px solid var(--line)',
      borderRadius: 12,
      padding: '12px 16px',
      display: 'flex', gap: 14, alignItems: 'center',
    }}>
      <div style={{
        fontFamily: 'Inter, sans-serif', fontSize: 10.5, fontWeight: 600,
        color: 'var(--text-muted)', textTransform: 'uppercase',
        letterSpacing: '0.08em', flexShrink: 0,
      }}>
        Hitos del mes
      </div>
      <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />
      <div style={{ display: 'flex', gap: 18, flex: 1, overflow: 'hidden', flexWrap: 'wrap' }}>
        {ms.map(d => (
          <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <svg width="11" height="11" viewBox="0 0 14 14" fill="var(--accent)">
              <path d="M7 1.5L8.7 5l3.8.5-2.8 2.6.7 3.8L7 10.1 3.6 12l.7-3.8L1.5 5.5 5.3 5z"/>
            </svg>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)',
              fontVariantNumeric: 'tabular-nums',
            }}>{String(d.day).padStart(2,'0')}</span>
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: 12.5, color: 'var(--text)',
              fontWeight: 500,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: 240,
            }}>{d.highlight}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountPanel({ onClose }) {
  const userEmail = localStorage.getItem('osmin_user_email') || 'usuario';
  const userInitial = userEmail[0].toUpperCase();

  React.useEffect(() => {
    if (!document.getElementById('osmin-ac-styles')) {
      const s = document.createElement('style');
      s.id = 'osmin-ac-styles';
      s.textContent = `
        @keyframes acOverlayIn { from { opacity:0 } to { opacity:1 } }
        @keyframes acPanelIn   { from { transform:translateX(100%) } to { transform:translateX(0) } }
      `;
      document.head.appendChild(s);
    }
  }, []);

  const joinFormatted = React.useMemo(() => {
    try {
      const raw = localStorage.getItem('osmin_join_date') || new Date().toISOString();
      return new Date(raw).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return '—'; }
  }, []);

  const stats = React.useMemo(() => {
    try {
      const raw = localStorage.getItem('osmin_v1');
      if (!raw) return { months: 0, habits: 0, days: 0, pct: 0 };
      const data = JSON.parse(raw);
      const totalMonths = data.months?.length || 0;
      const habitSet = new Set();
      data.months?.forEach(m => m.habits?.forEach(h => habitSet.add(h.label)));
      let totalDays = 0, doneDays = 0;
      data.months?.forEach(m => {
        m.days?.forEach(d => {
          if (d.type === 'festivo' || d.type === 'vacaciones') return;
          totalDays++;
          const hasAny = m.habits?.some(h => {
            const v = d.habitValues?.[h.id];
            return h.type === 'check' ? v === 1 : (v || 0) >= (h.goal || 1);
          });
          if (hasAny) doneDays++;
        });
      });
      return { months: totalMonths, habits: habitSet.size, days: doneDays, pct: totalDays ? Math.round((doneDays / totalDays) * 100) : 0 };
    } catch { return { months: 0, habits: 0, days: 0, pct: 0 }; }
  }, []);

  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [toast, setToast] = React.useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleExport = () => {
    try {
      const blob = new Blob([localStorage.getItem('osmin_v1') || '{}'], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `osmin-datos-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      showToast('Datos exportados correctamente');
    } catch { showToast('Error al exportar'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('osmin_user_email');
    window.location.href = 'landing-a.html';
  };

  const handleDelete = () => {
    ['osmin_v1', 'osmin_user_email', 'osmin_tip_dismissed', 'osmin_join_date'].forEach(k => localStorage.removeItem(k));
    window.location.href = 'landing-a.html';
  };

  const FEATURES = ['Seguimiento de hábitos', 'Bitácora diaria', 'Estadísticas del mes', 'Vista de highlights', 'Exportación de datos', 'Acceso anticipado'];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 40,
        background: 'rgba(0,0,0,0.48)',
        backdropFilter: 'blur(3px)',
        animation: 'acOverlayIn 200ms ease forwards',
      }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
        width: 400, maxWidth: '95vw',
        background: 'var(--bg-app)',
        borderLeft: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
        boxShadow: '-20px 0 60px rgba(0,0,0,.4)',
        animation: 'acPanelIn 260ms cubic-bezier(.3,.7,.4,1) forwards',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--line)',
          position: 'sticky', top: 0, background: 'var(--bg-app)', zIndex: 2,
        }}>
          <img src="logo.png" alt="Osmin" style={{ height: 22, filter: 'brightness(0) invert(1) opacity(.88)' }} />
          <button onClick={onClose} style={{
            width: 30, height: 30, border: '1px solid var(--line)',
            background: 'transparent', borderRadius: 8,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)',
          }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: '20px 20px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Profile */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14,
            padding: '22px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'linear-gradient(135deg, #4ECDC4 0%, #1F8A5B 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 700, color: '#fff',
            }}>{userInitial}</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{userEmail}</div>
              <div style={{ marginTop: 6 }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, fontWeight: 600,
                  color: '#4ECDC4', background: 'rgba(78,205,196,.1)',
                  border: '1px solid rgba(78,205,196,.25)', borderRadius: 5,
                  padding: '2px 8px', letterSpacing: '.05em',
                }}>ACCESO ANTICIPADO</span>
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 7 }}>
                Miembro desde {joinFormatted}
              </div>
            </div>
          </div>

          {/* Plan */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>Plan actual</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)', textDecoration: 'line-through' }}>5€/mes</span>
                <span style={{ fontFamily: 'Instrument Serif, serif', fontSize: 20, color: 'var(--text)' }}>Gratis</span>
              </div>
            </div>
            {FEATURES.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: '1px solid var(--line-soft)', fontFamily: 'Inter, sans-serif', fontSize: 12.5, color: 'var(--text-soft)' }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2 7l3 3 6-6" stroke="#1F8A5B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {f}
              </div>
            ))}
            <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 7, background: 'rgba(42,111,219,.07)', border: '1px solid rgba(42,111,219,.15)', fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>
              El precio puede cambiar cuando salgamos de acceso anticipado.
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Meses', value: stats.months },
              { label: 'Hábitos únicos', value: stats.habits },
              { label: 'Días completados', value: stats.days },
              { label: 'Cumplimiento', value: `${stats.pct}%` },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            <button onClick={handleExport} style={{
              width: '100%', padding: '14px 20px', border: 'none',
              borderBottom: '1px solid var(--line-soft)', background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--text)', transition: 'background 120ms',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M7.5 1.5v8M4.5 6.5l3 3 3-3M2.5 11v1.5a1 1 0 001 1h8a1 1 0 001-1V11"/>
              </svg>
              Exportar mis datos
            </button>
            <button onClick={handleLogout} style={{
              width: '100%', padding: '14px 20px', border: 'none',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#E05252', transition: 'background 120ms',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(224,82,82,.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 2H3.5a1 1 0 00-1 1v8a1 1 0 001 1H6M10 10.5l3-3-3-3M5 7.5h8"/>
              </svg>
              Cerrar sesión
            </button>
          </div>

          {/* Danger */}
          <div style={{ background: 'rgba(224,82,82,.04)', border: '1px solid rgba(224,82,82,.15)', borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#E05252', marginBottom: 10, letterSpacing: '.06em', textTransform: 'uppercase' }}>
              Zona de peligro
            </div>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} style={{
                padding: '7px 16px', borderRadius: 8,
                border: '1px solid rgba(224,82,82,.3)', background: 'transparent',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12.5, color: '#E05252',
              }}>
                Eliminar cuenta y datos
              </button>
            ) : (
              <div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                  Esta acción eliminará todos tus datos locales. ¿Continuar?
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmDelete(false)} style={{
                    flex: 1, padding: '8px', borderRadius: 7,
                    border: '1px solid var(--line)', background: 'transparent',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--text-muted)',
                  }}>Cancelar</button>
                  <button onClick={handleDelete} style={{
                    flex: 1, padding: '8px', borderRadius: 7,
                    border: 'none', background: '#E05252',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#fff',
                  }}>Sí, eliminar</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--surface)', border: '1px solid var(--line)',
            padding: '10px 20px', borderRadius: 10, zIndex: 60,
            fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--text)',
            boxShadow: '0 8px 24px rgba(0,0,0,.4)',
            animation: 'acOverlayIn 180ms ease',
          }}>{toast}</div>
        )}
      </div>
    </>
  );
}

function App() {
  // Load persisted state once at startup
  const saved = useMemo(() => loadSaved(), []);

  const [months, setMonths] = useState(() =>
    saved?.months?.length ? saved.months : [buildSampleMonth()]
  );
  const [activeIdx, setActiveIdx] = useState(() => {
    const idx = saved?.activeIdx ?? 0;
    const months = saved?.months;
    return months ? Math.min(idx, months.length - 1) : 0;
  });
  const [view, setView] = useState('month');
  const [layout, setLayoutState] = useState(() => saved?.layout ?? 'table');
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'overview' — intentionally not persisted
  const [showAccount, setShowAccount] = useState(false);

  const month = months[activeIdx];
  const setMonth = (updater) => {
    setMonths(ms => {
      const next = ms.slice();
      next[activeIdx] = typeof updater === 'function' ? updater(ms[activeIdx]) : updater;
      return next;
    });
  };

  const addMonth = (year, monthIdx) => {
    const last = months[months.length - 1];
    const newIdx = months.length;
    setMonths(ms => [...ms, buildBlankMonth(year, monthIdx, last.habits)]);
    setActiveIdx(newIdx);
    setViewMode('month');
  };

  const deleteMonth = (idx) => {
    if (months.length <= 1) return;
    setMonths(ms => ms.filter((_, i) => i !== idx));
    setActiveIdx(ai => {
      if (idx < ai) return ai - 1;
      if (idx === ai) return Math.max(0, idx - 1);
      return ai;
    });
  };

  const twkDefaults = window.__OSMIN_TWEAK_DEFAULTS || { theme: 'light', density: 'comfy', accent: '#C97A2A' };
  const [tweaks, setTweak] = window.useTweaks({ ...twkDefaults, ...(saved?.tweaks || {}) });

  // Apply theme + density to root via data attrs
  useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.dataset.density = tweaks.density;
    document.documentElement.style.setProperty('--accent', tweaks.accent);
  }, [tweaks.theme, tweaks.density, tweaks.accent]);

  // Persist all state to localStorage on every relevant change
  // Skip the very first render (saved state is already in storage)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    saveState({ months, activeIdx, layout, tweaks });
  }, [months, activeIdx, layout, tweaks]);

  return (
    <div style={{
      width: '100%', height: '100vh',
      display: 'flex', overflow: 'hidden',
      background: 'var(--bg-app)',
    }}>
      <Sidebar
        months={months} activeIdx={activeIdx}
        setActiveIdx={(i) => { setActiveIdx(i); setViewMode('month'); }}
        addMonth={addMonth} deleteMonth={deleteMonth}
        view={view} setView={setView}
        onOpenAccount={() => setShowAccount(true)}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <MonthHeader
          month={month}
          layout={layout}
          setLayout={setLayoutState}
          onPrev={() => setActiveIdx(i => Math.max(0, i - 1))}
          onNext={() => setActiveIdx(i => Math.min(months.length - 1, i + 1))}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px 80px' }}>
          {viewMode === 'overview' ? (
            <window.OverviewView month={month} setMonth={setMonth} />
          ) : layout === 'table' ? (
            <TableLayout month={month} setMonth={setMonth} density={tweaks.density} />
          ) : (
            <JournalLayout month={month} setMonth={setMonth} density={tweaks.density} />
          )}
        </div>
      </main>

      {/* Tweaks panel */}
      {window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks">
          <window.TweakSection label="Apariencia" />
          <window.TweakRadio
            label="Tema"
            value={tweaks.theme}
            onChange={v => setTweak('theme', v)}
            options={[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }]}
          />
          <window.TweakRadio
            label="Densidad"
            value={tweaks.density}
            onChange={v => setTweak('density', v)}
            options={[{ value: 'comfy', label: 'Cómoda' }, { value: 'compact', label: 'Compacta' }]}
          />
          <window.TweakColor
            label="Acento"
            value={tweaks.accent}
            onChange={v => setTweak('accent', v)}
            options={['#C97A2A', '#2A6FDB', '#1F8A5B', '#7C5CD0']}
          />
          <window.TweakSection label="Layout" />
          <window.TweakRadio
            label="Vista del mes"
            value={layout}
            onChange={setLayoutState}
            options={[{ value: 'table', label: 'Tabla' }, { value: 'journal', label: 'Bitácora' }]}
          />
        </window.TweaksPanel>
      )}

      {showAccount && <AccountPanel onClose={() => setShowAccount(false)} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
