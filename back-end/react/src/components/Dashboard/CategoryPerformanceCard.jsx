import React from 'react'
import { AppIcon, FolderIcon } from '../../icons'

export default function CategoryPerformanceCard({ categories = [] }) {
  return (
    <div
      className="panel category-performance-card"
      style={{
        background: '#ffffff',
        border: '1px solid #e7ecf3',
        borderRadius: '16px',
        padding: '16px 18px',
        boxShadow: '0 1px 3px rgba(15,23,42,0.03), 0 4px 12px rgba(15,23,42,0.04)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      <div style={{ marginBottom: '12px', flex: '0 0 auto' }}>
        <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.01em', lineHeight: '1.2' }}>
          Category Performance
        </h2>
        <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b', lineHeight: '1.2' }}>
          Sales share, units sold, and stock distribution by category
        </p>
      </div>

      <div
        className="category-performance-list"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flex: '1 1 0',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: '4px',
          scrollbarWidth: 'thin'
        }}
      >
        {categories.length > 0 ? (
          categories.map((c) => (
            <div
              key={c.id}
              style={{
                padding: '10px 12px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #f1f5f9',
                boxSizing: 'border-box',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0'
                e.currentTarget.style.background = '#f1f5f9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#f1f5f9'
                e.currentTarget.style.background = '#f8fafc'
              }}
            >
              {/* Top: Icon + Name + Count on Left | Revenue + Share on Right */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <AppIcon icon={FolderIcon} size={14} color="#6366f1" style={{ flexShrink: 0 }} />
                  <strong style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.name}
                  </strong>
                  <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>
                    ({c.total_products} products)
                  </span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                  <strong style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: '700' }}>
                    ₹{Number(c.revenue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                  <span style={{ marginLeft: '6px', fontSize: '11.5px', fontWeight: '700', color: '#6366f1' }}>
                    {c.share_percentage}%
                  </span>
                </div>
              </div>

              {/* Center: Thin Progress Bar */}
              <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', margin: '6px 0 5px' }}>
                <div
                  style={{
                    width: `${Math.max(2, c.share_percentage)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                    borderRadius: '3px'
                  }}
                />
              </div>

              {/* Bottom: Units Sold + Orders on Left | Stock on Right */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
                <span>{c.units_sold} units sold &middot; {c.orders_count} orders</span>
                <span>Stock: <b style={{ color: c.current_stock <= 10 ? '#f59e0b' : '#0f172a' }}>{c.current_stock}</b> units</span>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>
            No categories found.
          </div>
        )}
      </div>
    </div>
  )
}
