import React, { useState, useMemo } from 'react'
import { AppIcon, ProductIcon, SparklesIcon } from '../../icons'

export default function SmartRestockTable({ recommendations = [], riskSummary = {} }) {
  const [filterRisk, setFilterRisk] = useState('ALL') // 'ALL' | 'HIGH RISK' | 'MEDIUM RISK' | 'LOW RISK'

  const filteredItems = useMemo(() => {
    if (filterRisk === 'ALL') return recommendations
    return recommendations.filter(r => r.risk_level === filterRisk)
  }, [recommendations, filterRisk])

  const highCount = riskSummary.high_risk_count || recommendations.filter(r => r.risk_level === 'HIGH RISK').length
  const medCount = riskSummary.medium_risk_count || recommendations.filter(r => r.risk_level === 'MEDIUM RISK').length
  const lowCount = riskSummary.low_risk_count || recommendations.filter(r => r.risk_level === 'LOW RISK').length

  const formatStockoutDays = (r) => {
    if (r.current_stock === 0) {
      return <span style={{ color: '#ef4444', fontWeight: '700' }}>Out of Stock</span>
    }
    if (r.days_until_stockout === null || r.days_until_stockout === undefined) {
      return <span style={{ color: '#64748b', fontWeight: '500' }}>Sufficient</span>
    }
    const days = Math.round(r.days_until_stockout)
    if (days <= 7) {
      return <span style={{ color: '#ef4444', fontWeight: '700' }}>~{days} days</span>
    }
    if (days <= 21) {
      return <span style={{ color: '#f59e0b', fontWeight: '700' }}>~{days} days</span>
    }
    if (days <= 90) {
      return <span style={{ color: '#10b981', fontWeight: '600' }}>~{days} days</span>
    }
    return <span style={{ color: '#10b981', fontWeight: '600' }}>&gt; 90 days (Safe)</span>
  }

  return (
    <div
      className="panel"
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '20px 22px',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        marginBottom: '20px'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AppIcon icon={SparklesIcon} size={18} color="#f59e0b" />
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
              Smart Restock &amp; Stockout Risk Recommendations
            </h2>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
            Algorithmic inventory reorder quantities and projected stockout timelines
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'inline-flex', background: '#f8fafc', padding: '3px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => setFilterRisk('ALL')}
            style={{
              padding: '5px 12px',
              fontSize: '11.5px',
              fontWeight: '700',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              background: filterRisk === 'ALL' ? '#ffffff' : 'transparent',
              color: filterRisk === 'ALL' ? '#0f172a' : '#64748b',
              boxShadow: filterRisk === 'ALL' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            All Items ({recommendations.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterRisk('HIGH RISK')}
            style={{
              padding: '5px 12px',
              fontSize: '11.5px',
              fontWeight: '700',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              background: filterRisk === 'HIGH RISK' ? '#ffffff' : 'transparent',
              color: filterRisk === 'HIGH RISK' ? '#ef4444' : '#64748b',
              boxShadow: filterRisk === 'HIGH RISK' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            High Risk ({highCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterRisk('MEDIUM RISK')}
            style={{
              padding: '5px 12px',
              fontSize: '11.5px',
              fontWeight: '700',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              background: filterRisk === 'MEDIUM RISK' ? '#ffffff' : 'transparent',
              color: filterRisk === 'MEDIUM RISK' ? '#f59e0b' : '#64748b',
              boxShadow: filterRisk === 'MEDIUM RISK' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Medium ({medCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterRisk('LOW RISK')}
            style={{
              padding: '5px 12px',
              fontSize: '11.5px',
              fontWeight: '700',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              background: filterRisk === 'LOW RISK' ? '#ffffff' : 'transparent',
              color: filterRisk === 'LOW RISK' ? '#10b981' : '#64748b',
              boxShadow: filterRisk === 'LOW RISK' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Healthy ({lowCount})
          </button>
        </div>
      </div>

      {/* Summary Risk Metric Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}
      >
        <div
          onClick={() => setFilterRisk(filterRisk === 'HIGH RISK' ? 'ALL' : 'HIGH RISK')}
          style={{
            background: '#fef2f2',
            border: filterRisk === 'HIGH RISK' ? '2px solid #ef4444' : '1px solid #fee2e2',
            borderRadius: '10px',
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <strong style={{ display: 'block', fontSize: '13px', color: '#b91c1c' }}>
            HIGH RISK ({highCount})
          </strong>
          <span style={{ fontSize: '11px', color: '#991b1b', marginTop: '2px', display: 'block' }}>
            {highCount} products need urgent reordering.
          </span>
        </div>

        <div
          onClick={() => setFilterRisk(filterRisk === 'MEDIUM RISK' ? 'ALL' : 'MEDIUM RISK')}
          style={{
            background: '#fffbeb',
            border: filterRisk === 'MEDIUM RISK' ? '2px solid #f59e0b' : '1px solid #fef3c7',
            borderRadius: '10px',
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <strong style={{ display: 'block', fontSize: '13px', color: '#b45309' }}>
            MEDIUM RISK ({medCount})
          </strong>
          <span style={{ fontSize: '11px', color: '#92400e', marginTop: '2px', display: 'block' }}>
            {medCount} products require monitoring.
          </span>
        </div>

        <div
          onClick={() => setFilterRisk(filterRisk === 'LOW RISK' ? 'ALL' : 'LOW RISK')}
          style={{
            background: '#ecfdf5',
            border: filterRisk === 'LOW RISK' ? '2px solid #10b981' : '1px solid #d1fae5',
            borderRadius: '10px',
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <strong style={{ display: 'block', fontSize: '13px', color: '#047857' }}>
            LOW RISK ({lowCount})
          </strong>
          <span style={{ fontSize: '11px', color: '#065f46', marginTop: '2px', display: 'block' }}>
            {lowCount} products have safe inventory levels.
          </span>
        </div>
      </div>

      {/* Recommendations Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
          <thead>
            <tr style={{ color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '10px 12px' }}>Product</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Current Stock</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Daily Sales</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>30D Demand</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Est. Stockout</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Rec. Reorder</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f8fafc', color: '#1e293b' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {r.image_url ? (
                        <img src={r.image_url} alt={r.name} style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'contain', background: '#f1f5f9' }} />
                      ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eef2ff', display: 'grid', placeItems: 'center', color: '#6366f1' }}>
                          <AppIcon icon={ProductIcon} size={15} />
                        </div>
                      )}
                      <div>
                        <strong style={{ display: 'block', fontSize: '12.5px', color: '#0f172a' }}>{r.name}</strong>
                        <small style={{ fontSize: '11px', color: '#64748b' }}>{r.category}</small>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: r.current_stock <= 5 ? (r.current_stock === 0 ? '#ef4444' : '#f59e0b') : '#0f172a' }}>
                    {r.current_stock}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                    {r.avg_daily_sales > 0 ? `${r.avg_daily_sales}/day` : '0/day'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>
                    {r.predicted_30d_demand} units
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {formatStockoutDays(r)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {r.recommended_reorder_qty > 0 ? (
                      <span style={{ color: '#6366f1', background: '#eef2ff', padding: '3px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '11.5px' }}>
                        +{r.recommended_reorder_qty} units
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>0 units</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '3px 9px',
                        borderRadius: '10px',
                        backgroundColor:
                          r.risk_level === 'HIGH RISK' ? '#fef2f2' :
                            r.risk_level === 'MEDIUM RISK' ? '#fffbeb' : '#ecfdf5',
                        color:
                          r.risk_level === 'HIGH RISK' ? '#b91c1c' :
                            r.risk_level === 'MEDIUM RISK' ? '#b45309' : '#047857',
                      }}
                    >
                      {r.risk_level}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '13px' }}>
                  No inventory items matching the selected risk filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
