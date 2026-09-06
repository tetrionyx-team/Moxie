import React, { useEffect, useRef } from 'react'

export default function InventoryAnalyticsCard({ inventory = {} }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  const inStock = Number(inventory.in_stock || 0)
  const lowStock = Number(inventory.low_stock || 0)
  const outOfStock = Number(inventory.out_of_stock || 0)
  const totalProducts = Number(inventory.total_products || 0)

  useEffect(() => {
    if (!chartRef.current || !window.Chart) return
    const ctx = chartRef.current.getContext('2d')
    if (chartInstance.current) {
      chartInstance.current.destroy()
      chartInstance.current = null
    }

    if (totalProducts === 0) return

    chartInstance.current = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['In Stock', 'Low Stock', 'Out of Stock'],
        datasets: [{
          data: [inStock, lowStock, outOfStock],
          backgroundColor: ['#10b981', '#3b82f6', '#ef4444'],
          hoverBackgroundColor: ['#059669', '#2563eb', '#dc2626'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '74%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            titleFont: { size: 11, weight: 'bold' },
            bodyFont: { size: 11 },
            padding: 8,
            cornerRadius: 6,
            displayColors: true,
            callbacks: {
              label: (context) => {
                const val = context.parsed || 0
                const pct = totalProducts > 0 ? Math.round((val / totalProducts) * 100) : 0
                return ` ${context.label}: ${val} items (${pct}%)`
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
  }, [totalProducts, inStock, lowStock, outOfStock])

  return (
    <div
      className="panel inventory-analytics-card"
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
      {/* 1. TITLE + SUBTITLE AT TOP */}
      <div className="card-header" style={{ marginBottom: '0px', flex: '0 0 auto' }}>
        <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.01em', lineHeight: '1.2' }}>
          Inventory Analytics & Health
        </h2>
        <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b', lineHeight: '1.2' }}>
          Live stock breakdown, fast-moving items, and inventory health
        </p>
      </div>

      {/* 2. DONUT / VISUALIZATION DIAGRAM BELOW - CENTERED HORIZONTALLY */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          marginTop: '22px',
          marginBottom: '20px',
          flex: '0 0 auto'
        }}
      >
        <div style={{ width: '104px', height: '104px', position: 'relative', flexShrink: 0, margin: '0 auto' }}>
          {totalProducts > 0 ? (
            <canvas ref={chartRef}></canvas>
          ) : (
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '5px solid #f1f5f9' }}></div>
          )}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
              lineHeight: '1.1'
            }}
          >
            <strong style={{ display: 'block', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              {inventory.total_stock || 0}
            </strong>
            <span style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1px' }}>
              UNITS
            </span>
          </div>
        </div>
      </div>

      {/* 3. THREE STOCK STATUS ROWS ONE-BY-ONE BELOW THE DIAGRAM */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginBottom: '18px', flex: '0 0 auto' }}>
        {/* In Stock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            height: '34px',
            background: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #dcfce7',
            boxSizing: 'border-box',
            width: '100%'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#166534' }}>In Stock</span>
          </div>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#15803d' }}>
            {inStock} ({inventory.in_stock_pct || 0}%)
          </span>
        </div>

        {/* Low Stock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            height: '34px',
            background: '#eff6ff',
            borderRadius: '8px',
            border: '1px solid #dbeafe',
            boxSizing: 'border-box',
            width: '100%'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e40af' }}>Low Stock</span>
          </div>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#1d4ed8' }}>
            {lowStock} ({inventory.low_stock_pct || 0}%)
          </span>
        </div>

        {/* Out of Stock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            height: '34px',
            background: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fee2e2',
            boxSizing: 'border-box',
            width: '100%'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#991b1b' }}>Out of Stock</span>
          </div>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#b91c1c' }}>
            {outOfStock} ({inventory.out_of_stock_pct || 0}%)
          </span>
        </div>
      </div>

      {/* 4. DIVIDER & 5. TWO EQUAL SUMMARY BOXES AT THE BOTTOM */}
      <div
        className="inventory-footer"
        style={{
          marginTop: 'auto',
          paddingTop: '14px',
          borderTop: '1px solid #f1f5f9',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '12px',
          width: '100%',
          flex: '0 0 auto'
        }}
      >
        <div
          style={{
            background: '#f8fafc',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            boxSizing: 'border-box',
            width: '100%'
          }}
        >
          <span style={{ color: '#64748b', fontSize: '10.5px', display: 'block', fontWeight: '500' }}>
            Fast Moving
          </span>
          <strong style={{ color: '#059669', fontSize: '12px', fontWeight: '700' }}>
            {(inventory.fast_moving_products || []).length} products
          </strong>
        </div>
        <div
          style={{
            background: '#f8fafc',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            boxSizing: 'border-box',
            width: '100%'
          }}
        >
          <span style={{ color: '#64748b', fontSize: '10.5px', display: 'block', fontWeight: '500' }}>
            Slow Moving
          </span>
          <strong style={{ color: '#d97706', fontSize: '12px', fontWeight: '700' }}>
            {(inventory.slow_moving_products || []).length} products
          </strong>
        </div>
      </div>
    </div>
  )
}
