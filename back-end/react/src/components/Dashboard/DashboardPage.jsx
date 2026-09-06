import React, { useState, useEffect, useCallback, useRef } from 'react'
import KpiCardsSection from './KpiCardsSection'
import SalesRevenueTrendChart from './SalesRevenueTrendChart'
import ProductPerformanceChart from './ProductPerformanceChart'
import CategoryPerformanceCard from './CategoryPerformanceCard'
import InventoryAnalyticsCard from './InventoryAnalyticsCard'
import BestSellingProductsCard from './BestSellingProductsCard'
import LowestSellingProductsCard from './LowestSellingProductsCard'
import {
  AppIcon,
  CalendarIcon,
  DownloadIcon,
  SparklesIcon,
  PlusIcon,
  FolderIcon,
  BannerIcon,
  UserIcon,
  ArrowDownIcon,
  CheckIcon
} from '../../icons'

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState('this_month') // 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'last_month' | 'this_year' | 'custom'
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [loading, setLoading] = useState(false)
  const [analyticsData, setAnalyticsData] = useState({
    period: 'this_month',
    start_date: '',
    end_date: '',
    summary: {},
    sales_trend: {},
    product_performance: [],
    category_analytics: [],
    best_and_worst: {},
    inventory: {},
    forecast: {},
    restock_recommendations: [],
    stockout_risk_summary: {},
    order_status_breakdown: {},
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch full analytics from API
  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      let url = `/api/admin-dashboard/analytics/?range=${dateRange}`
      if (dateRange === 'custom' && customStart && customEnd) {
        url += `&start_date=${customStart}&end_date=${customEnd}`
      }
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
      if (res.ok) {
        const data = await res.json()
        setAnalyticsData(data)
      }
    } catch (err) {
      console.error('Failed to load analytics dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [dateRange, customStart, customEnd])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Export Analytics to Excel / CSV
  const handleExportCSV = () => {
    const summary = analyticsData.summary || {}
    const products = analyticsData.product_performance || []
    const categories = analyticsData.category_analytics || []
    const inventory = analyticsData.inventory || {}

    const rangeTitle = rangeLabels[dateRange] || 'Selected Period'

    // Escape CSV fields
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""'
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }

    let csvContent = '\uFEFF' // UTF-8 BOM for Excel support
    csvContent += `MOXIE E-COMMERCE - SALES & ANALYTICS REPORT\n`
    csvContent += `Report Period,${escapeCsv(rangeTitle + ' (' + (analyticsData.start_date || '') + ' to ' + (analyticsData.end_date || '') + ')')}\n`
    csvContent += `Generated On,${escapeCsv(new Date().toLocaleString('en-IN'))}\n\n`

    // Section 1: Sales Summary
    csvContent += `--- KEY SALES & REVENUE SUMMARY ---\n`
    csvContent += `Metric,Value\n`
    csvContent += `Total Sales,₹${Number(summary.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`
    csvContent += `Total Orders,${summary.total_orders || 0}\n`
    csvContent += `Units Sold,${summary.units_sold || 0}\n`
    csvContent += `Average Order Value,₹${Number(summary.avg_order_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`

    // Section 2: Inventory Status
    csvContent += `--- INVENTORY & STOCK HEALTH ---\n`
    csvContent += `Metric,Value\n`
    csvContent += `Total Products,${summary.total_products || 0}\n`
    csvContent += `Active Products,${summary.active_products || 0}\n`
    csvContent += `Total Stock Units,${inventory.total_stock || summary.current_stock || 0}\n`
    csvContent += `In Stock Products,${inventory.in_stock || summary.in_stock_count || 0}\n`
    csvContent += `Low Stock Products (<=10),${inventory.low_stock || summary.low_stock_count || 0}\n`
    csvContent += `Out of Stock Products,${inventory.out_of_stock || summary.out_of_stock_count || 0}\n\n`

    // Section 3: Product Performance Breakdown
    csvContent += `--- PRODUCT PERFORMANCE BREAKDOWN ---\n`
    csvContent += `Rank,Product Name,Category,Units Sold,Unit Price (INR),Total Sales (INR),Sales Share %,Current Stock,Stock Status,Demand Level\n`
    products.forEach((p, idx) => {
      const stockStatus = p.current_stock === 0 ? 'Out of Stock' : p.current_stock <= 10 ? 'Low Stock' : 'In Stock'
      csvContent += `${idx + 1},${escapeCsv(p.name)},${escapeCsv(p.category)},${p.units_sold},₹${Number(p.avg_selling_price || p.price || 0).toFixed(2)},₹${Number(p.revenue || 0).toFixed(2)},${p.sales_percentage || 0}%,${p.current_stock},${escapeCsv(stockStatus)},${escapeCsv(p.demand_level)}\n`
    })
    csvContent += `\n`

    // Section 4: Category Performance
    if (categories.length > 0) {
      csvContent += `--- CATEGORY PERFORMANCE BREAKDOWN ---\n`
      csvContent += `Category Name,Total Products,Units Sold,Orders Count,Total Sales (INR),Sales Share %,Category Stock\n`
      categories.forEach((c) => {
        csvContent += `${escapeCsv(c.name)},${c.total_products || 0},${c.units_sold || 0},${c.orders_count || 0},₹${Number(c.revenue || 0).toFixed(2)},${c.share_percentage || 0}%,${c.current_stock || 0}\n`
      })
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Moxie_Sales_Report_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const rangeLabels = {
    today: 'Today',
    yesterday: 'Yesterday',
    '7days': 'Last 7 Days',
    '30days': 'Last 30 Days',
    this_month: 'This Month',
    last_month: 'Last Month',
    this_year: 'This Year',
    custom: 'Custom Range'
  }

  return (
    <div className="dashboard-shell" style={{ position: 'relative' }}>
      {/* Loading Overlay */}
      {loading && (
        <div
          style={{
            position: 'fixed',
            top: '70px',
            right: '24px',
            background: '#0f172a',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            zIndex: 1000,
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', animation: 'pulse 1.5s infinite' }} />
          Updating Analytics...
        </div>
      )}

      {/* Main Top Header & Analytics Controls */}
      <div
        className="dashboard-heading"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
              Moxie E-Commerce Analytics
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11.5px',
                fontWeight: '700',
                color: '#059669',
                backgroundColor: '#ecfdf5',
                border: '1px solid #d1fae5',
                padding: '3px 10px',
                borderRadius: '20px'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Live data
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            Period: <strong style={{ color: '#0f172a' }}>{analyticsData.start_date || '...'}</strong> to <strong style={{ color: '#0f172a' }}>{analyticsData.end_date || '...'}</strong>
          </p>
        </div>

        {/* Action Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Global Date Range Filter */}
          <div
            ref={dropdownRef}
            style={{
              position: 'relative',
              display: 'inline-block'
            }}
          >
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#ffffff',
                border: isDropdownOpen ? '1px solid #6366f1' : '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '0 12px',
                height: '38px',
                boxSizing: 'border-box',
                cursor: 'pointer',
                userSelect: 'none',
                boxShadow: isDropdownOpen ? '0 0 0 3px rgba(99, 102, 241, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease'
              }}
            >
              <AppIcon icon={CalendarIcon} size={16} color="#6366f1" style={{ flexShrink: 0 }} />
              <span
                style={{
                  fontSize: '12.5px',
                  fontWeight: '700',
                  color: '#0f172a',
                  whiteSpace: 'nowrap'
                }}
              >
                {rangeLabels[dateRange] || 'This Month'}
              </span>
              <AppIcon
                icon={ArrowDownIcon}
                size={14}
                color="#64748b"
                style={{
                  marginLeft: '2px',
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
                  top: 'calc(100% + 6px)',
                  left: 0,
                  minWidth: '185px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)',
                  padding: '6px',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}
              >
                {Object.entries(rangeLabels).map(([key, label]) => {
                  const isSelected = dateRange === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setDateRange(key)
                        setIsDropdownOpen(false)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '8px 10px',
                        border: 'none',
                        borderRadius: '6px',
                        background: isSelected ? '#eef2ff' : 'transparent',
                        color: isSelected ? '#6366f1' : '#1e293b',
                        fontSize: '12.5px',
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
                      <span>{label}</span>
                      {isSelected && <AppIcon icon={CheckIcon} size={14} color="#6366f1" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Custom Date Pickers if selected */}
          {dateRange === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{ height: '34px', padding: '0 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              <span style={{ fontSize: '12px', color: '#64748b' }}>to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{ height: '34px', padding: '0 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
            </div>
          )}

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '38px',
              padding: '0 14px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'background-color 0.15s ease'
            }}
          >
            <AppIcon icon={DownloadIcon} size={15} color="#6366f1" />
            Export Excel / CSV
          </button>
        </div>
      </div>

      {/* 1. Top Summary KPI Cards */}
      <KpiCardsSection summary={analyticsData.summary} />

      {/* 2. Sales & Revenue Trend Chart */}
      <SalesRevenueTrendChart
        salesTrend={analyticsData.sales_trend}
        periodLabel={rangeLabels[dateRange] || 'Selected Period'}
      />

      {/* 3. Product Performance Horizontal Bar Chart & Table */}
      <ProductPerformanceChart
        products={analyticsData.product_performance}
      />

      {/* 4. Category Performance & Inventory Analytics (Equal Height with internal scroll) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '16px',
          alignItems: 'stretch',
          marginBottom: '16px'
        }}
      >
        <CategoryPerformanceCard categories={analyticsData.category_analytics} />
        <InventoryAnalyticsCard inventory={analyticsData.inventory} />
      </div>

      {/* 5. Best & Lowest Selling Products (Equal Height with internal scroll) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '16px',
          alignItems: 'stretch',
          marginBottom: '16px'
        }}
      >
        <BestSellingProductsCard bestSellers={analyticsData.best_and_worst?.best_sellers} />
        <LowestSellingProductsCard lowestSellers={analyticsData.best_and_worst?.lowest_sellers} />
      </div>

      {/* 6. Quick Catalog Administration */}
      <div
        className="panel"
        style={{
          background: '#ffffff',
          border: '1px solid #e7ecf3',
          borderRadius: '16px',
          padding: '18px 20px',
          boxShadow: '0 3px 12px rgba(0,0,0,0.03)',
          marginBottom: '24px'
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
            Quick Catalog Administration
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
            Add new inventory, categories, promotional banners, or manage team
          </p>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '14px'
          }}
        >
          <a
            href="/admin/products/product/add/"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '18px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              textDecoration: 'none',
              color: '#1e293b',
              fontSize: '13px',
              fontWeight: '700',
              transition: 'all 0.2s ease',
              minHeight: '94px',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.background = '#f5f7ff'
              e.currentTarget.style.borderColor = '#818cf8'
              e.currentTarget.style.color = '#4f46e5'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.borderColor = '#e2e8f0'
              e.currentTarget.style.color = '#1e293b'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <AppIcon icon={PlusIcon} size={20} color="#6366f1" />
            Add Product
          </a>
          <a
            href="/admin/categories/category/?add=1"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '18px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              textDecoration: 'none',
              color: '#1e293b',
              fontSize: '13px',
              fontWeight: '700',
              transition: 'all 0.2s ease',
              minHeight: '94px',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.background = '#f5f7ff'
              e.currentTarget.style.borderColor = '#818cf8'
              e.currentTarget.style.color = '#4f46e5'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.borderColor = '#e2e8f0'
              e.currentTarget.style.color = '#1e293b'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <AppIcon icon={FolderIcon} size={20} color="#6366f1" />
            Add Category
          </a>
          <a
            href="/admin/banners/banner/?add=1"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '18px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              textDecoration: 'none',
              color: '#1e293b',
              fontSize: '13px',
              fontWeight: '700',
              transition: 'all 0.2s ease',
              minHeight: '94px',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.background = '#f5f7ff'
              e.currentTarget.style.borderColor = '#818cf8'
              e.currentTarget.style.color = '#4f46e5'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.borderColor = '#e2e8f0'
              e.currentTarget.style.color = '#1e293b'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <AppIcon icon={BannerIcon} size={20} color="#6366f1" />
            Add Banner
          </a>
          <a
            href="/admin/users/?add=1"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '18px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              textDecoration: 'none',
              color: '#1e293b',
              fontSize: '13px',
              fontWeight: '700',
              transition: 'all 0.2s ease',
              minHeight: '94px',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.background = '#f5f7ff'
              e.currentTarget.style.borderColor = '#818cf8'
              e.currentTarget.style.color = '#4f46e5'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.borderColor = '#e2e8f0'
              e.currentTarget.style.color = '#1e293b'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <AppIcon icon={UserIcon} size={20} color="#6366f1" />
            Add User
          </a>
        </div>
      </div>
    </div>
  )
}
