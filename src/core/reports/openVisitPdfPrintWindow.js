// src/core/reports/openVisitPdfPrintWindow.ts
import { getVisitPdfView } from "./visitPdfView";
function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
function renderIfValue(label, value) {
    if (!value)
        return "";
    return `
    <div class="kv">
      <div class="kv-label">${escapeHtml(label)}</div>
      <div class="kv-value">${escapeHtml(value)}</div>
    </div>
  `;
}
function renderLongText(title, value) {
    if (!value)
        return "";
    return `
    <section class="section">
      <h3>${escapeHtml(title)}</h3>
      <div class="long-text">${escapeHtml(value).replace(/\n/g, "<br/>")}</div>
    </section>
  `;
}
function renderSummaryFields(fields) {
    if (!fields.length)
        return "";
    return `
    <section class="section">
      <h3>Visit Summary</h3>
      <div class="kv-grid">
        ${fields
        .map((field) => `
              <div class="kv">
                <div class="kv-label">${escapeHtml(field.label)}</div>
                <div class="kv-value">${escapeHtml(field.value)}</div>
              </div>
            `)
        .join("")}
      </div>
    </section>
  `;
}
function renderFaults(faults) {
    if (!faults.length)
        return "";
    return `
    <section class="section">
      <h3>Linked Faults</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Severity</th>
            <th>Priority</th>
            <th>System</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          ${faults
        .map((fault) => `
                <tr>
                  <td>
                    <strong>${escapeHtml(fault.title)}</strong>
                    ${fault.symptom
        ? `<div class="subline">Symptom: ${escapeHtml(fault.symptom)}</div>`
        : ""}
                    ${fault.rootCause
        ? `<div class="subline">Cause: ${escapeHtml(fault.rootCause)}</div>`
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
  `;
}
function renderReplacements(replacements) {
    if (!replacements.length)
        return "";
    return `
    <section class="section">
      <h3>Linked Replacements</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>Title / Part</th>
            <th>Qty</th>
            <th>Status</th>
            <th>Reason</th>
            <th>Asset Ref</th>
            <th>Fault</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          ${replacements
        .map((replacement) => `
                <tr>
                  <td>
                    <strong>${escapeHtml(replacement.title ??
        replacement.partName ??
        replacement.partId ??
        replacement.id)}</strong>
                    ${replacement.partId
        ? `<div class="subline">Part ID: ${escapeHtml(replacement.partId)}</div>`
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
  `;
}
function renderCompliance(items) {
    if (!items.length)
        return "";
    return `
    <section class="section">
      <h3>Compliance Items</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Result</th>
            <th>Risk</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>
          ${items
        .map((item) => `
                <tr>
                  <td>
                    <strong>${escapeHtml(item.title)}</strong>
                    ${item.recommendation
        ? `<div class="subline">Recommendation: ${escapeHtml(item.recommendation)}</div>`
        : ""}
                  </td>
                  <td>${escapeHtml(item.status ?? "—")}</td>
                  <td>${escapeHtml(item.result ?? "—")}</td>
                  <td>${escapeHtml(item.riskLevel ?? "—")}</td>
                  <td>${escapeHtml(item.summary ?? "—")}</td>
                </tr>
              `)
        .join("")}
        </tbody>
      </table>
    </section>
  `;
}
function renderPhotos(photos) {
    if (!photos.length)
        return "";
    return `
    <section class="section">
      <h3>Photos</h3>
      <div class="photo-grid">
        ${photos
        .map((photo) => `
              <div class="photo-card">
                ${photo.uri
        ? `<img src="${photo.uri}" alt="${escapeHtml(photo.title)}" />`
        : `<div class="photo-placeholder">No Image</div>`}
                <div class="photo-meta">
                  <div class="photo-title">${escapeHtml(photo.title)}</div>
                  ${photo.category
        ? `<div class="photo-sub">${escapeHtml(photo.category)}</div>`
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
  `;
}
function buildHtml(siteFile, visitId) {
    const view = getVisitPdfView(siteFile, visitId);
    return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(view.header.reportTitle)}</title>
        <style>
          :root {
            --border: #d1d5db;
            --muted: #6b7280;
            --ink: #111827;
            --soft: #f8fafc;
          }

          * {
            box-sizing: border-box;
          }

          html, body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: var(--ink);
            background: white;
          }

          body {
            padding: 24px;
          }

          .report {
            max-width: 980px;
            margin: 0 auto;
          }

          .header {
            border: 2px solid var(--ink);
            padding: 18px;
            border-radius: 12px;
            margin-bottom: 18px;
          }

          .header-title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 12px;
          }

          .header-site {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 8px;
          }

          .header-grid,
          .kv-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .kv {
            border: 1px solid var(--border);
            background: var(--soft);
            border-radius: 10px;
            padding: 10px 12px;
          }

          .kv-label {
            font-size: 12px;
            color: var(--muted);
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .kv-value {
            font-size: 14px;
            font-weight: 600;
          }

          .section {
            margin-top: 18px;
            break-inside: avoid;
          }

          .section h3 {
            margin: 0 0 10px;
            font-size: 18px;
            border-bottom: 2px solid var(--ink);
            padding-bottom: 6px;
          }

          .long-text {
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 12px;
            background: white;
            line-height: 1.45;
            white-space: normal;
          }

          .report-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }

          .report-table th,
          .report-table td {
            border: 1px solid var(--border);
            padding: 8px 10px;
            vertical-align: top;
            text-align: left;
          }

          .report-table th {
            background: #f3f4f6;
          }

          .subline {
            margin-top: 4px;
            color: var(--muted);
            font-size: 12px;
          }

          .photo-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }

          .photo-card {
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
            background: white;
            break-inside: avoid;
          }

          .photo-card img,
          .photo-placeholder {
            width: 100%;
            height: 240px;
            object-fit: cover;
            display: block;
            background: #e5e7eb;
          }

          .photo-placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--muted);
            font-weight: 600;
          }

          .photo-meta {
            padding: 10px 12px;
          }

          .photo-title {
            font-weight: 700;
            margin-bottom: 4px;
          }

          .photo-sub,
          .photo-caption {
            color: var(--muted);
            font-size: 12px;
            margin-top: 2px;
          }

          .signature {
            margin-top: 24px;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .signature-box {
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 12px;
            min-height: 82px;
            background: white;
          }

          .footer-note {
            margin-top: 18px;
            font-size: 12px;
            color: var(--muted);
            text-align: center;
          }

          @media print {
            body {
              padding: 0;
            }

            .report {
              max-width: 100%;
            }

            .section,
            .photo-card,
            .signature-box {
              break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="report">
          <section class="header">
            <div class="header-title">${escapeHtml(view.header.reportTitle)}</div>
            <div class="header-site">${escapeHtml(view.header.siteName)}</div>
            <div class="header-grid">
              ${renderIfValue("Site Reference", view.header.siteReference)}
              ${renderIfValue("Address", view.header.address)}
              ${renderIfValue("Maintained By", view.header.maintainedBy)}
              ${renderIfValue("QR Label", view.header.qrLabelText)}
            </div>
          </section>

          ${renderSummaryFields(view.summaryFields)}

          ${renderLongText("Work Carried Out", view.workCarriedOut)}
          ${renderLongText("Faults Found", view.faultsFound)}
          ${renderLongText("Actions Taken", view.actionsTaken)}
          ${renderLongText("Devices / Parts Replaced", view.devicesPartsReplaced)}
          ${renderLongText("Zones / Areas Involved", view.zonesAreasInvolved)}
          ${renderLongText("Temporary Disables", view.temporaryDisables)}
          ${renderLongText("Outstanding Issues", view.outstandingIssues)}
          ${renderLongText("Recommendations", view.recommendations)}

          ${renderFaults(view.linkedFaults)}
          ${renderReplacements(view.linkedReplacements)}
          ${renderCompliance(view.linkedCompliance)}
          ${renderPhotos(view.linkedPhotos)}

          <section class="section">
            <h3>Sign-off</h3>
            <div class="signature">
              <div class="signature-box">
                <div class="kv-label">Signed</div>
                <div class="kv-value">${view.signature.captured ? "Yes" : "No"}</div>
              </div>
              <div class="signature-box">
                <div class="kv-label">Signed By / At</div>
                <div class="kv-value">
                  ${escapeHtml([view.signature.signedBy, view.signature.signedAt]
        .filter(Boolean)
        .join(" • ") || "—")}
                </div>
              </div>
            </div>
          </section>

          <div class="footer-note">
            Generated from SeCo Site visit data.
          </div>
        </div>
      </body>
    </html>
  `;
}
export function openVisitPdfPrintWindow(siteFile, visitId) {
    const html = buildHtml(siteFile, visitId);
    const popup = window.open("", "_blank", "noopener,noreferrer,width=1000,height=900");
    if (!popup) {
        throw new Error("Could not open print window. Please allow popups and try again.");
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    const tryPrint = () => {
        try {
            popup.print();
        }
        catch {
            // no-op
        }
    };
    if (popup.document.readyState === "complete") {
        setTimeout(tryPrint, 250);
    }
    else {
        popup.onload = () => setTimeout(tryPrint, 250);
    }
}
