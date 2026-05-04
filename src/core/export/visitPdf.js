// src/core/export/visitPdf.ts
import { getVisitPdfView } from "../reports/visitPdfView";
import { buildVisitPdfHtml } from "../reports/visitPdfHtml";
function sanitizeFilePart(value) {
    return value
        .trim()
        .replace(/[^\w.-]+/g, "_")
        .replace(/^_+|_+$/g, "") || "file";
}
export function getVisitPdfFileName(siteFile, visitId) {
    const visit = siteFile.visits.find((v) => v.id === visitId);
    const siteName = sanitizeFilePart(siteFile.site.name || "site");
    const datePart = sanitizeFilePart((visit?.startedAt ?? new Date().toISOString()).slice(0, 10));
    return `${siteName}_visit_${datePart}.pdf`;
}
export function openVisitPdfPrintWindow(siteFile, visitId) {
    const view = getVisitPdfView(siteFile, visitId);
    const html = buildVisitPdfHtml(view);
    const win = window.open("", "_blank", "noopener,noreferrer,width=1000,height=900");
    if (!win) {
        throw new Error("Popup blocked. Please allow popups to generate the PDF.");
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = () => {
        win.focus();
        win.print();
    };
}
