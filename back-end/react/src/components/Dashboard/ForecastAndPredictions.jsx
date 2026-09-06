import React from 'react'
import { AppIcon, SparklesIcon, PaymentIcon, ShoppingBagIcon } from '../../icons'

export default function ForecastAndPredictions({ forecast = {}, summary = {} }) {
  const hasData = forecast.has_sufficient_data !== false

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
            <AppIcon icon={SparklesIcon} size={20} color="#6366f1" />
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
              Future Sales & Revenue Forecast
            </h2>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
            Predictive time-series model based on real historical sales velocity
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#6366f1', background: '#eef2ff', padding: '4px 10px', borderRadius: '10px' }}>
            Confidence: {forecast.confidence_score || 'Calculating...'}
          </span>
          <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#059669', background: '#ecfdf5', padding: '4px 8px', borderRadius: '8px', letterSpacing: '0.04em' }}>
            PREDICTED
          </span>
        </div>
      </div>

      {hasData ? (
        <>
          {/* Projection Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              marginBottom: '16px'
            }}
          >
            {/* 7-Day Forecast */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748b' }}>Next 7 Days</span>
                <AppIcon icon={PaymentIcon} size={15} color="#6366f1" />
              </div>
              <strong style={{ display: 'block', fontSize: '19px', fontWeight: '800', color: '#0f172a' }}>
                ₹{Number(forecast.predicted_7d_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
              <small style={{ fontSize: '11px', color: '#64748b' }}>
                Est. ~{forecast.predicted_7d_sales || 0} units demand
              </small>
            </div>

            {/* 30-Day Forecast */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748b' }}>Next 30 Days</span>
                <AppIcon icon={ShoppingBagIcon} size={15} color="#10b981" />
              </div>
              <strong style={{ display: 'block', fontSize: '19px', fontWeight: '800', color: '#0f172a' }}>
                ₹{Number(forecast.predicted_30d_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
              <small style={{ fontSize: '11px', color: '#64748b' }}>
                Est. ~{forecast.predicted_30d_sales || 0} units demand
              </small>
            </div>

            {/* 3-Month Forecast */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748b' }}>Next 3 Months (Quarter)</span>
                <AppIcon icon={PaymentIcon} size={15} color="#3b82f6" />
              </div>
              <strong style={{ display: 'block', fontSize: '19px', fontWeight: '800', color: '#0f172a' }}>
                ₹{Number(forecast.predicted_3m_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
              <small style={{ fontSize: '11px', color: '#64748b' }}>
                Est. ~{forecast.predicted_3m_sales || 0} units demand
              </small>
            </div>

            {/* Expected Growth Rate */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748b' }}>Projected Momentum</span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: (forecast.expected_growth_pct || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                  {(forecast.expected_growth_pct || 0) >= 0 ? '↑' : '↓'} {Math.abs(forecast.expected_growth_pct || 0)}%
                </span>
              </div>
              <strong style={{ display: 'block', fontSize: '19px', fontWeight: '800', color: '#0f172a' }}>
                {(forecast.expected_growth_pct || 0) >= 0 ? '+' : ''}{forecast.expected_growth_pct || 0}%
              </strong>
              <small style={{ fontSize: '11px', color: '#64748b' }}>
                vs. prior historical run-rate
              </small>
            </div>
          </div>

          {/* Model Rationale & Profit Disclaimer */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#f1f5f9',
              borderRadius: '10px',
              fontSize: '11.5px',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <span>
              ℹ️ <strong>Calculation Source:</strong> Moving-average sales velocity from active store orders. Projections adapt dynamically as new orders are placed.
            </span>
            <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>
              {forecast.cost_profit_note}
            </span>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '36px 20px', color: '#94a3b8', fontSize: '13px' }}>
          <AppIcon icon={SparklesIcon} size={36} color="#cbd5e1" />
          <p style={{ margin: '8px 0 2px', fontWeight: '600' }}>Prediction requires more historical sales data.</p>
          <small>As more customer orders are placed, predictive sales and revenue models will activate automatically.</small>
        </div>
      )}
    </div>
  )
}
