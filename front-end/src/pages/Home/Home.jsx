import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Banner from "../../components/Banner/Hero";
import RecommendedForYou from "../../components/RecommendedForYou/RecommendedForYou";
import EditorialWatches from "../../components/EditorialWatches/EditorialWatches";
import MostLovedVideos from "../../components/MostLovedVideos/MostLovedVideos";
import SpecialOffer from "../../components/SpecialOffer/SpecialOffer";
import ProductShelf from "../../components/Product/ProductShelf";
import StyleEssentials from "../../components/StyleEssentials/StyleEssentials";
import PromotionalBanner from "../../components/PromotionalBanner/PromotionalBanner";
import CustomerTestimonials from "../../components/CustomerTestimonials/CustomerTestimonials";
import { useData } from "../../context/DataContext";
import { useModal } from "../../context/ModalContext";


function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openLogin } = useModal();
  const { products, loading } = useData();

  useEffect(() => {
    if (location.state?.openProfile || location.state?.openLogin) {
      openLogin();

      navigate("/", {
        replace: true,
        state: {},
      });
    }
  }, [location.state, navigate, openLogin]);
  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-warning" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  // 1. Get all in-stock products
  const inStockProducts = products.filter((p) => p.stock);

  // 2. Filter in-stock new arrivals
  const newArrivals = inStockProducts.filter((p) => p.isNew);

  // 3. Mix all in-stock products alternately by category for "Our Collection"
  const categoriesMap = {};
  inStockProducts.forEach((p) => {
    if (!categoriesMap[p.category]) {
      categoriesMap[p.category] = [];
    }
    categoriesMap[p.category].push(p);
  });

  const categoryKeys = Object.keys(categoriesMap);
  const mixedProducts = [];
  const maxCategoryLength = categoryKeys.length > 0 
    ? Math.max(...categoryKeys.map((k) => categoriesMap[k].length)) 
    : 0;

  for (let i = 0; i < maxCategoryLength; i++) {
    categoryKeys.forEach((k) => {
      if (i < categoriesMap[k].length) {
        mixedProducts.push(categoriesMap[k][i]);
      }
    });
  }

  const half = Math.ceil(mixedProducts.length / 2);
  const ourCollection1 = mixedProducts.slice(0, half);
  const ourCollection2 = mixedProducts.slice(half);

  return (
    <>
      <Banner />
      <RecommendedForYou />
      <EditorialWatches />
      <SpecialOffer />
      <MostLovedVideos />
      <StyleEssentials />
      <PromotionalBanner />
      <CustomerTestimonials />
      <ProductShelf eyebrow="Just dropped" title="New Arrivals" products={newArrivals} />
      <ProductShelf eyebrow="Explore Collection" title="Our Collection" products={ourCollection1} centerHeading={true} />
      <ProductShelf products={ourCollection2} hideHeading={true} />
    </>
  );
}


export default Home;
