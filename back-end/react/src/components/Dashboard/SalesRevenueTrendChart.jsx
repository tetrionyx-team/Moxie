import React, { useState, useEffect, useRef } from 'react'
import { AppIcon, ChartIcon, PaymentIcon, OrderIcon, ShoppingBagIcon } from '../../icons'

export default function SalesRevenueTrendChart({ salesTrend = {}, periodLabel = '' }) {
  const [metric, setMetric] = useState('revenue') // 'revenue' | 'orders' | 'units'
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  const labels = salesTrend.labels || []
  const revenues = salesTrend.revenues || []
  const orders = salesTrend.orders || []
  const units = salesTrend.units || []

  const totalValue = metric === 'revenue'
    ? `₹${Number(revenues.reduce((a, b) => a + b, 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : metric === 'orders'
    ? `${orders.reduce((a, b) => a + b, 0)} orders`
    : `${units.reduce((a, b) => a + b, 0)} units`

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
    const ctx = chartRef.current.getContext('2d')
    if (chartInstance.current) {
      chartInstance.current.destroy()
      chartInstance.current = null
    }

    if (labels.length === 0) return

    let dataPoints = []
    let borderColor = '#6366f1'
    let bgColor = 'rgba(99, 102, 241, 0.08)'
    let labelText = 'Sales'

    if (metric === 'revenue') {
      dataPoints = revenues
      borderColor = '#6366f1'
      bgColor = 'rgba(99, 102, 241, 0.12)'
      labelText = 'Sales'
    } else if (metric === 'orders') {
      dataPoints = orders
      borderColor = '#10b981'
      bgColor = 'rgba(16, 185, 129, 0.12)'
      labelText = 'Orders'
    } else {
      dataPoints = units
      borderColor = '#3b82f6'
      bgColor = 'rgba(59, 130, 246, 0.12)'
      labelText = 'Units Sold'
    }

    chartInstance.current = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: labelText,
          data: dataPoints,
          borderColor: borderColor,
          backgroundColor: bgColor,
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: labels.length > 20 ? 1.5 : 4,
          pointHoverRadius: 6,
          pointBackgroundColor: borderColor,
          pointBorderColor: isDark ? '#111827' : '#ffffff',
          pointBorderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 10, bottom: 4, left: 4, right: 10 }
        },
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
            displayColors: false,
            callbacks: {
              label: (context) => {
                const val = context.parsed.y
                if (metric === 'revenue') {
                  return ` Sales: ₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                } else if (metric === 'orders') {
                  return ` Orders: ${val}`
                }
                return ` Units Sold: ${val}`
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', drawBorder: false },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 12,
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', drawBorder: false },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              callback: (v) => {
                if (metric === 'revenue') {
                  if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L'
                  if (v >= 1000) return '₹' + (v / 1000).toFixed(0) + 'k'
                  return '₹' + v
                }
                return v
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
  }, [salesTrend, metric, isDark])

  return (
    <div
      className="panel"
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '18px 20px',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        marginBottom: '16px'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
              Sales Analytics & Trends
            </h2>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: '12px' }}>
              {periodLabel}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
            Total in period: <strong style={{ color: '#0f172a' }}>{totalValue}</strong>
          </p>
        </div>

        {/* Metric Toggles */}
        <div style={{ display: 'inline-flex', background: '#f8fafc', padding: '3px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => setMetric('revenue')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '11.5px',
              fontWeight: '700',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              background: metric === 'revenue' ? '#ffffff' : 'transparent',
              color: metric === 'revenue' ? '#6366f1' : '#64748b',
              boxShadow: metric === 'revenue' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <AppIcon icon={PaymentIcon} size={14} />
            Sales (₹)
          </button>

          <button
            type="button"
            onClick={() => setMetric('orders')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '11.5px',
              fontWeight: '700',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              background: metric === 'orders' ? '#ffffff' : 'transparent',
              color: metric === 'orders' ? '#10b981' : '#64748b',
              boxShadow: metric === 'orders' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <AppIcon icon={OrderIcon} size={14} />
            Orders
          </button>

          <button
            type="button"
            onClick={() => setMetric('units')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '11.5px',
              fontWeight: '700',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              background: metric === 'units' ? '#ffffff' : 'transparent',
              color: metric === 'units' ? '#3b82f6' : '#64748b',
              boxShadow: metric === 'units' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <AppIcon icon={ShoppingBagIcon} size={14} />
            Units Sold
          </button>
        </div>
      </div>

      {/* Chart Canvas or Empty State */}
      <div style={{ height: '260px', width: '100%', position: 'relative' }}>
        {labels.length > 0 ? (
          <canvas ref={chartRef}></canvas>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '8px' }}>
            <AppIcon icon={ChartIcon} size={36} color="#cbd5e1" />
            <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>No sales timeline data available for this period.</p>
          </div>
        )}
      </div>
    </div>
  )
}
