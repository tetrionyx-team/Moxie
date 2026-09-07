import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Banner from "../../components/Banner/Hero";
import RecommendedForYou from "../../components/RecommendedForYou/RecommendedForYou";
import EditorialWatches from "../../components/EditorialWatches/EditorialWatches";
import Category from "../../components/category/Category";
import MostLovedVideos from "../../components/MostLovedVideos/MostLovedVideos";
import SpecialOffer from "../../components/SpecialOffer/SpecialOffer";
import StyleEssentials from "../../components/StyleEssentials/StyleEssentials";
import PromotionalBanner from "../../components/PromotionalBanner/PromotionalBanner";
import CustomerTestimonials from "../../components/CustomerTestimonials/CustomerTestimonials";
import { useData } from "../../context/DataContext";
import { useModal } from "../../context/ModalContext";

function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openLogin } = useModal();
  const { loading } = useData();

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

  return (
    <>
      <Banner />
      <RecommendedForYou />
      <Category />
      <EditorialWatches />
      <SpecialOffer />
      <MostLovedVideos />
      <StyleEssentials />
      <PromotionalBanner />
      <CustomerTestimonials />
    </>
  );
}

export default Home;
