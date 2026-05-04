// src/core/reports/downloadVisitPdf.ts
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { getVisitPdfView } from "./visitPdfView";
function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
function nl2br(value) {
    return escapeHtml(value).replace(/\n/g, "<br/>");
}
function renderKeyValue(label, value) {
    if (!value)
        return "";
    return `
    <div class="info-card">
      <div class="info-label">${escapeHtml(label)}</div>
      <div class="info-value">${escapeHtml(value)}</div>
    </div>
  `;
}
function renderLongSection(title, value) {
    if (!value)
        return "";
    return `
    <section class="section">
      <div class="section-title">${escapeHtml(title)}</div>
      <div class="note-block">${nl2br(value)}</div>
    </section>
  `;
}
function buildHtml(siteFile, visitId) {
    const view = getVisitPdfView(siteFile, visitId);
    const summaryCards = view.summaryFields
        .map((field) => `
        <div class="summary-card">
          <div class="summary-label">${escapeHtml(field.label)}</div>
          <div class="summary-value">${escapeHtml(field.value)}</div>
        </div>
      `)
        .join("");
    const faults = view.linkedFaults.length
        ? `
      <section class="section">
        <div class="section-title">Linked Faults</div>
        <table class="report-table">
          <thead>
            <tr>
              <th>Fault</th>
              <th>Status</th>
              <th>Severity</th>
              <th>Priority</th>
              <th>System</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            ${view.linkedFaults
            .map((fault) => `
                  <tr>
                    <td>
                      <div class="table-main">${escapeHtml(fault.title)}</div>
                      ${fault.symptom
            ? `<div class="table-sub">Symptom: ${escapeHtml(fault.symptom)}</div>`
            : ""}
                      ${fault.rootCause
            ? `<div class="table-sub">Cause: ${escapeHtml(fault.rootCause)}</div>`
            : ""}
                    </td>
                    <td>${escapeHtml(fault.status ?? "—")}</td>
                    <td>${escapeHtml(fault.severity ?? "—")}</td>
                    <td>${escapeHtml(fault.priority ?? "—")}</td>
                    <td>${escapeHtml(fault.systemName ?? "—")}</td>
                    <td>${escapeHtml(fault.location ?? "—")}</td>
                  </tr>
                `)
            .join("")}
          </tbody>
        </table>
      </section>
    `
        : "";
    const replacements = view.linkedReplacements.length
        ? `
      <section class="section">
        <div class="section-title">Linked Replacements</div>
        <table class="report-table">
          <thead>
            <tr>
              <th>Replacement</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Reason</th>
              <th>Asset Ref</th>
              <th>Fault</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            ${view.linkedReplacements
            .map((replacement) => `
                  <tr>
                    <td>
                      <div class="table-main">${escapeHtml(replacement.title ??
            replacement.partName ??
            replacement.partId ??
            replacement.id)}</div>
                      ${replacement.partId
            ? `<div class="table-sub">Part ID: ${escapeHtml(replacement.partId)}</div>`
            : ""}
                    </td>
                    <td>${escapeHtml(String(replacement.quantity ?? "—"))}</td>
                    <td>${escapeHtml(replacement.status ?? "—")}</td>
                    <td>${escapeHtml(replacement.reason ?? "—")}</td>
                    <td>${escapeHtml(replacement.linkedAssetReference ?? "—")}</td>
                    <td>${escapeHtml(replacement.linkedFaultTitle ?? "—")}</td>
                    <td>${escapeHtml(replacement.locationText ?? "—")}</td>
                  </tr>
                `)
            .join("")}
          </tbody>
        </table>
      </section>
    `
        : "";
    const photos = view.linkedPhotos.length
        ? `
      <section class="section">
        <div class="section-title">Photos</div>
        <div class="photo-grid">
          ${view.linkedPhotos
            .map((photo) => `
                <div class="photo-card">
                  ${photo.uri
            ? `<img src="${photo.uri}" alt="${escapeHtml(photo.title)}" />`
            : `<div class="photo-placeholder">No Image</div>`}
                  <div class="photo-body">
                    <div class="photo-title">${escapeHtml(photo.title)}</div>
                    ${photo.category
            ? `<div class="photo-meta">${escapeHtml(photo.category)}</div>`
            : ""}
                    ${photo.caption
            ? `<div class="photo-caption">${escapeHtml(photo.caption)}</div>`
            : ""}
                  </div>
                </div>
              `)
            .join("")}
        </div>
      </section>
    `
        : "";
    return `
    <div id="visit-pdf-root">
      <style>
        :root {
          --ink: #111827;
          --muted: #6b7280;
          --line: #d1d5db;
          --soft: #f8fafc;
          --soft-2: #f3f4f6;
          --accent: #1f2937;
        }

        * { box-sizing: border-box; }

        #visit-pdf-root {
          width: 960px;
          padding: 24px;
          background: white;
          color: var(--ink);
          font-family: Arial, Helvetica, sans-serif;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          border-bottom: 3px solid var(--accent);
          padding-bottom: 16px;
          margin-bottom: 18px;
        }

        .brand-title {
          font-size: 28px;
          font-weight: 800;
        }

        .brand-subtitle {
          font-size: 13px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .report-title-main {
          font-size: 24px;
          font-weight: 800;
          text-align: right;
        }

        .report-title-sub {
          font-size: 13px;
          color: var(--muted);
          text-align: right;
        }

        .site-panel {
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 16px;
          background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
          margin-bottom: 18px;
        }

        .site-name {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .info-grid,
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .summary-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .info-card,
        .summary-card {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 10px 12px;
          background: var(--soft);
        }

        .info-label,
        .summary-label {
          font-size: 11px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: .06em;
          margin-bottom: 4px;
        }

        .info-value,
        .summary-value {
          font-size: 14px;
          font-weight: 700;
          line-height: 1.35;
        }

        .section {
          margin-top: 18px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 10px;
          padding-bottom: 6px;
          border-bottom: 2px solid var(--accent);
        }

        .note-block {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px 14px;
          background: white;
          line-height: 1.5;
          min-height: 58px;
        }

        .report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          background: white;
        }

        .report-table th,
        .report-table td {
          border: 1px solid var(--line);
          padding: 8px 10px;
          text-align: left;
          vertical-align: top;
        }

        .report-table th {
          background: var(--soft-2);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .table-main {
          font-weight: 700;
          line-height: 1.35;
        }

        .table-sub {
          margin-top: 4px;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.35;
        }

        .photo-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .photo-card {
          border: 1px solid var(--line);
          border-radius: 14px;
          overflow: hidden;
          background: white;
        }

        .photo-card img,
        .photo-placeholder {
          display: block;
          width: 100%;
          height: 240px;
          object-fit: cover;
          background: #e5e7eb;
        }

        .photo-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--muted);
          font-weight: 700;
        }

        .photo-body {
          padding: 12px;
        }

        .photo-title {
          font-weight: 700;
          margin-bottom: 4px;
        }

        .photo-meta,
        .photo-caption {
          color: var(--muted);
          font-size: 12px;
          line-height: 1.35;
        }
      </style>

      <div class="topbar">
        <div>
          <div class="brand-title">SeCo Site</div>
          <div class="brand-subtitle">Service Visit Documentation</div>
        </div>
        <div>
          <div class="report-title-main">${escapeHtml(view.header.reportTitle)}</div>
          <div class="report-title-sub">
            ${escapeHtml(view.visit.visitId)}${view.visit.completedAt
        ? ` • Completed ${escapeHtml(view.visit.completedAt)}`
        : ""}
          </div>
        </div>
      </div>

      <section class="site-panel">
        <div class="site-name">${escapeHtml(view.header.siteName)}</div>
        <div class="info-grid">
          ${renderKeyValue("Site Reference", view.header.siteReference)}
          ${renderKeyValue("Address", view.header.address)}
          ${renderKeyValue("Maintained By", view.header.maintainedBy)}
          ${renderKeyValue("QR Label", view.header.qrLabelText)}
        </div>
      </section>

      ${summaryCards
        ? `<section class="section"><div class="section-title">Visit Summary</div><div class="summary-grid">${summaryCards}</div></section>`
        : ""}

      ${renderLongSection("Work Carried Out", view.workCarriedOut)}
      ${renderLongSection("Faults Found", view.faultsFound)}
      ${renderLongSection("Actions Taken", view.actionsTaken)}
      ${renderLongSection("Devices / Parts Replaced", view.devicesPartsReplaced)}
      ${renderLongSection("Zones / Areas Involved", view.zonesAreasInvolved)}
      ${renderLongSection("Temporary Disables", view.temporaryDisables)}
      ${renderLongSection("Outstanding Issues", view.outstandingIssues)}
      ${renderLongSection("Recommendations", view.recommendations)}
      ${faults}
      ${replacements}
      ${photos}
    </div>
  `;
}
export async function downloadVisitPdf(siteFile, visitId) {
    const html = buildHtml(siteFile, visitId);
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-10000px";
    container.style.top = "0";
    container.style.zIndex = "-1";
    container.innerHTML = html;
    document.body.appendChild(container);
    const root = container.querySelector("#visit-pdf-root");
    if (!root) {
        document.body.removeChild(container);
        throw new Error("Failed to build PDF content.");
    }
    try {
        const canvas = await html2canvas(root, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
        });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        const safeSiteName = (siteFile.site.name || "site")
            .replace(/[^\w\s-]/g, "")
            .trim()
            .replace(/\s+/g, "_");
        pdf.save(`${safeSiteName}_visit_${visitId}.pdf`);
    }
    finally {
        document.body.removeChild(container);
    }
}
