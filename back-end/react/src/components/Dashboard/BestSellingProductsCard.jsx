import React from 'react'
import { AppIcon, ProductIcon, SparklesIcon } from '../../icons'

export default function BestSellingProductsCard({ bestSellers = [] }) {
  return (
    <div
      className="panel"
      style={{
        background: '#ffffff',
        border: '1px solid #e7ecf3',
        borderRadius: '16px',
        padding: '14px 16px',
        boxShadow: '0 1px 3px rgba(15,23,42,0.03), 0 4px 12px rgba(15,23,42,0.04)',
        display: 'flex',
        flexDirection: 'column',
        height: '236px',
        minHeight: '236px',
        maxHeight: '236px',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Header - Fixed at top */}
      <div
        className="card-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          flex: '0 0 auto'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AppIcon icon={SparklesIcon} size={16} color="#10b981" />
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
              Best Selling Products
            </h2>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748b' }}>
            Top sales and high volume drivers
          </p>
        </div>
        <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px' }}>
          High Volume
        </span>
      </div>

      {/* Product Rows List - Scrollable */}
      <div
        className="card-content-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          paddingRight: '3px',
          scrollbarWidth: 'thin'
        }}
      >
        {bestSellers && bestSellers.length > 0 ? (
          bestSellers.map((item, idx) => (
            <div
              key={item.id || idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '20px 38px minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 10px',
                background: '#f8fafc',
                borderRadius: '9px',
                border: '1px solid #f1f5f9',
                boxSizing: 'border-box',
                minHeight: '50px',
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
              {/* Ranking */}
              <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#6366f1', textAlign: 'center' }}>
                #{idx + 1}
              </div>

              {/* Product Image */}
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '7px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <AppIcon icon={ProductIcon} size={16} color="#6366f1" />
                )}
              </div>

              {/* Info (Name, Category & Stock) */}
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <strong style={{ display: 'block', fontSize: '12px', color: '#0f172a', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2' }}>
                  {item.name}
                </strong>
                <small style={{ marginTop: '2px', fontSize: '10.5px', color: '#64748b', display: 'block', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.category} &middot; Stock: <b style={{ color: item.current_stock <= 10 ? '#f59e0b' : '#10b981' }}>{item.current_stock}</b>
                </small>
              </div>

              {/* Metrics (Revenue & Units Sold) */}
              <div style={{ textAlign: 'right', minWidth: '85px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0 }}>
                <strong style={{ display: 'block', fontSize: '12px', color: '#0f172a', fontWeight: '700', lineHeight: '1.2' }}>
                  ₹{Number(item.revenue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
                <span style={{ marginTop: '2px', display: 'inline-block', fontSize: '10.5px', color: '#059669', fontWeight: '700', lineHeight: '1.2' }}>
                  {item.units_sold} sold
                </span>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: '#94a3b8', fontSize: '12px' }}>
            No sales recorded for this period.
          </div>
        )}
      </div>
    </div>
  )
}
