import React from 'react'
import {
  AppIcon,
  PaymentIcon,
  OrderIcon,
  ProductIcon,
  ShoppingBagIcon,
  InvoiceIcon,
  StoreIcon,
  SparklesIcon,
  CancelCircleIcon,
  EyeOffIcon,
} from '../../icons'

export default function KpiCardsSection({ summary = {} }) {
  const unavailCount = summary.unavailable_products_count !== undefined
    ? summary.unavailable_products_count
    : (summary.unavailable_count || 0)

  const cards = [
    {
      title: 'Total Sales',
      value: `₹${Number(summary.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: summary.revenue_change_pct || 0,
      isUp: summary.revenue_trend_up !== false,
      icon: PaymentIcon,
      color: 'green',
    },
    {
      title: 'Total Orders',
      value: (summary.total_orders || 0).toLocaleString('en-IN'),
      change: summary.orders_change_pct || 0,
      isUp: summary.orders_trend_up !== false,
      icon: OrderIcon,
      color: 'purple',
    },
    {
      title: 'Total Products',
      value: summary.total_products || 0,
      badge: `${summary.active_products || 0} active`,
      icon: ProductIcon,
      color: 'amber',
    },
    {
      title: 'Current Stock',
      value: (summary.current_stock || 0).toLocaleString('en-IN'),
      badge: `${summary.in_stock_count || 0} healthy`,
      icon: StoreIcon,
      color: 'purple',
    },
    {
      title: 'Low Stock Products',
      value: summary.low_stock_count || 0,
      badge: summary.low_stock_count > 0 ? 'Action needed' : 'All safe',
      badgeColor: summary.low_stock_count > 0 ? '#f59e0b' : '#10b981',
      icon: SparklesIcon,
      color: 'amber',
    },
    {
      title: 'Out of Stock',
      value: summary.out_of_stock_count || 0,
      badge: summary.out_of_stock_count > 0 ? 'Urgent Restock' : '0 Out of stock',
      badgeColor: summary.out_of_stock_count > 0 ? '#ef4444' : '#10b981',
      icon: CancelCircleIcon,
      color: 'red',
    },
    {
      title: 'Unavailable Products',
      value: unavailCount,
      badge: unavailCount > 0 ? `${unavailCount} unavailable` : '0 unavailable',
      badgeColor: unavailCount > 0 ? '#f59e0b' : '#10b981',
      icon: EyeOffIcon,
      color: 'amber',
    },
  ]

  const colorStyles = {
    green: {
      background: 'linear-gradient(145deg, #4dcc65, #30af54)',
      boxShadow: '0 8px 16px rgba(49, 183, 88, 0.18)',
    },
    purple: {
      background: 'linear-gradient(145deg, #7772ff, #5746eb)',
      boxShadow: '0 8px 16px rgba(93, 74, 235, 0.2)',
    },
    amber: {
      background: 'linear-gradient(145deg, #f7b13b, #ee951c)',
      boxShadow: '0 8px 16px rgba(238, 151, 31, 0.18)',
    },
    blue: {
      background: 'linear-gradient(145deg, #3da9fa, #247fe8)',
      boxShadow: '0 8px 16px rgba(44, 137, 235, 0.18)',
    },
    red: {
      background: 'linear-gradient(145deg, #f87171, #ef4444)',
      boxShadow: '0 8px 16px rgba(239, 68, 68, 0.2)',
    },
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}
    >
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="metric-card"
        >
          {/* Icon Badge */}
          <div
            className={`metric-icon ${card.color}`}
            style={{
              ...(colorStyles[card.color] || colorStyles.purple)
            }}
          >
            <AppIcon icon={card.icon} size={22} color="#ffffff" />
          </div>

          {/* Details */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
              {card.title}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                {card.value}
              </strong>

              {card.change !== undefined ? (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: card.isUp ? '#10b981' : '#ef4444',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                    backgroundColor: card.isUp ? '#ecfdf5' : '#fef2f2',
                    padding: '2px 6px',
                    borderRadius: '6px'
                  }}
                >
                  {card.isUp ? '↑' : '↓'} {Math.abs(card.change)}%
                </span>
              ) : card.badge ? (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: card.badgeColor || '#6366f1',
                    backgroundColor: card.badgeColor ? `${card.badgeColor}15` : '#eef2ff',
                    padding: '2px 6px',
                    borderRadius: '6px'
                  }}
                >
                  {card.badge}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
