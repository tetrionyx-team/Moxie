export default function CategorySelector() {
  return (
    <>
      <div className="field-box-custom">
        <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
          Category <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <div id="dest-field-category"></div>
      </div>
      <div className="field-box-custom" style={{ gridColumn: '1 / -1' }}>
        <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
          Subcategory <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <div id="dest-field-subcategory"></div>
      </div>
    </>
  )
}
