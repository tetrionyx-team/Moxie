/**
 * Moxie Admin Invoice & Dispatch Slip Generator
 * Generates high-fidelity, print-ready HTML/PDF invoices for customer orders.
 */

export function getCleanOrderId(order) {
  if (!order) return "MOX-0001";
  let raw = order.orderId || order.order_number || (order.id ? String(order.id) : "0001");
  raw = String(raw).trim();
  raw = raw.replace(/^(MOX-?)+/i, "");
  if (!isNaN(Number(raw))) {
    return `MOX-${raw.padStart(4, "0")}`;
  }
  return `MOX-${raw}`;
}

export function generateInvoiceHtml(order) {
  if (!order) return "";

  const orderId = getCleanOrderId(order);
  const orderDate = order.orderDate || order.date || (order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN"));
  const customerName = order.customerName || order.customer?.name || order.shippingAddress?.name || "Customer";
  const mobile = order.mobile || order.customer?.phone || order.shippingAddress?.phone || "—";
  const email = order.email || order.customer?.email || "customer@example.com";
  const address = order.address || order.shippingAddress?.address || order.shippingAddress?.flat || "—";
  const city = order.city || order.shippingAddress?.city || "—";
  const district = order.district || order.shippingAddress?.district || city || "—";
  const pinCode = order.pinCode || order.pincode || order.shippingAddress?.pincode || "—";
  
  const paymentMethod = order.paymentMethod || order.paymentInfo?.method || (order.razorpayOrderId && !order.razorpayOrderId.startsWith('cod_') ? "UPI" : "COD");
  const paymentStatus = order.paymentStatus || order.paymentInfo?.status || "Pending";
  const orderStatus = order.orderStatus || order.status || "Confirmed";
  const courier = order.courier_name || order.courier || order.courierPartner || "ST Courier";
  const trackingId = order.tracking_number || order.trackingId || order.tracking_id || "";

  const subtotal = Number(order.subtotal || order.subtotalAmount || order.pricing?.subtotal || order.totalAmount || order.total || 0);
  const discount = Number(order.discount || order.discountAmount || order.pricing?.discount || 0);
  const shipping = Number(order.deliveryCharge || order.shippingCharge || order.shippingAmount || order.pricing?.shipping || 0);
  const grandTotal = Number(order.grandTotal || order.total || order.totalAmount || order.pricing?.total || 0);
  const amountPaid = Number(order.amountPaid !== undefined ? order.amountPaid : (paymentStatus === 'Paid' ? grandTotal : (order.codAdvancePaid ? 100 : 0)));
  const balanceDue = Number(order.balanceDue !== undefined ? order.balanceDue : (paymentStatus === 'Paid' ? 0 : Math.max(0, grandTotal - amountPaid)));
  const transactionId = order.transactionRef || order.razorpayPaymentId || order.razorpay_payment_id || order.paymentInfo?.razorpayPaymentId || "—";

  const items = Array.isArray(order.products) && order.products.length > 0
    ? order.products
    : Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : [
        {
          productName: order.name || "Moxie Item",
          quantity: order.quantity || 1,
          price: order.price || grandTotal,
          size: order.variant || "Standard",
          color: "Default",
          image: order.image
        }
      ];

  const itemsRowsHtml = items.map((item, index) => {
    const pName = item.productName || item.name || "Moxie Product";
    const pQty = Number(item.quantity || 1);
    const pPrice = Number(item.price || 0);
    const pTotal = pPrice * pQty;
    const pVariant = item.size ? `Size: ${item.size}` : (item.variant || "");
    const pColor = item.color ? `Color: ${item.color}` : "";
    const variantStr = [pVariant, pColor].filter(Boolean).join(" • ");

    return `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b; font-weight: 600;">${index + 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-weight: 700; color: #0f172a; font-size: 13.5px;">${pName}</div>
          ${variantStr ? `<div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">${variantStr}</div>` : ""}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: #0f172a;">${pQty}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #0f172a;">₹${pPrice.toLocaleString("en-IN")}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #0f172a;">₹${pTotal.toLocaleString("en-IN")}</td>
      </tr>
    `;
  }).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${orderId}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Cinzel:wght@600;700;800&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 24px;
      font-size: 13px;
      line-height: 1.5;
    }

    .invoice-wrapper {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 32px;
    }

    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #071426;
      padding-bottom: 20px;
      margin-bottom: 24px;
      gap: 20px;
    }

    .brand-title {
      font-family: 'Cinzel', serif;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 0.12em;
      color: #071426;
      text-transform: uppercase;
    }

    .brand-sub {
      font-size: 11.5px;
      color: #c99b45;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .store-meta {
      margin-top: 8px;
      font-size: 11.5px;
      color: #64748b;
      line-height: 1.5;
    }

    .invoice-title-block {
      text-align: right;
    }

    .invoice-badge {
      display: inline-block;
      background: #071426;
      color: #c99b45;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .invoice-meta-line {
      font-size: 12.5px;
      color: #334155;
      margin-bottom: 3px;
    }

    .invoice-meta-line strong {
      color: #0f172a;
    }

    /* Grid Sections */
    .section-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #071426;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }

    .to-card {
      background: #fdfbf7;
      border: 1px solid #faeccb;
      border-radius: 8px;
      padding: 16px;
    }

    .to-card .section-title {
      color: #854d0e;
      border-bottom-color: #f3e8cf;
    }

    .to-row {
      margin-bottom: 5px;
      font-size: 13px;
      color: #334155;
    }

    .to-row strong {
      color: #0f172a;
      display: inline-block;
      min-width: 80px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }

    .items-table th {
      background: #f1f5f9;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 10px 12px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
      text-align: left;
    }

    .pricing-summary-wrap {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }

    .pricing-table {
      width: 280px;
      border-collapse: collapse;
      font-size: 12.5px;
    }

    .pricing-table td {
      padding: 5px 8px;
      color: #475569;
    }

    .pricing-table td.val {
      text-align: right;
      font-weight: 600;
      color: #0f172a;
    }

    .pricing-table tr.grand-total td {
      border-top: 2px solid #071426;
      border-bottom: 2px solid #071426;
      font-size: 15px;
      font-weight: 800;
      color: #071426;
      padding: 8px 8px;
    }

    .pill-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .pill-badge.paid { background: #dcfce7; color: #166534; }
    .pill-badge.pending { background: #fef3c7; color: #b45309; }
    .pill-badge.cancelled { background: #fee2e2; color: #991b1b; }

    .invoice-footer {
      margin-top: 28px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 20px;
    }

    .footer-note {
      font-size: 11px;
      color: #64748b;
      line-height: 1.5;
      max-width: 480px;
    }

    .footer-stamp {
      text-align: right;
      font-size: 11px;
      color: #475569;
    }

    .stamp-seal {
      display: inline-block;
      border: 1.5px solid #c99b45;
      color: #c99b45;
      padding: 4px 10px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-radius: 4px;
      margin-top: 4px;
    }

    @media print {
      body {
        padding: 0;
        background: #ffffff;
      }
      .invoice-wrapper {
        border: none;
        padding: 0;
        max-width: 100%;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <!-- Header -->
    <div class="invoice-header">
      <div>
        <div class="brand-title">MOXIE</div>
        <div class="brand-sub">LUXURY TIMEPIECES</div>
        <div class="store-meta">
          Official Moxie Store • Support: +91 7871327802 / +91 7448327802<br/>
          Email: support@moxietimepieces.com • Web: www.moxie.in
        </div>
      </div>
      <div class="invoice-title-block">
        <div class="invoice-badge">TAX INVOICE / DISPATCH SLIP</div>
        <div class="invoice-meta-line"><strong>Order ID:</strong> <span style="font-family: monospace; font-size: 14px; font-weight: 800; color: #c99b45;">${orderId}</span></div>
        <div class="invoice-meta-line"><strong>Invoice Date:</strong> ${orderDate}</div>
        <div class="invoice-meta-line"><strong>Order Status:</strong> ${orderStatus}</div>
        <div class="invoice-meta-line"><strong>Payment:</strong> <span class="pill-badge ${(paymentStatus || 'pending').toLowerCase()}">${paymentStatus}</span></div>
      </div>
    </div>

    <!-- Customer Address (TO) & Order Summary Meta Grid -->
    <div class="info-grid">
      <!-- TO: Customer Details -->
      <div class="to-card">
        <div class="section-title">📍 TO (DELIVERY ADDRESS)</div>
        <div class="to-row"><strong>Name:</strong> <span style="font-weight: 700; color: #0f172a;">${customerName}</span></div>
        <div class="to-row"><strong>Mobile:</strong> ${mobile}</div>
        <div class="to-row"><strong>Email:</strong> ${email}</div>
        <div class="to-row"><strong>Address:</strong> ${address}</div>
        <div class="to-row"><strong>City:</strong> ${city}</div>
        <div class="to-row"><strong>District:</strong> ${district}</div>
        <div class="to-row"><strong>PIN Code:</strong> <span style="font-weight: 700; color: #0f172a;">${pinCode}</span></div>
      </div>

      <!-- Shipping & Payment Details -->
      <div class="section-box" style="margin-bottom: 0;">
        <div class="section-title">📦 SHIPMENT & PAYMENT DETAILS</div>
        <div class="to-row"><strong>Payment Mode:</strong> ${paymentMethod}</div>
        <div class="to-row"><strong>Payment Status:</strong> ${paymentStatus}</div>
        <div class="to-row"><strong>Courier Partner:</strong> ${courier}</div>
        <div class="to-row"><strong>Tracking / AWB:</strong> <span style="font-family: monospace; font-weight: 700; color: #c99b45;">${trackingId || "Pending Dispatch"}</span></div>
        <div class="to-row"><strong>Transaction Ref:</strong> <span style="font-family: monospace; font-size: 11.5px;">${transactionId}</span></div>
        ${order.codAdvancePaid ? `<div class="to-row" style="color: #166534; font-weight: 600;"><strong>COD Advance:</strong> ₹100 Paid Online</div>` : ""}
      </div>
    </div>

    <!-- Order Items (Below Customer Address) -->
    <div class="section-box" style="padding: 12px;">
      <div class="section-title" style="margin-bottom: 6px;">🛍️ ORDER DETAILS & ITEMS (${items.length})</div>
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th>PRODUCT DESCRIPTION</th>
            <th style="width: 60px; text-align: center;">QTY</th>
            <th style="width: 100px; text-align: right;">PRICE</th>
            <th style="width: 110px; text-align: right;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRowsHtml}
        </tbody>
      </table>

      <!-- Financial Calculation -->
      <div class="pricing-summary-wrap">
        <table class="pricing-table">
          <tr>
            <td>Subtotal</td>
            <td class="val">₹${subtotal.toLocaleString("en-IN")}</td>
          </tr>
          ${discount > 0 ? `
          <tr style="color: #166534;">
            <td>Discount</td>
            <td class="val" style="color: #166534;">-₹${discount.toLocaleString("en-IN")}</td>
          </tr>` : ""}
          <tr>
            <td>Delivery / Shipping</td>
            <td class="val">${shipping > 0 ? `₹${shipping.toLocaleString("en-IN")}` : "FREE"}</td>
          </tr>
          <tr class="grand-total">
            <td>Grand Total</td>
            <td class="val">₹${grandTotal.toLocaleString("en-IN")}</td>
          </tr>
          <tr>
            <td style="color: #166534; font-weight: 600;">Amount Paid</td>
            <td class="val" style="color: #166534; font-weight: 700;">₹${amountPaid.toLocaleString("en-IN")}</td>
          </tr>
          ${balanceDue > 0 ? `
          <tr style="color: #b45309; font-weight: 700;">
            <td>Balance Due (COD)</td>
            <td class="val" style="color: #b45309;">₹${balanceDue.toLocaleString("en-IN")}</td>
          </tr>` : ""}
        </table>
      </div>
    </div>

    <!-- Footer Terms & Stamp -->
    <div class="invoice-footer">
      <div class="footer-note">
        <strong>Important Notice & Return Policy:</strong><br/>
        • Please record a continuous, unedited 360° unboxing video showing the shipping label and package opening for any verification, transit damage, or replacement inquiries.<br/>
        • For direct owner assistance, WhatsApp or call: <strong>+91 7871327802</strong> / <strong>+91 7448327802</strong>.
      </div>
      <div class="footer-stamp">
        <div>Authorized Signatory</div>
        <div style="font-weight: 700; color: #071426; margin-top: 2px;">MOXIE TIMEPIECES</div>
        <div class="stamp-seal">VERIFIED INVOICE</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Triggers native browser print / save-to-pdf dialog
 */
export function printOrderInvoice(order) {
  const htmlContent = generateInvoiceHtml(order);
  const printWindow = window.open("", "_blank", "width=850,height=900");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  } else {
    // Fallback if popup blocked
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }, 400);
  }
}

/**
 * Triggers clean standalone HTML / PDF download
 */
export function downloadOrderInvoiceFile(order) {
  const htmlContent = generateInvoiceHtml(order);
  const orderId = getCleanOrderId(order);
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Invoice_${orderId}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
