// src/core/reports/visitPdfHtml.ts

import type { VisitPdfView } from "./visitPdfView";

function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderKeyValueRows(rows: Array<{ label: string; value: string }>): string {
  return rows
    .map(
      (row) => `
        <tr>
          <td class="kv-label">${esc(row.label)}</td>
          <td class="kv-value">${esc(row.value)}</td>
        </tr>
      `
    )
    .join("");
}

function renderList(title: string, items: string[]): string {
  if (items.length === 0) return "";
  return `
    <section class="section">
      <h2>${esc(title)}</h2>
      <ul>
        ${items.map((item) => `<li>${esc(item)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderFaults(view: VisitPdfView): string {
  if (view.linkedFaults.length === 0) return "";

  return `
    <section class="section">
      <h2>Linked Faults</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Severity</th>
            <th>Priority</th>
            <th>Status</th>
            <th>System</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          ${view.linkedFaults
            .map(
              (fault) => `
                <tr>
                  <td>
                    <strong>${esc(fault.title)}</strong>
                    ${fault.symptom ? `<div class="subtext">${esc(fault.symptom)}</div>` : ""}
                    ${fault.rootCause ? `<div class="subtext">Cause: ${esc(fault.rootCause)}</div>` : ""}
                  </td>
                  <td>${esc(fault.severity ?? "—")}</td>
                  <td>${esc(fault.priority ?? "—")}</td>
                  <td>${esc(fault.status ?? "—")}</td>
                  <td>${esc(fault.systemName ?? "—")}</td>
                  <td>${esc(fault.location ?? "—")}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderReplacements(view: VisitPdfView): string {
  if (view.linkedReplacements.length === 0) return "";

  return `
    <section class="section">
      <h2>Linked Replacements</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Part</th>
            <th>Qty</th>
            <th>Status</th>
            <th>Reason</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          ${view.linkedReplacements
            .map(
              (item) => `
                <tr>
                  <td>${esc(item.title ?? "—")}</td>
                  <td>${esc(item.partName ?? item.partId ?? "—")}</td>
                  <td>${esc(item.quantity ?? "—")}</td>
                  <td>${esc(item.status ?? "—")}</td>
                  <td>${esc(item.reason ?? "—")}</td>
                  <td>${esc(item.locationText ?? "—")}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderCompliance(view: VisitPdfView): string {
  if (view.linkedCompliance.length === 0) return "";

  return `
    <section class="section">
      <h2>Linked Compliance Items</h2>
      <table class="data-table">
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
          ${view.linkedCompliance
            .map(
              (item) => `
                <tr>
                  <td>${esc(item.title)}</td>
                  <td>${esc(item.status ?? "—")}</td>
                  <td>${esc(item.result ?? "—")}</td>
                  <td>${esc(item.riskLevel ?? "—")}</td>
                  <td>${esc(item.summary ?? item.recommendation ?? "—")}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderPhotos(view: VisitPdfView): string {
  if (view.linkedPhotos.length === 0) return "";

  return `
    <section class="section">
      <h2>Photos</h2>
      <div class="photo-grid">
        ${view.linkedPhotos
          .map(
            (photo) => `
              <figure class="photo-card">
                ${
                  photo.uri
                    ? `<img src="${esc(photo.uri)}" alt="${esc(photo.title)}" />`
                    : `<div class="photo-placeholder">No Image</div>`
                }
                <figcaption>
                  <strong>${esc(photo.title)}</strong>
                  ${photo.caption ? `<div class="subtext">${esc(photo.caption)}</div>` : ""}
                </figcaption>
              </figure>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function textSection(title: string, value?: string): string {
  if (!value?.trim()) return "";
  return `
    <section class="section">
      <h2>${esc(title)}</h2>
      <div class="text-block">${esc(value)}</div>
    </section>
  `;
}

export function buildVisitPdfHtml(view: VisitPdfView): string {
  const summaryRows = renderKeyValueRows(view.summaryFields);

  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(view.header.reportTitle)} - ${esc(view.header.siteName)}</title>
  <style>
    @page {
      size: A4;
      margin: 16mm;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #111;
      margin: 0;
      font-size: 12px;
      line-height: 1.4;
    }

    .page {
      max-width: 900px;
      margin: 0 auto;
    }

    .header {
      border-bottom: 2px solid #111;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }

    .title {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 6px;
    }

    .subtitle {
      margin: 2px 0;
      color: #444;
    }

    .section {
      margin-bottom: 18px;
      break-inside: avoid;
    }

    .section h2 {
      font-size: 15px;
      margin: 0 0 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #ddd;
    }

    .summary-table,
    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .summary-table td,
    .data-table td,
    .data-table th {
      border: 1px solid #ddd;
      padding: 8px;
      vertical-align: top;
      text-align: left;
    }

    .data-table th {
      background: #f5f5f5;
    }

    .kv-label {
      width: 180px;
      font-weight: 700;
      background: #fafafa;
    }

    .subtext {
      color: #555;
      margin-top: 4px;
      font-size: 11px;
    }

    .text-block {
      white-space: pre-wrap;
      border: 1px solid #ddd;
      padding: 10px;
      border-radius: 6px;
      background: #fff;
    }

    .photo-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .photo-card {
      margin: 0;
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
      break-inside: avoid;
      background: #fff;
    }

    .photo-card img {
      display: block;
      width: 100%;
      height: 220px;
      object-fit: cover;
      background: #f3f3f3;
    }

    .photo-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 220px;
      background: #f3f3f3;
      color: #666;
    }

    .photo-card figcaption {
      padding: 8px 10px 10px;
    }

    .signature {
      border: 1px solid #ddd;
      padding: 10px;
      border-radius: 6px;
      background: #fafafa;
    }

    ul {
      margin: 8px 0 0 18px;
      padding: 0;
    }

    .footer-note {
      margin-top: 24px;
      color: #666;
      font-size: 11px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="header">
      <div class="title">${esc(view.header.reportTitle)}</div>
      <div class="subtitle"><strong>Site:</strong> ${esc(view.header.siteName)}</div>
      ${
        view.header.siteReference
          ? `<div class="subtitle"><strong>Reference:</strong> ${esc(view.header.siteReference)}</div>`
          : ""
      }
      ${view.header.address ? `<div class="subtitle"><strong>Address:</strong> ${esc(view.header.address)}</div>` : ""}
      ${
        view.header.maintainedBy
          ? `<div class="subtitle"><strong>Maintained By:</strong> ${esc(view.header.maintainedBy)}</div>`
          : ""
      }
      ${
        view.header.qrLabelText
          ? `<div class="subtitle"><strong>QR Label:</strong> ${esc(view.header.qrLabelText)}</div>`
          : ""
      }
    </header>

    <section class="section">
      <h2>Visit Summary</h2>
      <table class="summary-table">
        ${summaryRows}
      </table>
    </section>

    ${textSection("Work Carried Out", view.workCarriedOut)}
    ${textSection("Faults Found", view.faultsFound)}
    ${textSection("Actions Taken", view.actionsTaken)}
    ${textSection("Devices / Parts Replaced", view.devicesPartsReplaced)}
    ${textSection("Zones / Areas Involved", view.zonesAreasInvolved)}
    ${textSection("Temporary Disables", view.temporaryDisables)}
    ${textSection("Outstanding Issues", view.outstandingIssues)}
    ${textSection("Recommendations", view.recommendations)}

    ${renderFaults(view)}
    ${renderReplacements(view)}
    ${renderCompliance(view)}
    ${renderPhotos(view)}

    <section class="section">
      <h2>Signature</h2>
      <div class="signature">
        <div><strong>Captured:</strong> ${view.signature.captured ? "Yes" : "No"}</div>
        ${
          view.signature.signedBy
            ? `<div><strong>Signed By:</strong> ${esc(view.signature.signedBy)}</div>`
            : ""
        }
        ${
          view.signature.signedAt
            ? `<div><strong>Signed At:</strong> ${esc(view.signature.signedAt)}</div>`
            : ""
        }
      </div>
    </section>

    <div class="footer-note">
      Generated by SeCoSite
    </div>
  </div>
</body>
</html>
  `;
}