import React, { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  LuArrowLeft,
  LuRefreshCw,
  LuTruck,
  LuPackage,
  LuClock,
  LuCircleCheck,
  LuCopy,
  LuCheck,
  LuExternalLink,
  LuShare2,
  LuMapPin,
  LuShoppingBag,
} from "react-icons/lu";
import { BACKEND_URL } from "../../config";
import "./LiveTrackingPage.css";

const STAGES = [
  { key: "CONFIRMED", label: "Order Confirmed", icon: LuCircleCheck },
  { key: "PROCESSING", label: "Processing", icon: LuClock },
  { key: "PACKED", label: "Packed", icon: LuPackage },
  { key: "SHIPPED", label: "Shipped", icon: LuTruck },
  { key: "IN_TRANSIT", label: "In Transit", icon: LuTruck },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", icon: LuTruck },
  { key: "DELIVERED", label: "Delivered", icon: LuCircleCheck },
];

export default function LiveTrackingPage() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const courierParam = searchParams.get("courier");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const fetchTracking = useCallback(async (isSilent = false) => {
    if (!orderId) return;
    if (!isSilent) setRefreshing(true);

    try {
      const baseUrl = (BACKEND_URL || "").replace(/\/api\/?$/, "");
      const res = await fetch(`${baseUrl}/api/tracking/lookup/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          tracking_query: orderId,
          courier: courierParam || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTrackingData(data);
        setErrorMsg("");
      } else {
        if (!trackingData) {
          setErrorMsg(
            data.error || "Order not found. Please verify your tracking number."
          );
        }
      }
    } catch (err) {
      console.error("Live tracking fetch error:", err);
      if (!trackingData) {
        setErrorMsg("Unable to connect to the tracking server. Please check your connection.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId, courierParam, trackingData]);

  // Initial load
  useEffect(() => {
    fetchTracking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, courierParam]);

  // Auto-refresh: 30-second interval + on window focus
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTracking(true);
    }, 30000);

    const onFocus = () => {
      fetchTracking(true);
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchTracking]);

  const handleCopyTracking = (text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 2000);
    });
  };

  const handleShareLink = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator
        .share({
          title: `MOXIE Order Tracking - ${orderId}`,
          url,
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => {
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
      });
    }
  };

  const getStageIndex = (status) => {
    const s = (status || "").toUpperCase().replace(/[\s_-]+/g, "");
    switch (s) {
      case "CONFIRMED":
      case "PLACED":
      case "PENDING":
        return 0;
      case "PROCESSING":
      case "INPROGRESS":
        return 1;
      case "PACKED":
      case "PACKING":
        return 2;
      case "SHIPPED":
      case "DISPATCHED":
        return 3;
      case "INTRANSIT":
      case "TRANSIT":
        return 4;
      case "OUTFORDELIVERY":
      case "OUTFOR_DELIVERY":
        return 5;
      case "DELIVERED":
      case "COMPLETED":
        return 6;
      default:
        return 0;
    }
  };

  const currentStageIdx = trackingData
    ? getStageIndex(
        trackingData.order_status_normalized || trackingData.order_status
      )
    : 0;

  // Extract actual timestamps from backend status_history without fake fabrication
  const getStageTimestamp = (stageKey) => {
    if (!trackingData?.status_history || !Array.isArray(trackingData.status_history)) {
      return null;
    }

    const normKey = stageKey.toUpperCase().replace(/[\s_-]+/g, "");
    const match = trackingData.status_history.find((h) => {
      const hNorm = (h.status || "").toUpperCase().replace(/[\s_-]+/g, "");
      return hNorm === normKey || hNorm.includes(normKey);
    });

    if (match && match.timestamp) {
      return match.timestamp;
    }

    if (stageKey === "CONFIRMED" && trackingData.order_date) {
      return trackingData.order_date;
    }

    return null;
  };

  // Find latest update checkpoint
  const latestCheckpoint =
    trackingData?.status_history && trackingData.status_history.length > 0
      ? trackingData.status_history[trackingData.status_history.length - 1]
      : null;

  if (loading) {
    return (
      <div className="live-track-loading-screen">
        <div className="live-track-spinner" />
        <p className="loading-text">Fetching live MOXIE tracking data...</p>
      </div>
    );
  }

  if (errorMsg && !trackingData) {
    return (
      <div className="live-track-error-page">
        <div className="error-card-box">
          <span className="error-badge">SHIPMENT NOT FOUND</span>
          <h2 className="error-title">Unable to Locate Order #{orderId}</h2>
          <p className="error-desc">{errorMsg}</p>
          <div className="error-actions">
            <Link to="/track-order" className="btn-back-search">
              ← Return to Tracking Search
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentStatusDisplay =
    trackingData?.order_status || "Order Confirmed";
  const courierDisplayName =
    trackingData?.courier_display_name ||
    (trackingData?.courier_name
      ? trackingData.courier_name.replace(/_/g, " ")
      : null) ||
    "Awaiting Dispatch";
  const trackingNumberDisplay =
    trackingData?.tracking_number || "Available after shipment";
  const hasValidTrackingNumber = !!trackingData?.tracking_number;

  const destinationCity =
    trackingData?.shipping_destination?.city ||
    trackingData?.shipping_destination?.state
      ? `${trackingData.shipping_destination.city || ""}${
          trackingData.shipping_destination.city && trackingData.shipping_destination.state
            ? ", "
            : ""
        }${trackingData.shipping_destination.state || ""} ${
          trackingData.shipping_destination.pincode
            ? `- ${trackingData.shipping_destination.pincode}`
            : ""
        }`
      : "Delivery Address on File";

  const firstItem =
    trackingData?.items && trackingData.items.length > 0
      ? trackingData.items[0]
      : null;

  return (
    <main className="moxie-live-tracking-page">
      <div className="live-track-container">
        {/* 1. Page Header Bar */}
        <div className="live-track-header">
          <div className="header-left-col">
            <Link to="/track-order" className="back-to-track-btn">
              <LuArrowLeft size={16} /> Back to Tracking
            </Link>

            <span className="order-journey-tag">MOXIE ORDER JOURNEY</span>
            <h1 className="live-order-heading">
              Order #{trackingData?.order_number || orderId}
            </h1>
            <p className="live-order-sub">
              {currentStageIdx >= 6
                ? "Your order has been delivered."
                : "Your order is on its way."}
            </p>
          </div>

          <div className="header-right-col">
            <div className="status-pill-badge">
              <LuTruck className="badge-icon" />
              <span>{currentStatusDisplay.toUpperCase()}</span>
            </div>

            <button
              type="button"
              className="btn-refresh-tracking"
              onClick={() => fetchTracking(false)}
              disabled={refreshing}
            >
              <LuRefreshCw
                className={`refresh-icon ${refreshing ? "spin-icon" : ""}`}
              />
              <span>{refreshing ? "Refreshing..." : "Refresh Tracking"}</span>
            </button>
          </div>
        </div>

        {/* 2. 7-Stage Visual Order Journey Timeline */}
        <div className="timeline-journey-card">
          <div className="timeline-track-rail">
            <div
              className="timeline-rail-fill"
              style={{
                width: `${(currentStageIdx / (STAGES.length - 1)) * 100}%`,
              }}
            />
          </div>

          <div className="timeline-stepper-grid">
            {STAGES.map((stg, idx) => {
              const isDone = idx < currentStageIdx;
              const isCurrent = idx === currentStageIdx;
              const StageIcon = stg.icon;
              const stepTime = getStageTimestamp(stg.key);

              let stepState = "future";
              if (isDone) stepState = "completed";
              if (isCurrent) stepState = "current";

              return (
                <div
                  key={stg.key}
                  className={`timeline-step-node ${stepState}`}
                >
                  <div className="step-circle-wrapper">
                    <div className="step-circle">
                      <StageIcon size={16} />
                    </div>
                  </div>

                  <div className="step-text-wrapper">
                    <span className="step-name">{stg.label}</span>
                    {stepTime && (
                      <span className="step-timestamp">{stepTime}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Cards Grid: 2 Columns */}
        <div className="live-track-grid-layout">
          {/* LEFT COLUMN: Shipment Details & Order Items */}
          <div className="track-grid-col">
            {/* Shipment Details Card */}
            <div className="track-detail-card">
              <div className="card-heading-row">
                <LuPackage className="card-heading-icon" />
                <h3 className="card-main-title">Shipment Details</h3>
              </div>

              <div className="detail-key-value-list">
                <div className="kv-row">
                  <span className="kv-key">Order Number</span>
                  <span className="kv-val">
                    {trackingData?.order_number || orderId}
                  </span>
                </div>

                <div className="kv-row">
                  <span className="kv-key">Courier Partner</span>
                  <span className="kv-val courier-brand">
                    {courierDisplayName}
                  </span>
                </div>

                <div className="kv-row">
                  <span className="kv-key">Tracking Number</span>
                  <div className="kv-val-awb">
                    <span className="awb-text-code">
                      {trackingNumberDisplay}
                    </span>
                    {hasValidTrackingNumber && (
                      <button
                        type="button"
                        className="btn-copy-code"
                        title="Copy Tracking Number"
                        onClick={() =>
                          handleCopyTracking(trackingData.tracking_number)
                        }
                      >
                        {copiedTracking ? (
                          <span className="copied-text">
                            <LuCheck size={13} /> Copied!
                          </span>
                        ) : (
                          <span className="copy-action">
                            <LuCopy size={13} /> Copy
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {trackingData?.estimated_delivery && (
                  <div className="kv-row">
                    <span className="kv-key">Estimated Delivery</span>
                    <span className="kv-val est-delivery-val">
                      {trackingData.estimated_delivery}
                    </span>
                  </div>
                )}

                <div className="kv-row">
                  <span className="kv-key">Last Updated</span>
                  <span className="kv-val">
                    {trackingData?.last_updated ||
                      latestCheckpoint?.timestamp ||
                      "Recently"}
                  </span>
                </div>
              </div>

              {/* Carrier External Action Buttons */}
              <div className="card-bottom-actions">
                {trackingData?.tracking_url && hasValidTrackingNumber && (
                  <a
                    href={trackingData.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-carrier-portal"
                  >
                    <span>Track on {courierDisplayName}</span>
                    <LuExternalLink size={14} />
                  </a>
                )}

                <button
                  type="button"
                  className="btn-share-tracking"
                  onClick={handleShareLink}
                >
                  <LuShare2 size={14} />
                  <span>{copiedShare ? "Link Copied!" : "Share"}</span>
                </button>
              </div>
            </div>

            {/* Order Items Card */}
            <div className="track-detail-card">
              <div className="card-heading-row">
                <LuShoppingBag className="card-heading-icon" />
                <h3 className="card-main-title">Order Items</h3>
              </div>

              <div className="order-items-preview-list">
                {firstItem ? (
                  <div className="live-item-row">
                    <div className="live-item-img-wrap">
                      {firstItem.image ? (
                        <img
                          src={firstItem.image}
                          alt={firstItem.product_name}
                          className="live-item-img"
                        />
                      ) : (
                        <LuShoppingBag size={22} color="#94a3b8" />
                      )}
                    </div>

                    <div className="live-item-meta">
                      <h4 className="live-item-name">
                        {firstItem.product_name || "Moxie Product"}
                      </h4>
                      <div className="live-item-sub">
                        <span>Qty: {firstItem.quantity || 1}</span>
                        {firstItem.price && (
                          <span>
                            • ₹{Number(firstItem.price).toLocaleString("en-IN")}
                          </span>
                        )}
                        {firstItem.color && <span>• {firstItem.color}</span>}
                        {firstItem.size && <span>• Size: {firstItem.size}</span>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="no-items-text">Items attached to this order.</p>
                )}
              </div>

              <div className="order-items-total-strip">
                <span className="total-lead">Order Total</span>
                <span className="total-val">
                  ₹
                  {Number(
                    trackingData?.grand_total ||
                      trackingData?.total_amount ||
                      firstItem?.price ||
                      650
                  ).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Latest Update & Delivery Address */}
          <div className="track-grid-col">
            {/* Latest Update Card */}
            <div className="track-detail-card">
              <div className="card-heading-row">
                <LuMapPin className="card-heading-icon" />
                <h3 className="card-main-title">Latest Update</h3>
              </div>

              <div className="latest-update-body">
                <div className="update-status-title">
                  {latestCheckpoint?.status || currentStatusDisplay}
                </div>

                <p className="update-status-message">
                  {latestCheckpoint?.notes ||
                    latestCheckpoint?.message ||
                    (currentStageIdx >= 4 && currentStageIdx < 6
                      ? "Your shipment is currently moving toward the destination hub."
                      : currentStageIdx >= 6
                      ? "Your order has been safely delivered."
                      : "Your order is being processed at our fulfillment facility.")}
                </p>

                {latestCheckpoint?.location && (
                  <div className="update-location-row">
                    <span className="loc-label">Location</span>
                    <span className="loc-val">
                      {latestCheckpoint.location}
                    </span>
                  </div>
                )}

                <div className="update-time-row">
                  <span className="time-label">Updated</span>
                  <span className="time-val">
                    {latestCheckpoint?.timestamp ||
                      trackingData?.last_updated ||
                      "Recently"}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Address Card */}
            <div className="track-detail-card">
              <div className="card-heading-row">
                <LuMapPin className="card-heading-icon" />
                <h3 className="card-main-title">Delivery Address</h3>
              </div>

              <div className="address-card-body">
                <span className="addr-recipient-name">
                  {trackingData?.masked_customer_name || "Customer"}
                </span>
                <p className="addr-destination-text">{destinationCity}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Luxury Bottom Card */}
        <div className="live-track-bottom-banner">
          <div className="bottom-banner-left">
            <span className="moxie-script-slogan">Style Travels Further</span>
          </div>

          <div className="bottom-banner-right">
            <p className="thank-you-text">
              Thank you for choosing MOXIE. We can't wait to see you again.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
