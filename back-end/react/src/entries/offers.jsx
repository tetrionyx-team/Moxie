import React from 'react';
import ReactDOM from 'react-dom/client';
import OfferListPage from '../components/Offers/OfferListPage';

const container = document.getElementById('react-offers-root');
if (container) {
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <OfferListPage />
    </React.StrictMode>
  );
}

