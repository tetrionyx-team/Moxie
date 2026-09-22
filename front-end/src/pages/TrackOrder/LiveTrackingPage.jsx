import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  LuChevronDown,
} from "react-icons/lu";
import { BACKEND_URL } from "../../config";
import "./LiveTrackingPage.css";

const STAGES = [
  { key: "BOOKED", label: "Booked", icon: LuPackage, matchKeys: ["BOOKED", "CONFIRMED", "PLACED", "PROCESSING", "PACKED"] },
  { key: "DISPATCHED", label: "Dispatched", icon: LuTruck, matchKeys: ["DISPATCHED", "SHIPPED"] },
  { key: "IN_TRANSIT", label: "In Transit", icon: LuTruck, matchKeys: ["IN_TRANSIT", "INTRANSIT", "TRANSIT"] },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", icon: LuTruck, matchKeys: ["OUT_FOR_DELIVERY", "OUTFORDELIVERY"] },
  { key: "DELIVERED", label: "Delivered", icon: LuCircleCheck, matchKeys: ["DELIVERED", "COMPLETED"] },
];

export default function LiveTrackingPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const courierParam = searchParams.get("courier");

  const rawParamId = params.orderId || params.id || params.trackingId || params.trackingNumber || "";
  const queryParamId =
    searchParams.get("tracking") ||
    searchParams.get("tracking_number") ||
    searchParams.get("trackingNumber") ||
    searchParams.get("tracking_id") ||
    searchParams.get("trackingId") ||
    searchParams.get("order") ||
    searchParams.get("order_id") ||
    searchParams.get("orderId") ||
    searchParams.get("id") ||
    searchParams.get("q") ||
    "";

  const orderId = (rawParamId || queryParamId || "").trim();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [errorType, setErrorType] = useState("");
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [selectedEventIndex, setSelectedEventIndex] = useState(null);
  const [showAllCheckpoints, setShowAllCheckpoints] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
  };

  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => {
      setToastMsg("");
    }, 3500);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  const fetchTracking = useCallback(async (isSilent = false) => {
    if (!orderId) {
      setErrorMsg("Tracking number or order ID is required.");
      setErrorType("EMPTY_INPUT");
      setLoading(false);
      return;
    }
    if (!isSilent) setRefreshing(true);

    try {
      const baseUrl = (BACKEND_URL || "").replace(/\/api\/?$/, "");
      const cleanTarget = orderId.trim();
      const res = await fetch(`${baseUrl}/api/tracking/lookup/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          tracking_query: cleanTarget,
          tracking_number: cleanTarget,
          trackingNumber: cleanTarget,
          tracking_id: cleanTarget,
          trackingId: cleanTarget,
          order_id: cleanTarget,
          orderId: cleanTarget,
          query: cleanTarget,
          courier: courierParam || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTrackingData(data);
        setErrorMsg("");
        setErrorType("");
      } else {
        if (!trackingData) {
          setErrorMsg(
            data.error || "Order not found. Please verify your tracking number."
          );
          setErrorType(
            data.error_code ||
              (data.error && data.error.toLowerCase().includes("not been assigned")
                ? "TRACKING_NOT_ASSIGNED"
                : "")
          );
        } else {
          showToast("Unable to refresh tracking right now.");
        }
      }
    } catch (err) {
      console.error("Live tracking fetch error:", err);
      if (!trackingData) {
        setErrorMsg("Unable to connect to the tracking server. Please check your connection.");
        setErrorType("CARRIER_UNAVAILABLE");
      } else {
        showToast("Unable to refresh tracking right now.");
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

  const copyToClipboardSafe = (text, successToast = "Tracking number copied") => {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          showToast(successToast);
        })
        .catch(() => {
          fallbackCopyText(text, successToast);
        });
    } else {
      fallbackCopyText(text, successToast);
    }
  };

  const fallbackCopyText = (text, successToast) => {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      showToast(successToast);
    } catch {
      showToast("Copied to clipboard");
    }
  };

  const handleCopyTracking = (awb) => {
    if (!awb) return;
    copyToClipboardSafe(awb, "Tracking number copied");
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const handleTrackOnCarrier = (e) => {
    const awb = (trackingData?.tracking_number || orderId || "").trim();
    const targetUrl =
      trackingData?.carrier_portal_url ||
      trackingData?.tracking_url ||
      "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx";

    if (awb) {
      copyToClipboardSafe(
        awb,
        "Tracking number copied. Paste it into India Post tracking."
      );
    }

    if (!e.metaKey && !e.ctrlKey) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
      if (e) e.preventDefault();
    }
  };

  const handleShareLink = () => {
    const url = window.location.href;
    const ordNum = trackingData?.order_number || orderId;
    const awb = trackingData?.tracking_number || "";
    const courier = trackingData?.courier || "India Post";

    const shareText = awb
      ? `Track MOXIE shipment #${awb} (${courier}): ${url}`
      : `Track MOXIE Order #${ordNum}: ${url}`;

    if (navigator.share) {
      navigator
        .share({
          title: "MOXIE Order Tracking",
          text: shareText,
          url,
        })
        .catch(() => {
          copyToClipboardSafe(url, "Tracking link copied!");
          setCopiedShare(true);
          setTimeout(() => setCopiedShare(false), 2000);
        });
    } else {
      copyToClipboardSafe(url, "Tracking link copied!");
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  // Helper to parse date and time from timestamp string
  const parseEventDateTime = (rawTimestamp) => {
    if (!rawTimestamp || typeof rawTimestamp !== "string") {
      return { date: "", time: "", formatted: "" };
    }
    const clean = rawTimestamp.trim();
    if (clean.includes(",")) {
      const parts = clean.split(",");
      const datePart = parts[0].trim();
      const timePart = parts.slice(1).join(",").trim();
      return {
        date: datePart,
        time: timePart,
        formatted: `${datePart} • ${timePart}`,
      };
    }
    return { date: clean, time: "", formatted: clean };
  };

  // Deduplicate and sanitize checkpoints from carrier
  const cleanCheckpoints = useMemo(() => {
    const rawList =
      trackingData?.status_history ||
      trackingData?.statusHistory ||
      [];
    if (!Array.isArray(rawList) || rawList.length === 0) return [];

    const seen = new Set();
    const result = [];

    for (const ev of rawList) {
      if (!ev) continue;
      const key = `${(ev.status || "").trim()}|${(ev.location || "").trim()}|${(ev.message || ev.notes || "").trim()}|${(ev.timestamp || ev.date || "").trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(ev);
      }
    }
    return result;
  }, [trackingData]);

  // Set default selected event to LATEST real tracking event
  useEffect(() => {
    if (cleanCheckpoints.length > 0) {
      setSelectedEventIndex(cleanCheckpoints.length - 1);
    } else {
      setSelectedEventIndex(null);
    }
  }, [cleanCheckpoints]);

  const getStageIndex = (statusStr) => {
    if (!statusStr) return 0;
    const s = String(statusStr).toUpperCase().replace(/[\s_-]+/g, "");
    if (s.includes("DELIVERED") || s.includes("COMPLETED")) return 4;
    if (s.includes("OUT") || s.includes("DELIVERY")) return 3;
    if (s.includes("TRANSIT")) return 2;
    if (s.includes("DISPATCH") || s.includes("SHIPPED")) return 1;
    return 0;
  };

  const currentStageIdx = trackingData
    ? getStageIndex(
        trackingData.shipping_status ||
        trackingData.order_status_normalized ||
        trackingData.order_status
      )
    : 0;

  // Find checkpoint corresponding to a stage
  const findCheckpointForStage = (stage) => {
    if (!cleanCheckpoints || cleanCheckpoints.length === 0) return null;
    const matchKeys = stage.matchKeys || [stage.key];
    for (let i = cleanCheckpoints.length - 1; i >= 0; i--) {
      const cp = cleanCheckpoints[i];
      const cpStatus = (cp.status || cp.status_display || "").toUpperCase().replace(/[\s_-]+/g, "");
      for (const mk of matchKeys) {
        const mkClean = mk.toUpperCase().replace(/[\s_-]+/g, "");
        if (cpStatus === mkClean || cpStatus.includes(mkClean)) {
          return { checkpoint: cp, index: i };
        }
      }
    }
    return null;
  };

  const handleStageClick = (stg) => {
    const match = findCheckpointForStage(stg);
    if (match) {
      setSelectedEventIndex(match.index);
    } else if (cleanCheckpoints.length > 0) {
      setSelectedEventIndex(cleanCheckpoints.length - 1);
    }
  };

  const latestCheckpoint =
    cleanCheckpoints.length > 0
      ? cleanCheckpoints[cleanCheckpoints.length - 1]
      : null;

  const selectedEvent =
    selectedEventIndex !== null && cleanCheckpoints[selectedEventIndex]
      ? cleanCheckpoints[selectedEventIndex]
      : latestCheckpoint;

  const selectedDateTime = selectedEvent
    ? parseEventDateTime(selectedEvent.timestamp || selectedEvent.date || selectedEvent.raw_date)
    : { date: "", time: "", formatted: "" };

  if (loading) {
    return (
      <div className="live-track-loading-screen">
        <div className="live-track-spinner" />
        <p className="loading-text">Locating your shipment...</p>
      </div>
    );
  }

  if (errorMsg && !trackingData) {
    const isTrackingPending =
      errorType === "TRACKING_NOT_ASSIGNED" ||
      errorMsg.toLowerCase().includes("not been assigned") ||
      errorMsg.toLowerCase().includes("not available yet");
    const isOrderNotFound = errorType === "ORDER_NOT_FOUND";

    return (
      <div className="live-track-error-page">
        <div className="error-card-box">
          <span
            className={`error-badge ${
              isTrackingPending
                ? "badge-pending"
                : isOrderNotFound
                ? "badge-order-not-found"
                : ""
            }`}
          >
            {isTrackingPending
              ? "AWAITING DISPATCH"
              : isOrderNotFound
              ? "ORDER NOT FOUND"
              : "SHIPMENT NOT FOUND"}
          </span>
          <h2 className="error-title">
            {isTrackingPending
              ? `Tracking Pending for Order #${orderId}`
              : isOrderNotFound
              ? `Unable to Locate Order #${orderId}`
              : `Unable to Locate Shipment #${orderId}`}
          </h2>
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

  const hasLinkedOrder = Boolean(
    trackingData?.has_linked_order !== false &&
      trackingData?.order_number &&
      !trackingData.order_number.toUpperCase().startsWith("ET")
  );

  const currentStatusDisplay =
    trackingData?.shipping_status_display ||
    trackingData?.shipping_status ||
    trackingData?.order_status ||
    "Order Confirmed";

  const courierDisplayName =
    trackingData?.courier_display_name ||
    trackingData?.courier ||
    (trackingData?.courier_name
      ? trackingData.courier_name.replace(/_/g, " ")
      : null) ||
    "India Post";

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
      : trackingData?.current_location || "";

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

            <span className="order-journey-tag">
              {hasLinkedOrder ? "MOXIE ORDER JOURNEY" : "COURIER SHIPMENT JOURNEY"}
            </span>
            <h1 className="live-order-heading">
              {hasLinkedOrder
                ? `Order #${trackingData.order_number}`
                : `Shipment #${trackingData?.tracking_number || orderId}`}
            </h1>
            <p className="live-order-sub">
              {currentStageIdx >= 4
                ? "Your order has been safely delivered."
                : currentStageIdx >= 1
                ? "Your shipment is on its way."
                : "Your order is confirmed."}
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

        {/* 2. Interactive Visual Order Journey Timeline with Click Details */}
        <div className="timeline-journey-card">
          <div className="timeline-track-rail">
            <div
              className="timeline-rail-fill"
              style={{
                width: `${(currentStageIdx / (STAGES.length - 1)) * 100}%`,
              }}
            />
          </div>

          <div className="timeline-stepper-grid" role="tablist" aria-label="Tracking stages">
            {STAGES.map((stg, idx) => {
              const isDone = idx < currentStageIdx;
              const isCurrent = idx === currentStageIdx;
              const StageIcon = stg.icon;
              const stageMatch = findCheckpointForStage(stg);
              const stageCheckpoint = stageMatch ? stageMatch.checkpoint : null;
              const isSelected = stageMatch ? selectedEventIndex === stageMatch.index : (isCurrent && selectedEventIndex === cleanCheckpoints.length - 1);

              let stepState = "future";
              if (isDone) stepState = "completed";
              if (isCurrent) stepState = "current";

              const dt = stageCheckpoint
                ? parseEventDateTime(stageCheckpoint.timestamp || stageCheckpoint.date)
                : null;

              return (
                <button
                  type="button"
                  key={stg.key}
                  onClick={() => handleStageClick(stg)}
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={`${stg.label} stage ${isSelected ? "selected" : ""}`}
                  className={`timeline-step-node ${stepState} ${isSelected ? "is-selected-step" : ""}`}
                >
                  <div className="step-circle-wrapper">
                    <div className="step-circle">
                      <StageIcon size={16} />
                    </div>
                  </div>

                  <div className="step-text-wrapper">
                    <span className="step-name">{stg.label}</span>
                    {dt && dt.date && (
                      <span className="step-timestamp">{dt.date}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Event Details Card directly below timeline */}
          {selectedEvent && (
            <div
              className="selected-checkpoint-detail-card"
              role="region"
              aria-label="Selected Event Details"
            >
              <div className="checkpoint-detail-header">
                <div className="checkpoint-status-badge">
                  <span className="detail-status-pill">
                    {selectedEvent.status || selectedEvent.status_display}
                  </span>
                  {selectedEventIndex === cleanCheckpoints.length - 1 && (
                    <span className="latest-indicator-tag">LATEST UPDATE</span>
                  )}
                </div>
                {selectedDateTime.formatted && (
                  <div className="checkpoint-datetime-strip">
                    <LuClock className="detail-clock-icon" />
                    <span className="checkpoint-date">{selectedDateTime.date}</span>
                    {selectedDateTime.time && (
                      <>
                        <span className="checkpoint-dot">•</span>
                        <span className="checkpoint-time">{selectedDateTime.time}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="checkpoint-detail-body">
                {selectedEvent.location && (
                  <div className="checkpoint-location-strip">
                    <LuMapPin className="detail-pin-icon" />
                    <span className="checkpoint-loc-text">{selectedEvent.location}</span>
                  </div>
                )}

                {(selectedEvent.notes || selectedEvent.message) && (
                  <p className="checkpoint-message-text">
                    {selectedEvent.notes || selectedEvent.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Full Checkpoint History Accordion (for multi-event inspections) */}
          {cleanCheckpoints.length > 1 && (
            <div className="all-checkpoints-accordion">
              <button
                type="button"
                className="btn-toggle-checkpoints"
                onClick={() => setShowAllCheckpoints(!showAllCheckpoints)}
                aria-expanded={showAllCheckpoints}
              >
                <span>
                  {showAllCheckpoints
                    ? "Hide Full Checkpoint History"
                    : `View Full Checkpoint History (${cleanCheckpoints.length} updates)`}
                </span>
                <LuChevronDown
                  className={`accordion-chevron ${showAllCheckpoints ? "rotate-180" : ""}`}
                />
              </button>

              {showAllCheckpoints && (
                <div className="checkpoints-history-list">
                  {cleanCheckpoints.map((cp, cIdx) => {
                    const dt = parseEventDateTime(cp.timestamp || cp.date);
                    const isRowSelected = selectedEventIndex === cIdx;
                    return (
                      <div
                        key={cIdx}
                        className={`checkpoint-history-item ${isRowSelected ? "active-item" : ""}`}
                        onClick={() => setSelectedEventIndex(cIdx)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setSelectedEventIndex(cIdx);
                          }
                        }}
                      >
                        <div className="history-item-left">
                          <div className="history-status-name">
                            {cp.status || cp.status_display}
                            {cIdx === cleanCheckpoints.length - 1 && (
                              <span className="history-latest-pill">Latest</span>
                            )}
                          </div>
                          {(cp.notes || cp.message) && (
                            <div className="history-msg">{cp.notes || cp.message}</div>
                          )}
                          {cp.location && (
                            <div className="history-loc">
                              <LuMapPin size={12} /> {cp.location}
                            </div>
                          )}
                        </div>
                        <div className="history-item-right">
                          <span className="history-date">{dt.date}</span>
                          {dt.time && <span className="history-time">{dt.time}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
                {hasLinkedOrder && (
                  <div className="kv-row">
                    <span className="kv-key">Order Number</span>
                    <span className="kv-val">{trackingData.order_number}</span>
                  </div>
                )}

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
                    onClick={handleTrackOnCarrier}
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

            {/* Order Items Card (Only when linked order items exist) */}
            {hasLinkedOrder && firstItem && (
              <div className="track-detail-card">
                <div className="card-heading-row">
                  <LuShoppingBag className="card-heading-icon" />
                  <h3 className="card-main-title">Order Items</h3>
                </div>

                <div className="order-items-preview-list">
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
                </div>

                {trackingData?.grand_total !== undefined &&
                  trackingData?.grand_total !== null && (
                    <div className="order-items-total-strip">
                      <span className="total-lead">Order Total</span>
                      <span className="total-val">
                        ₹
                        {Number(
                          trackingData.grand_total ||
                            trackingData.total_amount ||
                            firstItem.price ||
                            0
                        ).toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
              </div>
            )}
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
                  {latestCheckpoint?.status || latestCheckpoint?.status_display || currentStatusDisplay}
                </div>

                <p className="update-status-message">
                  {latestCheckpoint?.notes ||
                    latestCheckpoint?.message ||
                    (currentStageIdx >= 4
                      ? "Your order has been safely delivered."
                      : currentStageIdx >= 2
                      ? "Your shipment is currently in transit."
                      : "Your order has been booked.")}
                </p>

                {latestCheckpoint?.location && (
                  <div className="update-location-row">
                    <span className="loc-label">Location</span>
                    <span className="loc-val">
                      {latestCheckpoint.location}
                    </span>
                  </div>
                )}

                {(latestCheckpoint?.timestamp || trackingData?.last_updated) && (
                  <div className="update-time-row">
                    <span className="time-label">Date & Time</span>
                    <span className="time-val">
                      {latestCheckpoint?.timestamp ||
                        trackingData?.last_updated}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Address Card */}
            {(hasLinkedOrder || destinationCity) && (
              <div className="track-detail-card">
                <div className="card-heading-row">
                  <LuMapPin className="card-heading-icon" />
                  <h3 className="card-main-title">Delivery Address</h3>
                </div>

                <div className="address-card-body">
                  {trackingData?.masked_customer_name && (
                    <span className="addr-recipient-name">
                      {trackingData.masked_customer_name}
                    </span>
                  )}
                  {destinationCity && (
                    <p className="addr-destination-text">{destinationCity}</p>
                  )}
                </div>
              </div>
            )}
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

      {/* Floating Toast Feedback */}
      {toastMsg && (
        <div className="live-track-toast" role="alert">
          <LuCheck size={16} className="toast-icon" />
          <span>{toastMsg}</span>
        </div>
      )}
    </main>
  );
}
