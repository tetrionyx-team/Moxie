import React, { useEffect, useRef, useState } from 'react'
import { AppIcon, ChartIcon, ArrowDownIcon, CheckIcon } from '../../icons'

export default function SalesChart() {
  const [period, setPeriod] = useState('this_week')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [salesData, setSalesData] = useState({
    total_sales: 0,
    total_units_sold: 0,
    highest_selling: null,
    lowest_selling: null,
    products: []
  })

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  // Fetch sales data dynamically when filter changes
  useEffect(() => {
    let isMounted = true
    const fetchSales = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin-dashboard/sales/?period=${period}`, {
          headers: { 'Accept': 'application/json' }
        })
        if (res.ok) {
          const data = await res.json()
          if (isMounted) {
            setSalesData(data)
          }
        }
      } catch (err) {
        console.error('Failed to fetch sales overview data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchSales()
    return () => { isMounted = false }
  }, [period])

  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light')

  useEffect(() => {
    const handleThemeChange = (e) => {
      setTheme(e.detail?.theme || document.documentElement.getAttribute('data-theme') || 'light')
    }
    window.addEventListener('admin-theme-changed', handleThemeChange)
    return () => window.removeEventListener('admin-theme-changed', handleThemeChange)
  }, [])

  const isDark = theme === 'dark'

  // Initialize and update horizontal bar chart
  useEffect(() => {
    if (!chartRef.current || !window.Chart) return
    const ctx = chartRef.current.getContext('2d')
    if (chartInstance.current) {
      chartInstance.current.destroy()
      chartInstance.current = null
    }

    const products = salesData.products || []
    if (products.length === 0) return

    const labels = products.map(p => p.name)
    const revenues = products.map(p => p.revenue)
    const units = products.map(p => p.units_sold)
    const percentages = products.map(p => p.revenue_percentage)

    chartInstance.current = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue',
          data: revenues,
          backgroundColor: '#6657ec',
          hoverBackgroundColor: '#4f46e5',
          borderRadius: 6,
          borderSkipped: false,
          barThickness: Math.min(24, Math.max(14, Math.floor(160 / Math.max(1, products.length)))),
          maxBarThickness: 24,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 6, bottom: 6, left: 4, right: 12 }
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
              title: (tooltipItems) => {
                const idx = tooltipItems[0].dataIndex
                return products[idx]?.name || tooltipItems[0].label
              },
              label: (context) => {
                const idx = context.dataIndex
                const rev = Number(revenues[idx] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                const u = units[idx] || 0
                const pct = percentages[idx] || 0
                return [
                  `Revenue: ₹${rev}`,
                  `Units Sold: ${u} ${u === 1 ? 'unit' : 'units'}`,
                  `Revenue Share: ${pct}% of total sales`
                ]
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
              drawBorder: false
            },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              callback: (v) => {
                if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L'
                if (v >= 1000) return '₹' + (v / 1000).toFixed(0) + 'k'
                return '₹' + v
              }
            }
          },
          y: {
            grid: { display: false, drawBorder: false },
            ticks: {
              color: isDark ? '#CBD5E1' : '#334155',
              font: { size: 12, weight: '600' },
              callback: function(value) {
                const label = this.getLabelForValue(value)
                return label.length > 20 ? label.substr(0, 18) + '...' : label
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
  }, [salesData, isDark])

  const products = salesData.products || []

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Panel Header with Title and Functional Date Filter */}
      <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2>Sales Overview</h2>
          <p>Product-wise revenue and units sold</p>
        </div>

        {/* Date Filter Dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#ffffff',
              border: isDropdownOpen ? '1px solid #6366f1' : '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0 10px',
              height: '34px',
              boxSizing: 'border-box',
              cursor: 'pointer',
              userSelect: 'none',
              boxShadow: isDropdownOpen ? '0 0 0 3px rgba(99, 102, 241, 0.12)' : '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
              {
                {
                  today: 'Today',
                  yesterday: 'Yesterday',
                  this_week: 'This Week',
                  this_month: 'This Month'
                }[period] || 'Select Period'
              }
            </span>
            <AppIcon
              icon={ArrowDownIcon}
              size={13}
              color="#64748b"
              style={{
                transform: isDropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
                flexShrink: 0
              }}
            />
          </button>

          {isDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                minWidth: '150px',
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
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'this_week', label: 'This Week' },
                { value: 'this_month', label: 'This Month' }
              ].map((opt) => {
                const isSelected = period === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setPeriod(opt.value)
                      setIsDropdownOpen(false)
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

      {/* Summary Micro Bar (Total Sales & Units) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 0 14px', borderBottom: '1px solid #f1f5f9', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
        <div>
          <span>Total Sales: </span>
          <strong style={{ color: '#0f172a', fontWeight: '700' }}>
            ₹{Number(salesData.total_sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>
        </div>
        <div>
          <span>Total Units: </span>
          <strong style={{ color: '#0f172a', fontWeight: '700' }}>
            {salesData.total_units_sold || 0}
          </strong>
        </div>
        {salesData.highest_selling && (
          <div style={{ marginLeft: 'auto', fontSize: '11.5px', color: '#10b981', fontWeight: '600' }}>
            Top: {salesData.highest_selling.name} (₹{Number(salesData.highest_selling.revenue || 0).toLocaleString('en-IN')})
          </div>
        )}
      </div>

      {/* Chart Canvas or Empty State */}
      <div style={{ flex: 1, minHeight: '220px', position: 'relative', marginTop: '10px' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#64748b' }}>
            Updating sales...
          </div>
        )}

        {products.length > 0 ? (
          <div style={{ height: '220px', width: '100%', position: 'relative' }}>
            <canvas ref={chartRef}></canvas>
          </div>
        ) : (
          <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94a3b8', textAlign: 'center' }}>
            <AppIcon icon={ChartIcon} size={36} color="#cbd5e1" />
            <p style={{ margin: 0, fontSize: '13px', fontWeight: '500' }}>No sales found for this period.</p>
            <small style={{ fontSize: '11px', color: '#94a3b8' }}>Orders placed in this time frame will appear here automatically.</small>
          </div>
        )}
      </div>
    </div>
  )
}
