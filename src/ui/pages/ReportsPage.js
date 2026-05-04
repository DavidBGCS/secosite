import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/ui/pages/ReportsPage.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { exportSiteFileJson, getSiteFileDownloadName, openVisitPdfPrintWindow, } from "../../core";
import { downloadVisitPdf } from "../../core/reports/downloadVisitPdf";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { cleanFirestoreData } from "../../utils/cleanFirestoreData";
import { AppLayout } from "../layouts/AppLayout";
import { Card, CardTitle, PrimaryButton, SecondaryButton, } from "../components/ui";
import { formatIrishDate, formatIrishDateTime } from "../utils/dateTime";
function downloadFile(filename, data) {
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
function statusBadgeStyle(status) {
    const base = {
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: "999px",
        fontSize: "0.76rem",
        fontWeight: 800,
        whiteSpace: "nowrap",
    };
    switch ((status ?? "").toLowerCase()) {
        case "completed":
            return { ...base, background: "#dcfce7", color: "#166534" };
        case "in-progress":
            return { ...base, background: "#dbeafe", color: "#1d4ed8" };
        case "abandoned":
            return { ...base, background: "#fee2e2", color: "#b91c1c" };
        case "exported":
            return { ...base, background: "#ede9fe", color: "#6d28d9" };
        case "draft":
        default:
            return { ...base, background: "#f3f4f6", color: "#374151" };
    }
}
function getVisitTypeLabel(value) {
    switch (value) {
        case "routine-service":
            return "Routine Service";
        case "fault-visit":
            return "Fault Visit";
        case "reactive-callout":
            return "Reactive Callout";
        case "commissioning":
            return "Commissioning";
        case "small-works":
            return "Small Works";
        case "inspection":
            return "Inspection";
        case "verification":
            return "Verification";
        case "other":
            return "Other";
        default:
            return value ?? "Visit";
    }
}
export function ReportsPage() {
    const navigate = useNavigate();
    const { siteFile, updateSite, loading, error } = useFirestoreSite();
    const [messages, setMessages] = useState([]);
    const [saving, setSaving] = useState(false);
    const sortedVisits = useMemo(() => {
        if (!siteFile)
            return [];
        return [...siteFile.visits].sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""));
    }, [siteFile]);
    const reportStats = useMemo(() => {
        const total = sortedVisits.length;
        const drafts = sortedVisits.filter((visit) => visit.status === "draft").length;
        const completed = sortedVisits.filter((visit) => visit.status === "completed").length;
        const exported = sortedVisits.filter((visit) => visit.status === "exported" || visit.exportPdfCreated === "yes").length;
        return { total, drafts, completed, exported };
    }, [sortedVisits]);
    if (loading) {
        return (_jsx(AppLayout, { title: "Loading reports", children: _jsx(Card, { children: "Loading reports..." }) }));
    }
    if (error) {
        return (_jsx(AppLayout, { title: "Reports error", children: _jsx(Card, { children: error }) }));
    }
    if (!siteFile) {
        return (_jsx(AppLayout, { title: "Reports not found", children: _jsxs(Card, { children: [_jsx("p", { style: { marginTop: 0 }, children: "The requested site could not be found." }), _jsx(SecondaryButton, { onClick: () => navigate("/"), children: "Back to Sites" })] }) }));
    }
    const exportSite = () => {
        try {
            const data = exportSiteFileJson(siteFile);
            const name = getSiteFileDownloadName(siteFile);
            downloadFile(name, data);
            setMessages([`Site file exported as ${name}.`]);
        }
        catch (e) {
            setMessages([e instanceof Error ? e.message : "Failed to export site."]);
        }
    };
    const exportBackup = () => {
        try {
            const data = JSON.stringify(siteFile, null, 2);
            const safeName = (siteFile.site.name || "site")
                .replace(/[^\w\s-]/g, "")
                .trim()
                .replace(/\s+/g, "_");
            const name = `${safeName}_backup_${Date.now()}.json`;
            downloadFile(name, data);
            setMessages([`Backup exported as ${name}.`]);
        }
        catch (e) {
            setMessages([e instanceof Error ? e.message : "Failed to create backup."]);
        }
    };
    const generateVisitPdf = (visitId) => {
        try {
            openVisitPdfPrintWindow(siteFile, visitId);
            setMessages(["Print preview opened."]);
        }
        catch (e) {
            setMessages([e instanceof Error ? e.message : "Failed to generate print preview."]);
        }
    };
    const handleDownloadPdf = async (visitId) => {
        try {
            await downloadVisitPdf(siteFile, visitId);
            setMessages(["PDF download started."]);
        }
        catch (e) {
            setMessages([e instanceof Error ? e.message : "Failed to download PDF."]);
        }
    };
    const handleDeleteDraft = async (visitId) => {
        const visit = siteFile.visits.find((v) => v.id === visitId);
        if (!visit)
            return;
        if (visit.status !== "draft") {
            setMessages(["Only draft visits can be deleted from this screen."]);
            return;
        }
        const confirmed = window.confirm(`Delete draft visit "${getVisitTypeLabel(visit.visitType)}" for ${visit.engineerName || "unknown engineer"}?`);
        if (!confirmed)
            return;
        try {
            const next = JSON.parse(JSON.stringify(siteFile));
            next.visits = next.visits.filter((v) => v.id !== visitId);
            next.metadata.updatedAt = new Date().toISOString();
            setSaving(true);
            try {
                await updateSite(cleanFirestoreData(next));
            }
            finally {
                setSaving(false);
            }
            setMessages([`Draft visit deleted.`]);
        }
        catch (e) {
            setMessages([e instanceof Error ? e.message : "Failed to delete draft visit."]);
        }
    };
    return (_jsx(AppLayout, { title: "Reports & Export", subtitle: `${siteFile.site.name} • ${siteFile.site.siteCode ?? siteFile.site.id}`, children: _jsxs("div", { style: pageGridStyle, children: [_jsx(Card, { children: _jsxs("div", { style: heroWrapStyle, children: [_jsxs("div", { children: [_jsx("div", { style: eyebrowStyle, children: "REPORTING HUB" }), _jsx("div", { style: heroTitleStyle, children: "Visits, PDFs & Site Exports" }), _jsx("div", { style: heroSubStyle, children: "Review visit records, generate printable reports, download PDFs, and export the site file for backup or transfer." })] }), _jsxs("div", { style: heroBadgeStyle, children: [reportStats.total, " Reports"] })] }) }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Reporting Overview" }), _jsxs("div", { style: statsGridStyle, children: [_jsxs("div", { style: statCardStyle, children: [_jsx("div", { style: statLabelStyle, children: "Total Visits" }), _jsx("div", { style: statValueStyle, children: reportStats.total })] }), _jsxs("div", { style: statCardStyle, children: [_jsx("div", { style: statLabelStyle, children: "Drafts" }), _jsx("div", { style: statValueStyle, children: reportStats.drafts })] }), _jsxs("div", { style: statCardStyle, children: [_jsx("div", { style: statLabelStyle, children: "Completed" }), _jsx("div", { style: statValueStyle, children: reportStats.completed })] }), _jsxs("div", { style: statCardStyle, children: [_jsx("div", { style: statLabelStyle, children: "Exported" }), _jsx("div", { style: statValueStyle, children: reportStats.exported })] })] })] }), messages.length > 0 && (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Messages" }), _jsx("div", { style: messageListStyle, children: messages.map((message, index) => (_jsx("div", { children: message }, `${message}-${index}`))) })] })), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Visit Reports" }), sortedVisits.length === 0 ? (_jsx("p", { style: emptyTextStyle, children: "No visits recorded yet." })) : (_jsx("div", { style: visitGridStyle, children: sortedVisits.map((visit) => {
                                const isDraft = visit.status === "draft";
                                const linkedFaults = visit.faultIds?.length ?? 0;
                                const linkedReplacements = visit.replacementIds?.length ?? 0;
                                const linkedPhotos = visit.photoIds?.length ?? 0;
                                return (_jsxs("div", { style: visitCardStyle, children: [_jsxs("div", { style: visitTopRowStyle, children: [_jsxs("div", { style: { minWidth: 0 }, children: [_jsx("div", { style: visitTitleStyle, children: getVisitTypeLabel(visit.visitType) }), _jsxs("div", { style: visitSubStyle, children: [visit.engineerName || "No engineer", " \u2022", " ", visit.startedAt ? formatIrishDate(visit.startedAt) : "No date"] })] }), _jsx("span", { style: statusBadgeStyle(visit.status), children: visit.status ?? "draft" })] }), _jsxs("div", { style: visitMetaGridStyle, children: [_jsxs("div", { children: [_jsx("strong", { children: "Started:" }), " ", visit.startedAt ? formatIrishDateTime(visit.startedAt) : "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Completed:" }), " ", visit.completedAt ? formatIrishDateTime(visit.completedAt) : "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Discipline:" }), " ", visit.discipline ?? "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "System Status:" }), " ", visit.systemStatus ?? "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Service Column:" }), " ", visit.serviceColumnKey ? visit.serviceColumnKey.toUpperCase() : "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Visit ID:" }), " ", visit.id] })] }), _jsxs("div", { style: summaryPillsWrapStyle, children: [_jsxs("span", { style: summaryPillStyle, children: ["Faults: ", linkedFaults] }), _jsxs("span", { style: summaryPillStyle, children: ["Replacements: ", linkedReplacements] }), _jsxs("span", { style: summaryPillStyle, children: ["Photos: ", linkedPhotos] })] }), (visit.workCarriedOut ||
                                            visit.faultsFound ||
                                            visit.actionsTaken ||
                                            visit.recommendations) && (_jsxs("div", { style: visitNotePreviewStyle, children: [visit.workCarriedOut ? (_jsxs("div", { style: noteLineStyle, children: [_jsx("strong", { children: "Work:" }), " ", visit.workCarriedOut] })) : null, visit.faultsFound ? (_jsxs("div", { style: noteLineStyle, children: [_jsx("strong", { children: "Faults:" }), " ", visit.faultsFound] })) : null, visit.actionsTaken ? (_jsxs("div", { style: noteLineStyle, children: [_jsx("strong", { children: "Actions:" }), " ", visit.actionsTaken] })) : null, visit.recommendations ? (_jsxs("div", { style: noteLineStyle, children: [_jsx("strong", { children: "Recommendations:" }), " ", visit.recommendations] })) : null] })), _jsxs("div", { style: visitActionsGridStyle, children: [_jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/visit/${visit.id}`), disabled: saving, children: "Edit Visit" }), _jsx(SecondaryButton, { onClick: () => generateVisitPdf(visit.id), disabled: saving, children: "Print Preview" }), _jsx(PrimaryButton, { onClick: () => handleDownloadPdf(visit.id), disabled: saving, children: "Download PDF" }), isDraft ? (_jsx(SecondaryButton, { onClick: () => handleDeleteDraft(visit.id), disabled: saving, style: dangerButtonStyle, children: "Delete Draft" })) : (_jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/visit/${visit.id}`), disabled: saving, children: "Review Record" }))] })] }, visit.id));
                            }) }))] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Site Export" }), _jsxs("div", { style: exportSectionStyle, children: [_jsxs("div", { style: exportTextBlockStyle, children: [_jsx("div", { style: exportTitleStyle, children: "SeCo Site File" }), _jsx("div", { style: exportSubStyle, children: "Export this site as a structured file for sharing, migration, or restore." })] }), _jsx(PrimaryButton, { onClick: exportSite, disabled: saving, children: "Export Site File" })] }), _jsx("div", { style: dividerStyle }), _jsxs("div", { style: exportSectionStyle, children: [_jsxs("div", { style: exportTextBlockStyle, children: [_jsx("div", { style: exportTitleStyle, children: "Raw JSON Backup" }), _jsx("div", { style: exportSubStyle, children: "Download a full JSON backup snapshot for safekeeping." })] }), _jsx(SecondaryButton, { onClick: exportBackup, disabled: saving, children: "Download Backup" })] })] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Navigation" }), _jsxs("div", { style: navActionGridStyle, children: [_jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/overview`), children: "Back to Overview" }), _jsx(PrimaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/visit/new`), children: "Start New Visit" })] })] })] }) }));
}
const pageGridStyle = {
    display: "grid",
    gap: "14px",
};
const heroWrapStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: "12px",
};
const eyebrowStyle = {
    fontSize: "0.72rem",
    fontWeight: 800,
    letterSpacing: "0.08em",
    color: "#6b7280",
    marginBottom: "6px",
};
const heroTitleStyle = {
    fontSize: "1.45rem",
    fontWeight: 800,
    lineHeight: 1.1,
    color: "#111827",
    marginBottom: "6px",
};
const heroSubStyle = {
    color: "#6b7280",
    fontSize: "0.95rem",
    lineHeight: 1.45,
    maxWidth: "700px",
};
const heroBadgeStyle = {
    borderRadius: "999px",
    padding: "8px 12px",
    background: "#eef2ff",
    color: "#3730a3",
    fontSize: "0.82rem",
    fontWeight: 800,
    whiteSpace: "nowrap",
};
const statsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
};
const statCardStyle = {
    padding: "14px",
    borderRadius: "16px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
};
const statLabelStyle = {
    fontSize: "0.8rem",
    color: "#6b7280",
    fontWeight: 700,
    marginBottom: "6px",
};
const statValueStyle = {
    fontSize: "1.2rem",
    color: "#111827",
    fontWeight: 800,
};
const messageListStyle = {
    display: "grid",
    gap: "6px",
    color: "#92400e",
    fontWeight: 700,
};
const emptyTextStyle = {
    margin: 0,
    color: "#6b7280",
};
const visitGridStyle = {
    display: "grid",
    gap: "12px",
};
const visitCardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "14px",
    background: "#ffffff",
    display: "grid",
    gap: "12px",
};
const visitTopRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: "10px",
};
const visitTitleStyle = {
    fontSize: "1rem",
    fontWeight: 800,
    color: "#111827",
    lineHeight: 1.2,
};
const visitSubStyle = {
    color: "#6b7280",
    fontSize: "0.9rem",
    marginTop: "4px",
    lineHeight: 1.35,
};
const visitMetaGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px 12px",
    color: "#374151",
    fontSize: "0.92rem",
};
const summaryPillsWrapStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
};
const summaryPillStyle = {
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#f3f4f6",
    color: "#374151",
    fontSize: "0.78rem",
    fontWeight: 700,
};
const visitNotePreviewStyle = {
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    padding: "12px",
    display: "grid",
    gap: "6px",
};
const noteLineStyle = {
    color: "#111827",
    lineHeight: 1.4,
    fontSize: "0.92rem",
};
const visitActionsGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const dangerButtonStyle = {
    border: "1px solid #ef4444",
    color: "#b91c1c",
};
const exportSectionStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
};
const exportTextBlockStyle = {
    display: "grid",
    gap: "4px",
};
const exportTitleStyle = {
    fontWeight: 800,
    color: "#111827",
};
const exportSubStyle = {
    color: "#6b7280",
    fontSize: "0.92rem",
    lineHeight: 1.4,
};
const dividerStyle = {
    height: "1px",
    background: "#e5e7eb",
    margin: "14px 0",
};
const navActionGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
