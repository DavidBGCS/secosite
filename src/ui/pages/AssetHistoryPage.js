import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { AppLayout } from "../layouts/AppLayout";
import { Card, CardTitle, PrimaryButton, SecondaryButton, } from "../components/ui";
import { formatIrishDate, formatIrishDateTime } from "../utils/dateTime";
function safeLower(value) {
    return String(value ?? "").toLowerCase().trim();
}
function assetMatchesReference(asset, candidate) {
    const assetRef = safeLower(asset.reference);
    const text = safeLower(candidate);
    if (!assetRef || !text)
        return false;
    return text === assetRef || text.includes(assetRef);
}
function getServiceStatusLabel(tick) {
    if (tick.ticked && tick.locked)
        return "Tested / Locked";
    if (tick.ticked)
        return "Tested";
    if (tick.locked)
        return "Locked";
    return "Created";
}
export function AssetHistoryPage() {
    const navigate = useNavigate();
    const { assetId } = useParams();
    const { siteFile, loading, error } = useFirestoreSite();
    const asset = useMemo(() => {
        if (!siteFile || !assetId)
            return undefined;
        return siteFile.assets.find((item) => item.id === assetId);
    }, [siteFile, assetId]);
    const serviceHistory = useMemo(() => {
        if (!asset)
            return [];
        const ticks = (asset.serviceTicks ?? [])
            .filter((tick) => tick.ticked || tick.note || tick.locked || tick.testedAt)
            .sort((a, b) => {
            const aDate = a.testedAt ?? a.serviceDate ?? "";
            const bDate = b.testedAt ?? b.serviceDate ?? "";
            return bDate.localeCompare(aDate);
        });
        return ticks;
    }, [asset]);
    const linkedFaults = useMemo(() => {
        if (!siteFile || !asset)
            return [];
        return [...siteFile.openFaults, ...siteFile.closedFaults].filter((fault) => {
            return (assetMatchesReference(asset, fault.deviceId) ||
                assetMatchesReference(asset, fault.reference) ||
                assetMatchesReference(asset, fault.assetReference) ||
                assetMatchesReference(asset, fault.title));
        });
    }, [siteFile, asset]);
    const linkedReplacements = useMemo(() => {
        if (!siteFile || !asset)
            return [];
        return (siteFile.replacementHistory ?? []).filter((replacement) => {
            return (assetMatchesReference(asset, replacement.deviceId) ||
                assetMatchesReference(asset, replacement.reference) ||
                assetMatchesReference(asset, replacement.assetReference) ||
                safeLower(replacement.assetId) === safeLower(asset.id));
        });
    }, [siteFile, asset]);
    const linkedVisits = useMemo(() => {
        if (!siteFile || !asset)
            return [];
        const visitIdsFromTicks = new Set(serviceHistory
            .map((tick) => tick.visitId)
            .filter(Boolean)
            .map((value) => String(value)));
        return siteFile.visits
            .filter((visit) => {
            if (visitIdsFromTicks.has(String(visit.id)))
                return true;
            const faultIds = new Set(linkedFaults.map((fault) => String(fault.id)));
            const replacementIds = new Set(linkedReplacements.map((r) => String(r.id)));
            const visitFaultIds = (visit.faultIds ?? []).map((id) => String(id));
            const visitReplacementIds = (visit.replacementIds ?? []).map((id) => String(id));
            return (visitFaultIds.some((id) => faultIds.has(id)) ||
                visitReplacementIds.some((id) => replacementIds.has(id)));
        })
            .sort((a, b) => {
            const aDate = a.completedAt ?? a.startedAt ?? "";
            const bDate = b.completedAt ?? b.startedAt ?? "";
            return bDate.localeCompare(aDate);
        });
    }, [siteFile, asset, serviceHistory, linkedFaults, linkedReplacements]);
    if (loading) {
        return (_jsx(AppLayout, { title: "Loading asset history", children: _jsx(Card, { children: "Loading asset history..." }) }));
    }
    if (error) {
        return (_jsx(AppLayout, { title: "Asset history error", children: _jsx(Card, { children: error }) }));
    }
    if (!siteFile || !asset) {
        return (_jsx(AppLayout, { title: "Asset history not found", children: _jsxs(Card, { children: [_jsx("p", { style: { marginTop: 0 }, children: "The requested asset could not be found." }), _jsx(SecondaryButton, { onClick: () => navigate(siteFile ? `/site/${siteFile.metadata.siteFileId}/assets` : "/"), children: "Back" })] }) }));
    }
    return (_jsx(AppLayout, { title: "Asset History", subtitle: `${asset.reference} • ${siteFile.site.name}`, children: _jsxs("div", { style: pageGridStyle, children: [_jsxs(Card, { children: [_jsxs("div", { style: heroWrapStyle, children: [_jsxs("div", { children: [_jsx("div", { style: eyebrowStyle, children: "ASSET HISTORY" }), _jsx("div", { style: heroTitleStyle, children: asset.reference }), _jsxs("div", { style: heroSubStyle, children: [asset.assetType, " \u2022 ", asset.locationText ?? "No location"] })] }), _jsx("div", { style: heroActionsStyle, children: _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/assets/${asset.id}/edit`), children: "Edit Asset" }) })] }), _jsxs("div", { style: summaryGridStyle, children: [_jsx(SummaryPill, { label: "Category", value: asset.category }), _jsx(SummaryPill, { label: "Loop", value: asset.loop ?? "—" }), _jsx(SummaryPill, { label: "Address", value: asset.address ?? "—" }), _jsx(SummaryPill, { label: "Zone", value: asset.zone ?? "—" }), _jsx(SummaryPill, { label: "Active", value: asset.active ? "Yes" : "No" }), _jsx(SummaryPill, { label: "Trackable", value: asset.serviceTrackable ? "Yes" : "No" })] })] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Service History" }), serviceHistory.length === 0 ? (_jsx("p", { style: emptyTextStyle, children: "No service history recorded yet." })) : (_jsx("div", { style: timelineGridStyle, children: serviceHistory.map((tick, index) => (_jsxs("div", { style: timelineCardStyle, children: [_jsxs("div", { style: timelineTopStyle, children: [_jsxs("div", { children: [_jsx("div", { style: timelineTitleStyle, children: tick.columnKey.toUpperCase() }), _jsx("div", { style: timelineMetaStyle, children: tick.testedAt
                                                            ? formatIrishDateTime(tick.testedAt)
                                                            : tick.serviceDate
                                                                ? formatIrishDate(tick.serviceDate)
                                                                : "No date" })] }), _jsx("span", { style: statusPillStyle, children: getServiceStatusLabel(tick) })] }), _jsxs("div", { style: timelineInfoStyle, children: [_jsxs("div", { children: [_jsx("strong", { children: "Engineer:" }), " ", tick.testedBy ?? "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Visit:" }), " ", tick.visitId ?? tick.jobRef ?? "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Locked:" }), " ", tick.locked ? "Yes" : "No"] })] }), tick.note ? (_jsxs("div", { style: noteBoxStyle, children: [_jsx("div", { style: noteLabelStyle, children: "Engineer Note" }), _jsx("div", { style: noteTextStyle, children: tick.note })] })) : null] }, `${tick.columnKey}-${tick.testedAt ?? tick.serviceDate ?? index}`))) }))] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Linked Faults" }), linkedFaults.length === 0 ? (_jsx("p", { style: emptyTextStyle, children: "No linked faults found for this asset." })) : (_jsx("div", { style: listGridStyle, children: linkedFaults.map((fault) => (_jsxs("div", { style: listCardStyle, children: [_jsxs("div", { style: listCardTopStyle, children: [_jsx("div", { style: listCardTitleStyle, children: fault.title ?? "Fault" }), _jsx("span", { style: smallPillStyle, children: fault.status ?? "open" })] }), _jsxs("div", { style: listMetaStyle, children: [fault.deviceId ?? fault.reference ?? "No ref", " \u2022", " ", fault.location?.locationText ?? "No location"] })] }, fault.id))) }))] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Linked Replacements" }), linkedReplacements.length === 0 ? (_jsx("p", { style: emptyTextStyle, children: "No linked replacements found for this asset." })) : (_jsx("div", { style: listGridStyle, children: linkedReplacements.map((replacement) => (_jsxs("div", { style: listCardStyle, children: [_jsxs("div", { style: listCardTopStyle, children: [_jsx("div", { style: listCardTitleStyle, children: replacement.title ?? replacement.partId ?? "Replacement" }), _jsx("span", { style: smallPillStyle, children: replacement.status ?? "recorded" })] }), _jsxs("div", { style: listMetaStyle, children: [replacement.partId ?? "No part", " \u2022", " ", replacement.deviceId ?? replacement.reference ?? "No ref"] }), replacement.reason ? (_jsx("div", { style: listNoteStyle, children: replacement.reason })) : null] }, replacement.id))) }))] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Related Visits" }), linkedVisits.length === 0 ? (_jsx("p", { style: emptyTextStyle, children: "No related visits linked to this asset yet." })) : (_jsx("div", { style: listGridStyle, children: linkedVisits.map((visit) => (_jsxs("div", { style: listCardStyle, children: [_jsxs("div", { style: listCardTopStyle, children: [_jsx("div", { style: listCardTitleStyle, children: visit.visitType ?? "Visit" }), _jsx("span", { style: smallPillStyle, children: visit.status ?? "unknown" })] }), _jsxs("div", { style: listMetaStyle, children: [visit.engineerName ?? "No engineer", " \u2022", " ", visit.completedAt
                                                ? formatIrishDateTime(visit.completedAt)
                                                : visit.startedAt
                                                    ? formatIrishDateTime(visit.startedAt)
                                                    : "No date"] }), _jsx("div", { style: visitActionWrapStyle, children: _jsx(PrimaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/visit/${visit.id}`, {
                                                state: { visit },
                                            }), children: "Open Visit" }) })] }, visit.id))) }))] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Actions" }), _jsxs("div", { style: actionGridStyle, children: [_jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/assets/${asset.id}/edit`), children: "Edit Asset" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/assets`), children: "Back to Assets" })] })] })] }) }));
}
function SummaryPill({ label, value, }) {
    return (_jsxs("div", { style: summaryPillStyle, children: [_jsx("div", { style: summaryPillLabelStyle, children: label }), _jsx("div", { style: summaryPillValueStyle, children: value })] }));
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
};
const heroActionsStyle = {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
};
const summaryGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
    marginTop: "14px",
};
const summaryPillStyle = {
    borderRadius: "16px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    padding: "12px",
};
const summaryPillLabelStyle = {
    fontSize: "0.72rem",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#64748b",
    marginBottom: "6px",
};
const summaryPillValueStyle = {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#111827",
};
const timelineGridStyle = {
    display: "grid",
    gap: "10px",
};
const timelineCardStyle = {
    borderRadius: "18px",
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    padding: "14px",
    display: "grid",
    gap: "10px",
};
const timelineTopStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: "10px",
};
const timelineTitleStyle = {
    fontWeight: 800,
    color: "#111827",
};
const timelineMetaStyle = {
    marginTop: "4px",
    color: "#6b7280",
    fontSize: "0.9rem",
};
const statusPillStyle = {
    borderRadius: "999px",
    padding: "6px 10px",
    background: "#e0e7ff",
    color: "#3730a3",
    fontWeight: 800,
    fontSize: "0.76rem",
    whiteSpace: "nowrap",
};
const timelineInfoStyle = {
    display: "grid",
    gap: "4px",
    color: "#475569",
    fontSize: "0.92rem",
};
const noteBoxStyle = {
    borderRadius: "14px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    padding: "12px",
};
const noteLabelStyle = {
    fontSize: "0.74rem",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#64748b",
    marginBottom: "6px",
};
const noteTextStyle = {
    color: "#111827",
    lineHeight: 1.45,
};
const listGridStyle = {
    display: "grid",
    gap: "10px",
};
const listCardStyle = {
    borderRadius: "16px",
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    padding: "14px",
    display: "grid",
    gap: "8px",
};
const listCardTopStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "start",
};
const listCardTitleStyle = {
    fontWeight: 800,
    color: "#111827",
};
const listMetaStyle = {
    color: "#6b7280",
    fontSize: "0.92rem",
    lineHeight: 1.4,
};
const listNoteStyle = {
    color: "#475569",
    fontSize: "0.92rem",
    lineHeight: 1.45,
};
const smallPillStyle = {
    borderRadius: "999px",
    padding: "5px 10px",
    background: "#e5e7eb",
    color: "#374151",
    fontWeight: 800,
    fontSize: "0.74rem",
    whiteSpace: "nowrap",
};
const visitActionWrapStyle = {
    marginTop: "2px",
};
const actionGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const emptyTextStyle = {
    margin: 0,
    color: "#6b7280",
};
