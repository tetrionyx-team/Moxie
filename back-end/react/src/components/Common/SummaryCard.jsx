import React from 'react';

/**
 * SummaryCard — reusable metric card used in Dashboard and ProductList.
 * Props: title, value, sub, icon (SVG string or React element), iconColor (CSS class)
 */
export default function SummaryCard({ title, value, sub, icon, iconColor, style }) {
  const isSvgString = typeof icon === 'string';

  return (
    <div className="metric-card" style={style}>
      <div className={`metric-icon ${iconColor || ''}`}>
        {isSvgString ? (
          <span dangerouslySetInnerHTML={{ __html: icon }} />
        ) : (
          icon
        )}
      </div>
      <div>
        <p>{title}</p>
        <strong>{value}</strong>
        {sub && typeof sub === 'string' ? (
          <small dangerouslySetInnerHTML={{ __html: sub }} />
        ) : sub ? (
          <small>{sub}</small>
        ) : null}
      </div>
    </div>
  );
}

