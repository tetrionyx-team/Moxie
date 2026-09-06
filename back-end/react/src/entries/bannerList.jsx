import { createRoot } from 'react-dom/client'
import BannerListPage from '../components/Banners/BannerListPage'

const container = document.getElementById('react-bannerlist-root')
if (container) {
  createRoot(container).render(<BannerListPage />)
}
