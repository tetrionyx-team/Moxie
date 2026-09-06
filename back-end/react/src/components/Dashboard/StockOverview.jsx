import React, { useState, useEffect, useRef } from 'react'

export default function StockOverview({ ctx }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  const totalProducts = Number(ctx.totalProducts || 0)
  const inStock = Number(ctx.inStock || 0)
  const lowStock = Number(ctx.lowStock || 0)
  const outOfStock = Number(ctx.outOfStock || 0)

  // Calculate percentages safely
  const inStockPct = totalProducts > 0 ? Math.round((inStock / totalProducts) * 100) : 0
  const lowStockPct = totalProducts > 0 ? Math.round((lowStock / totalProducts) * 100) : 0
  const outOfStockPct = totalProducts > 0 ? Math.max(0, 100 - inStockPct - lowStockPct) : 0

  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light')

  useEffect(() => {
    const handleThemeChange = (e) => {
      setTheme(e.detail?.theme || document.documentElement.getAttribute('data-theme') || 'light')
    }
    window.addEventListener('admin-theme-changed', handleThemeChange)
    return () => window.removeEventListener('admin-theme-changed', handleThemeChange)
  }, [])

  const isDark = theme === 'dark'

  useEffect(() => {
    if (!chartRef.current || !window.Chart) return
    const canvasCtx = chartRef.current.getContext('2d')
    if (chartInstance.current) {
      chartInstance.current.destroy()
      chartInstance.current = null
    }

    if (totalProducts === 0) return

    chartInstance.current = new window.Chart(canvasCtx, {
      type: 'doughnut',
      data: {
        labels: ['In Stock', 'Low Stock', 'Out of Stock'],
        datasets: [{
          data: [inStock, lowStock, outOfStock],
          backgroundColor: ['#10b981', '#3b82f6', '#ef4444'],
          hoverBackgroundColor: ['#059669', '#2563eb', '#dc2626'],
          borderWidth: 2,
          borderColor: isDark ? '#111827' : '#ffffff',
          hoverOffset: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#182133' : '#0f172a',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              label: (context) => {
                const val = context.parsed || 0
                const pct = totalProducts > 0 ? Math.round((val / totalProducts) * 100) : 0
                return ` ${val} items (${pct}%)`
              }
            }
          }
        }
      }
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
        chartInstance.current = null
      }
    }
  }, [totalProducts, inStock, lowStock, outOfStock, isDark])

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header" style={{ marginBottom: '12px' }}>
        <div>
          <h2>Stock Overview</h2>
          <p>Inventory level percentages</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '28px', flex: 1, minHeight: '190px', flexWrap: 'wrap' }}>
        {/* Donut Chart with Center Text */}
        <div style={{ width: '150px', height: '150px', position: 'relative', flexShrink: 0 }}>
          {totalProducts > 0 ? (
            <canvas ref={chartRef}></canvas>
          ) : (
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '12px solid #f1f5f9' }}></div>
          )}

          {/* Center Label */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
              lineHeight: '1.2'
            }}
          >
            <strong style={{ display: 'block', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
              {totalProducts}
            </strong>
            <span style={{ fontSize: '9.5px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Items
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', marginTop: '4px', flexShrink: 0 }} />
            <div>
              <strong style={{ display: 'block', fontSize: '12.5px', color: '#0f172a', fontWeight: '700' }}>In Stock</strong>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>{inStock} items ({inStockPct}%)</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', marginTop: '4px', flexShrink: 0 }} />
            <div>
              <strong style={{ display: 'block', fontSize: '12.5px', color: '#0f172a', fontWeight: '700' }}>Low Stock</strong>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>{lowStock} items ({lowStockPct}%)</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', marginTop: '4px', flexShrink: 0 }} />
            <div>
              <strong style={{ display: 'block', fontSize: '12.5px', color: '#0f172a', fontWeight: '700' }}>Out of Stock</strong>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>{outOfStock} items ({outOfStockPct}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
