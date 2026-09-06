import ColorVariantsManager from './ColorVariantsManager'

export default function ColorVariantSection({ variants = [], setVariants, sizeType = null }) {
  return (
    <div className="panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #edf2f7', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
      <ColorVariantsManager variants={variants} setVariants={setVariants} sizeType={sizeType} />
    </div>
  )
}
