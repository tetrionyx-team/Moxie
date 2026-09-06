import React, { useState, useMemo, useEffect, useRef } from 'react'
import { AppIcon, ChartIcon, ProductIcon, ArrowDownIcon, CheckIcon } from '../../icons'

export default function ProductPerformanceChart({ products = [] }) {
  const [limit, setLimit] = useState('5') // '5' | '10' | 'all'
  const [sortBy, setSortBy] = useState('revenue_desc') // 'revenue_desc' | 'revenue_asc' | 'units_desc' | 'units_asc' | 'demand_desc' | 'demand_asc'
  const [isLimitOpen, setIsLimitOpen] = useState(false)
  const [isSortOpen, setIsSortOpen] = useState(false)
  const limitRef = useRef(null)
  const sortRef = useRef(null)

  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (limitRef.current && !limitRef.current.contains(e.target)) {
        setIsLimitOpen(false)
      }
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setIsSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtered and sorted products
  const processedProducts = useMemo(() => {
    let list = [...products]

    const demandWeight = { 'High': 4, 'Medium': 3, 'Low': 2, 'No Demand': 1 }

    if (sortBy === 'revenue_desc') {
      list.sort((a, b) => b.revenue - a.revenue)
    } else if (sortBy === 'revenue_asc') {
      list.sort((a, b) => a.revenue - b.revenue)
    } else if (sortBy === 'units_desc') {
      list.sort((a, b) => b.units_sold - a.units_sold)
    } else if (sortBy === 'units_asc') {
      list.sort((a, b) => a.units_sold - b.units_sold)
    } else if (sortBy === 'demand_desc') {
      list.sort((a, b) => (demandWeight[b.demand_level] || 0) - (demandWeight[a.demand_level] || 0))
    } else if (sortBy === 'demand_asc') {
      list.sort((a, b) => (demandWeight[a.demand_level] || 0) - (demandWeight[b.demand_level] || 0))
    }

    if (limit === '5') return list.slice(0, 5)
    if (limit === '10') return list.slice(0, 10)
    return list
  }, [products, limit, sortBy])

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

    if (processedProducts.length === 0) return

    // Create unique ranked labels to prevent any duplicate label collisions
    const labels = processedProducts.map((p, idx) => `#${idx + 1} ${p.name}`)
    const revenues = processedProducts.map(p => p.revenue)

    chartInstance.current = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Sales',
          data: revenues,
          backgroundColor: '#6366f1',
          hoverBackgroundColor: '#4f46e5',
          borderRadius: 6,
          borderSkipped: false,
          barThickness: Math.min(24, Math.max(14, Math.floor(180 / Math.max(1, processedProducts.length)))),
          maxBarThickness: 24,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 6, bottom: 6, left: 4, right: 16 }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#182133' : '#0f172a',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 12 },
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: (items) => {
                const idx = items[0].dataIndex
                return processedProducts[idx]?.name || items[0].label
              },
              label: (context) => {
                const idx = context.dataIndex
                const p = processedProducts[idx]
                if (!p) return ''
                return [
                  `Sales: ₹${Number(p.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  `Units Sold: ${p.units_sold} (${p.sales_percentage || 0}% share)`,
                  `Avg Price: ₹${Number(p.avg_selling_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  `Current Stock: ${p.current_stock} units`,
                  `Demand Level: ${p.demand_level}`
                ]
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', drawBorder: false },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              callback: (v) => {
                if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L'
                if (v >= 1000) return '₹' + (v / 1000).toFixed(0) + 'k'
                return '₹' + v.toLocaleString('en-IN')
              }
            }
          },
          y: {
            grid: { display: false, drawBorder: false },
            ticks: {
              color: isDark ? '#CBD5E1' : '#1e293b',
              font: { size: 12, weight: '600' },
              autoSkip: false,
              callback: function(val) {
                const l = this.getLabelForValue(val)
                return l.length > 25 ? l.substr(0, 23) + '...' : l
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
  }, [processedProducts, isDark])

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
      {/* Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
            Product Performance Analysis
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
            Units sold, total sales, average price, and demand level by product
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Limit Selector */}
          <div ref={limitRef} style={{ position: 'relative', display: 'inline-block' }}>
            <button
              type="button"
              onClick={() => {
                setIsLimitOpen((prev) => !prev)
                setIsSortOpen(false)
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#ffffff',
                border: isLimitOpen ? '1px solid #6366f1' : '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0 10px',
                height: '34px',
                boxSizing: 'border-box',
                cursor: 'pointer',
                userSelect: 'none',
                boxShadow: isLimitOpen ? '0 0 0 3px rgba(99, 102, 241, 0.12)' : '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                {limit === '5' ? 'Top 5 Products' : limit === '10' ? 'Top 10 Products' : `All Products (${products.length})`}
              </span>
              <AppIcon
                icon={ArrowDownIcon}
                size={13}
                color="#64748b"
                style={{
                  transform: isLimitOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                  flexShrink: 0
                }}
              />
            </button>

            {isLimitOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  minWidth: '160px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)',
                  padding: '4px',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}
              >
                {[
                  { value: '5', label: 'Top 5 Products' },
                  { value: '10', label: 'Top 10 Products' },
                  { value: 'all', label: `All Products (${products.length})` }
                ].map((opt) => {
                  const isSelected = limit === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setLimit(opt.value)
                        setIsLimitOpen(false)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '6px 8px',
                        border: 'none',
                        borderRadius: '6px',
                        background: isSelected ? '#eef2ff' : 'transparent',
                        color: isSelected ? '#6366f1' : '#1e293b',
                        fontSize: '12px',
                        fontWeight: isSelected ? '700' : '500',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <AppIcon icon={CheckIcon} size={13} color="#6366f1" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sort Selector */}
          <div ref={sortRef} style={{ position: 'relative', display: 'inline-block' }}>
            <button
              type="button"
              onClick={() => {
                setIsSortOpen((prev) => !prev)
                setIsLimitOpen(false)
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#ffffff',
                border: isSortOpen ? '1px solid #6366f1' : '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0 10px',
                height: '34px',
                boxSizing: 'border-box',
                cursor: 'pointer',
                userSelect: 'none',
                boxShadow: isSortOpen ? '0 0 0 3px rgba(99, 102, 241, 0.12)' : '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                {
                  {
                    revenue_desc: 'Highest Sales (₹)',
                    revenue_asc: 'Lowest Sales (₹)',
                    units_desc: 'Highest Sales (Units)',
                    units_asc: 'Lowest Sales (Units)',
                    demand_desc: 'Highest Demand',
                    demand_asc: 'Lowest Demand'
                  }[sortBy] || 'Sort Products'
                }
              </span>
              <AppIcon
                icon={ArrowDownIcon}
                size={13}
                color="#64748b"
                style={{
                  transform: isSortOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                  flexShrink: 0
                }}
              />
            </button>

            {isSortOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  minWidth: '175px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)',
                  padding: '4px',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}
              >
                {[
                  { value: 'revenue_desc', label: 'Highest Sales (₹)' },
                  { value: 'revenue_asc', label: 'Lowest Sales (₹)' },
                  { value: 'units_desc', label: 'Highest Sales (Units)' },
                  { value: 'units_asc', label: 'Lowest Sales (Units)' },
                  { value: 'demand_desc', label: 'Highest Demand' },
                  { value: 'demand_asc', label: 'Lowest Demand' }
                ].map((opt) => {
                  const isSelected = sortBy === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSortBy(opt.value)
                        setIsSortOpen(false)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '6px 8px',
                        border: 'none',
                        borderRadius: '6px',
                        background: isSelected ? '#eef2ff' : 'transparent',
                        color: isSelected ? '#6366f1' : '#1e293b',
                        fontSize: '12px',
                        fontWeight: isSelected ? '700' : '500',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <AppIcon icon={CheckIcon} size={13} color="#6366f1" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div style={{ height: `${Math.max(160, processedProducts.length * 44)}px`, width: '100%', position: 'relative', marginBottom: '16px' }}>
        {processedProducts.length > 0 ? (
          <canvas ref={chartRef}></canvas>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '8px' }}>
            <AppIcon icon={ChartIcon} size={36} color="#cbd5e1" />
            <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>No products found.</p>
          </div>
        )}
      </div>

      {/* Product Mini Data Table */}
      {processedProducts.length > 0 && (
        <div style={{ overflowX: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '8px 10px' }}>Rank</th>
                <th style={{ padding: '8px 10px' }}>Product</th>
                <th style={{ padding: '8px 10px' }}>Category</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Units Sold</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Sales</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Share</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Stock</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Demand</th>
              </tr>
            </thead>
            <tbody>
              {processedProducts.map((p, idx) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc', color: '#1e293b' }}>
                  <td style={{ padding: '10px 10px', fontWeight: '700', color: '#6366f1' }}>
                    #{p.sales_rank || idx + 1}
                  </td>
                  <td style={{ padding: '10px 10px', fontWeight: '600' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'contain', background: '#f1f5f9' }} />
                      ) : (
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#eef2ff', display: 'grid', placeItems: 'center', color: '#6366f1' }}>
                          <AppIcon icon={ProductIcon} size={14} />
                        </div>
                      )}
                      <span>{p.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 10px', color: '#64748b' }}>{p.category}</td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: '700' }}>{p.units_sold}</td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                    ₹{Number(p.revenue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', color: '#64748b' }}>{p.sales_percentage}%</td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: '600', color: p.current_stock <= 10 ? (p.current_stock === 0 ? '#ef4444' : '#f59e0b') : '#10b981' }}>
                    {p.current_stock}
                  </td>
                  <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor:
                          p.demand_level === 'High' ? '#ecfdf5' :
                          p.demand_level === 'Medium' ? '#eff6ff' :
                          p.demand_level === 'Low' ? '#fffbeb' : '#f8fafc',
                        color:
                          p.demand_level === 'High' ? '#059669' :
                          p.demand_level === 'Medium' ? '#2563eb' :
                          p.demand_level === 'Low' ? '#d97706' : '#94a3b8',
                      }}
                    >
                      {p.demand_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
