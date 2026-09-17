import React from 'react';
import ReactDOM from 'react-dom/client';
import FeaturedProductsPage from '../components/FeaturedProducts/FeaturedProductsPage';

const container = document.getElementById('react-featured-products-root');
if (container) {
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <FeaturedProductsPage />
    </React.StrictMode>
  );
}
