import React, { useState, useRef, useEffect } from 'react'
import { AppIcon, ArrowDownIcon, CheckIcon } from '../../icons'
import './CustomSelect.css'

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  prefixIcon = null,
  height = '38px',
  minWidth = '130px',
  width = null,
  align = 'left', // 'left' | 'right'
  name = '',
  id = null,
  disabled = false,
  style = {},
  buttonStyle = {},
  menuStyle = {},
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Normalize options array into [{ value, label, icon, dotColor, color, bg, border }]
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null && 'value' in opt) {
      return {
        value: opt.value,
        label: opt.label !== undefined ? opt.label : String(opt.value),
        icon: opt.icon || null,
        dotColor: opt.dotColor || null,
        color: opt.color || null,
        bg: opt.bg || null,
        border: opt.border || null,
      }
    }
    return {
      value: opt,
      label: String(opt),
      icon: null,
      dotColor: null,
      color: null,
      bg: null,
      border: null,
    }
  })

  // Find currently selected option
  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value))
  const displayLabel = selectedOption ? selectedOption.label : placeholder
  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const isFullWidth = width === '100%'

  return (
    <div
      ref={dropdownRef}
      id={id}
      className={`custom-select-container ${className}`.trim()}
      style={{
        position: 'relative',
        display: isFullWidth ? 'block' : 'inline-block',
        width: width || (minWidth ? 'auto' : undefined),
        minWidth: isFullWidth ? undefined : minWidth,
        boxSizing: 'border-box',
        zIndex: isOpen ? 100 : 'auto',
        ...style
      }}
    >
      {name && <input type="hidden" name={name} value={value || ''} />}
      <button
        type="button"
        disabled={disabled}
        className="custom-select-button"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          width: '100%',
          height: height,
          background: disabled ? 'var(--card-soft, #f8fafc)' : (selectedOption?.bg || 'var(--input-bg, #ffffff)'),
          border: isOpen ? '1.5px solid #2563eb' : (selectedOption?.border || '1.5px solid var(--input-border, #cbd5e1)'),
          borderRadius: '10px',
          padding: '0 12px',
          fontSize: '13px',
          fontWeight: '600',
          color: disabled ? 'var(--muted, #94a3b8)' : (selectedOption?.color || (selectedOption ? 'var(--ink, #0f172a)' : 'var(--ink-secondary, #64748b)')),
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          boxSizing: 'border-box',
          boxShadow: isOpen ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none',
          transition: 'border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
          outline: 'none',
          ...buttonStyle
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, textAlign: 'left' }}>
          {prefixIcon && <AppIcon icon={prefixIcon} size={15} color="#2563eb" style={{ flexShrink: 0 }} />}
          {selectedOption?.dotColor && (
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: selectedOption.dotColor,
                flexShrink: 0
              }}
            />
          )}
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: selectedOption?.color || (selectedOption ? 'var(--ink, #0f172a)' : 'var(--ink-secondary, #64748b)'),
              fontWeight: '600',
              textAlign: 'left',
              display: 'inline-block'
            }}
          >
            {displayLabel}
          </span>
        </div>

        <AppIcon
          icon={ArrowDownIcon}
          size={12}
          color={selectedOption?.color || 'var(--ink-secondary, #64748b)'}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
            marginLeft: '2px'
          }}
        />
      </button>

      {isOpen && (
        <div
          className="custom-select-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: align === 'right' ? 'auto' : 0,
            right: align === 'right' ? 0 : (isFullWidth ? 0 : 'auto'),
            width: isFullWidth ? '100%' : 'max-content',
            minWidth: '100%',
            maxWidth: isFullWidth ? '100%' : '380px',
            maxHeight: '230px',
            overflowY: normalizedOptions.length > 5 ? 'auto' : 'hidden',
            overflowX: 'hidden',
            background: 'var(--card, #ffffff)',
            border: '1px solid var(--line, #e2e8f0)',
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.14), 0 4px 12px rgba(15, 23, 42, 0.08)',
            padding: '5px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            boxSizing: 'border-box',
            ...menuStyle
          }}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = String(value) === String(opt.value)
            return (
              <button
                key={String(opt.value)}
                type="button"
                className={`custom-select-option ${isSelected ? 'selected' : ''}`.trim()}
                onClick={() => {
                  if (onChange) {
                    onChange({ target: { name, value: opt.value } }, opt.value)
                  }
                  setIsOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  width: '100%',
                  padding: '7px 10px',
                  border: 'none',
                  borderRadius: '7px',
                  background: isSelected ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                  color: isSelected ? '#2563eb' : (opt.color || 'var(--ink, #1e293b)'),
                  fontSize: '12.5px',
                  fontWeight: isSelected ? '700' : '500',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--card-soft, #f8fafc)'
                    if (!opt.color) e.currentTarget.style.color = 'var(--ink, #0f172a)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    if (!opt.color) e.currentTarget.style.color = 'var(--ink, #1e293b)'
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, flex: 1, textAlign: 'left' }}>
                  {opt.dotColor && (
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: opt.dotColor,
                        flexShrink: 0
                      }}
                    />
                  )}
                  {opt.icon && <AppIcon icon={opt.icon} size={14} style={{ flexShrink: 0 }} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left', display: 'block', flex: 1, color: isSelected ? '#2563eb' : (opt.color || undefined) }}>
                    {opt.label}
                  </span>
                </div>
                {isSelected && (
                  <AppIcon icon={CheckIcon} size={13} color="#2563eb" style={{ flexShrink: 0, marginLeft: 'auto' }} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

