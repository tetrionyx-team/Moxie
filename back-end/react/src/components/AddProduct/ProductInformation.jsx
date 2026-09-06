import CategorySelector from './CategorySelector'
import DescriptionSection from './DescriptionSection'

export default function ProductInformation() {
  return (
    <div className="panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #edf2f7', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
      <h2 style={{ fontSize: '15px', fontWeight: 750, borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginTop: 0, marginBottom: '18px', color: '#0f172a' }}>
        Product Information
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div className="field-box-custom">
          <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
            Product Name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div id="dest-field-name"></div>
        </div>
        <CategorySelector />
      </div>

      {/* Hidden price/stock/discount inputs – populated automatically from color variant values */}
      <span style={{ display: 'none' }}>
        <span id="dest-field-price"></span>
        <span id="dest-field-discount_price"></span>
        <span id="dest-field-stock"></span>
      </span>

      <DescriptionSection />
    </div>
  )
}
