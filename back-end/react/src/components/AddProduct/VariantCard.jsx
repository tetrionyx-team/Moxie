export default function VariantCard({ variant = {}, index, showSizes = false, onDelete }) {
  const stk = parseInt(variant.stock, 10) || 0
  const displayPrice = variant.discount_price || variant.price || '0'
  const sizesList = variant.sizes && Array.isArray(variant.sizes) ? variant.sizes : []
  const sizesText = sizesList.join(' · ')

  return (
    <div className="variant-summary-item">
      {/* Header: Dot + Color Name + Delete Action */}
      <div className="variant-summary-item-header">
        <div className="variant-summary-color-info">
          <span
            className="variant-summary-dot"
            style={{ backgroundColor: variant.color_code || '#000000' }}
          />
          <span className="variant-summary-name">
            {variant.color_name || `Variant #${index + 1}`}
          </span>
        </div>
        {onDelete && (
          <button
            type="button"
            className="variant-summary-del-btn"
            onClick={() => onDelete(index)}
            title="Remove variant"
            aria-label="Remove variant"
          >
            ×
          </button>
        )}
      </div>

      {/* Details: Price, Stock, Sizes */}
      <div className="variant-summary-details">
        <div className="variant-summary-price">
          ₹{displayPrice}
        </div>
        <div className="variant-summary-stock">
          Stock: <span className={stk > 0 ? 'stock-in' : 'stock-out'}>{stk}</span>
        </div>
        {showSizes && sizesList.length > 0 && (
          <div className="variant-summary-sizes">
            Sizes: <span>{sizesText}</span>
          </div>
        )}
      </div>
    </div>
  )
}
