import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Banner from "../../components/Banner/Hero";
import WatchShowcase from "../../components/WatchShowcase/WatchShowcase";
import RecommendedForYou from "../../components/RecommendedForYou/RecommendedForYou";
import EditorialWatches from "../../components/EditorialWatches/EditorialWatches";
import SpecialOffer from "../../components/SpecialOffer/SpecialOffer";
import MostLovedVideos from "../../components/MostLovedVideos/MostLovedVideos";
import StyleEssentials from "../../components/StyleEssentials/StyleEssentials";
import PromotionalBanner from "../../components/PromotionalBanner/PromotionalBanner";
import CustomerTestimonials from "../../components/CustomerTestimonials/CustomerTestimonials";
import { useModal } from "../../context/ModalContext";

/**
 * Viewport-based lazy loading container with 400px pre-intersection margin.
 * Ensures smooth, progressive loading without layout jumping or blocking first paint.
 */
function LazySection({ children, minHeight = "150px" }) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    // If IntersectionObserver is not available, render immediately
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px" }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Also mount automatically during browser idle time
    const idleId = window.requestIdleCallback
      ? window.requestIdleCallback(() => setIsVisible(true))
      : setTimeout(() => setIsVisible(true), 3000);

    return () => {
      observer.disconnect();
      if (window.cancelIdleCallback) {
        window.cancelIdleCallback(idleId);
      } else {
        clearTimeout(idleId);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: isVisible ? undefined : minHeight,
        contain: isVisible ? "none" : "layout paint",
      }}
    >
      {isVisible ? children : null}
    </div>
  );
}

function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openLogin } = useModal();

  useEffect(() => {
    if (location.state?.openProfile || location.state?.openLogin) {
      openLogin();

      navigate("/", {
        replace: true,
        state: {},
      });
    }
  }, [location.state, navigate, openLogin]);

  // Idle background prefetch for next routes
  useEffect(() => {
    const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    const cancelCallback = window.cancelIdleCallback || clearTimeout;

    const id = idleCallback(() => {
      import("../Products/Products").catch(() => {});
      import("../ProductDetails/ProductDetails").catch(() => {});
    });

    return () => cancelCallback(id);
  }, []);

  return (
    <>
      {/* 1. Above the fold Hero / Banner (Eagerly rendered, prioritized for FCP & LCP) */}
      <Banner />

      {/* 2. Primary Showcase (Featured / Hot Sale) */}
      <WatchShowcase />

      {/* 3. Progressive Below-the-fold Sections */}
      <LazySection minHeight="300px">
        <RecommendedForYou />
      </LazySection>

      <LazySection minHeight="250px">
        <EditorialWatches />
      </LazySection>

      <LazySection minHeight="250px">
        <SpecialOffer />
      </LazySection>

      <LazySection minHeight="350px">
        <MostLovedVideos />
      </LazySection>

      <LazySection minHeight="300px">
        <StyleEssentials />
      </LazySection>

      <LazySection minHeight="200px">
        <PromotionalBanner />
      </LazySection>

      <LazySection minHeight="350px">
        <CustomerTestimonials />
      </LazySection>
    </>
  );
}

export default Home;
