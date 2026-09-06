import { AppIcon, CheckmarkCircle01Icon, ClockIcon } from '../../icons'

export default function SaveProductButton({ isSaving = false, onSave }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
      <button
        type="button"
        disabled={isSaving}
        onClick={onSave}
        style={{
          height: '44px',
          padding: '0 32px',
          background: isSaving ? '#94a3b8' : '#6657ec',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '14px',
          border: 0,
          borderRadius: '10px',
          cursor: isSaving ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: isSaving ? 'none' : '0 4px 14px rgba(102, 87, 236, 0.3)',
          transition: 'all 0.2s ease',
          opacity: isSaving ? 0.75 : 1
        }}
        onMouseOver={e => { if (!isSaving) e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseOut={e => { if (!isSaving) e.currentTarget.style.transform = 'none' }}
      >
        {isSaving ? (
          <>
            <AppIcon icon={ClockIcon} size={18} />
            <span>Saving Product...</span>
          </>
        ) : (
          <>
            <AppIcon icon={CheckmarkCircle01Icon} size={18} />
            <span>Save Product</span>
          </>
        )}
      </button>
    </div>
  )
}
