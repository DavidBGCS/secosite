import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/ui/pages/SitePartsPage.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { AppLayout } from "../layouts/AppLayout";
import { Card, CardTitle, Field, PrimaryButton, SecondaryButton, inputStyle, } from "../components/ui";
import { AddPartActionModal } from "../components/AddPartActionModal";
import { PartsDashboard } from "../components/PartsDashboard";
import { PART_DISCIPLINE_OPTIONS } from "../../core/types/parts";
import { formatIrishDateTime } from "../utils/dateTime";
const DISCIPLINE_LABELS = {
    all: "All",
    "fire-alarm": "Fire Alarm",
    "intruder-alarm": "Intruder Alarm",
    cctv: "CCTV",
    "access-control": "Access Control",
    "emergency-lighting": "Emergency Lighting",
};
function sortInstalledParts(parts) {
    return [...parts].sort((a, b) => {
        const aTitle = `${a.discipline} ${a.title} ${a.locationText ?? ""}`.toLowerCase();
        const bTitle = `${b.discipline} ${b.title} ${b.locationText ?? ""}`.toLowerCase();
        return aTitle.localeCompare(bTitle);
    });
}
export function SitePartsPage() {
    const navigate = useNavigate();
    const { siteFile, updateSite, loading, error } = useFirestoreSite();
    const typedSiteFile = siteFile;
    const [search, setSearch] = useState("");
    const [selectedDiscipline, setSelectedDiscipline] = useState("all");
    const [showAddModal, setShowAddModal] = useState(false);
    const activeVisit = useMemo(() => {
        if (!siteFile)
            return undefined;
        return [...siteFile.visits]
            .filter((visit) => visit.status === "draft" || visit.status === "in-progress")
            .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))[0];
    }, [siteFile]);
    const installedParts = useMemo(() => {
        if (!typedSiteFile)
            return [];
        const raw = typedSiteFile.installedParts ?? [];
        const q = search.trim().toLowerCase();
        return sortInstalledParts(raw.filter((part) => {
            const disciplineMatch = selectedDiscipline === "all" || part.discipline === selectedDiscipline;
            const searchMatch = !q ||
                [
                    part.title,
                    part.manufacturer,
                    part.partCode,
                    part.category,
                    part.locationText,
                    part.linkedAssetReference,
                    part.discipline,
                    part.notes,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase()
                    .includes(q);
            return disciplineMatch && searchMatch;
        }));
    }, [typedSiteFile, search, selectedDiscipline]);
    const totalInstalledQuantity = useMemo(() => {
        return (typedSiteFile?.installedParts ?? []).reduce((sum, part) => sum + (part.quantity ?? 0), 0);
    }, [typedSiteFile]);
    if (loading) {
        return (_jsx(AppLayout, { title: "Installed Parts", children: _jsx(Card, { children: "Loading site parts..." }) }));
    }
    if (error) {
        return (_jsx(AppLayout, { title: "Parts error", children: _jsx(Card, { children: error }) }));
    }
    if (!typedSiteFile) {
        return (_jsx(AppLayout, { title: "Parts not found", children: _jsxs(Card, { children: [_jsx("p", { style: { marginTop: 0 }, children: "The requested site could not be found." }), _jsx(SecondaryButton, { onClick: () => navigate("/"), children: "Back to Sites" })] }) }));
    }
    return (_jsxs(AppLayout, { title: "Installed Parts", subtitle: `${typedSiteFile.site.name} • ${typedSiteFile.site.siteCode ?? typedSiteFile.site.id}`, sessionStatus: {
            isVisitActive: !!activeVisit,
            visitLabel: activeVisit?.visitType,
            engineerName: activeVisit?.engineerName,
            startedAt: activeVisit?.startedAt,
            serviceColumnLabel: activeVisit?.serviceColumnKey?.toUpperCase(),
        }, children: [_jsxs("div", { style: pageGridStyle, children: [_jsx(Card, { children: _jsxs("div", { style: heroWrapStyle, children: [_jsxs("div", { children: [_jsx("div", { style: eyebrowStyle, children: "SITE PARTS REGISTER" }), _jsx("div", { style: heroTitleStyle, children: "Installed Parts & Activity" }), _jsx("div", { style: heroSubStyle, children: "Record fitted parts across fire, intruder, CCTV, access, and emergency lighting without engineers overwriting each other." })] }), _jsxs("div", { style: heroActionStackStyle, children: [_jsxs("div", { style: heroBadgeStyle, children: [totalInstalledQuantity, " Parts Installed"] }), _jsx(PrimaryButton, { onClick: () => setShowAddModal(true), style: heroButtonStyle, children: "+ Add Part" })] })] }) }), _jsx(PartsDashboard, { installedParts: typedSiteFile.installedParts ?? [], partActions: typedSiteFile.partActions ?? [], activeVisitId: activeVisit?.id }), activeVisit ? (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Live Visit Link" }), _jsxs("div", { style: liveVisitBannerStyle, children: [_jsxs("div", { children: [_jsxs("div", { style: liveVisitTitleStyle, children: [activeVisit.visitType, activeVisit.serviceColumnKey
                                                        ? ` • ${activeVisit.serviceColumnKey.toUpperCase()}`
                                                        : ""] }), _jsxs("div", { style: liveVisitMetaStyle, children: [activeVisit.engineerName || "No engineer", " \u2022", " ", activeVisit.startedAt
                                                        ? formatIrishDateTime(activeVisit.startedAt)
                                                        : "No start time"] })] }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${typedSiteFile.metadata.siteFileId}/visit/${activeVisit.id}`, { state: { visit: activeVisit } }), children: "Open Live Visit" })] })] })) : null, _jsxs(Card, { children: [_jsx(CardTitle, { children: "Controls" }), _jsxs("div", { style: controlsGridStyle, children: [_jsx(Field, { label: "Search Parts", children: _jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), style: inputStyle, placeholder: "Part, manufacturer, code, location, asset ref..." }) }), _jsx(Field, { label: "Discipline", children: _jsxs("div", { style: chipWrapStyle, children: [_jsx(Chip, { label: "All", active: selectedDiscipline === "all", onClick: () => setSelectedDiscipline("all") }), PART_DISCIPLINE_OPTIONS.map((option) => (_jsx(Chip, { label: option.label, active: selectedDiscipline === option.value, onClick: () => setSelectedDiscipline(option.value) }, option.value)))] }) }), _jsxs("div", { style: actionsRowStyle, children: [_jsx(PrimaryButton, { onClick: () => setShowAddModal(true), children: "Add Part Action" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${typedSiteFile.metadata.siteFileId}/parts/history`), children: "View History" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${typedSiteFile.metadata.siteFileId}/overview`), children: "Back to Overview" })] })] })] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Installed Parts Register" }), installedParts.length === 0 ? (_jsx("p", { style: emptyTextStyle, children: "No installed parts recorded yet." })) : (_jsx("div", { style: gridListStyle, children: installedParts.map((part) => (_jsxs("div", { style: itemCardStyle, children: [_jsxs("div", { style: itemTopStyle, children: [_jsxs("div", { children: [_jsx("div", { style: itemTitleStyle, children: part.title }), _jsxs("div", { style: itemMetaStyle, children: [DISCIPLINE_LABELS[part.discipline], " \u2022 Qty ", part.quantity] })] }), _jsx("span", { style: {
                                                        ...pillStyle,
                                                        background: part.status === "installed"
                                                            ? "#dcfce7"
                                                            : part.status === "temporary"
                                                                ? "#fef3c7"
                                                                : "#f3f4f6",
                                                        color: part.status === "installed"
                                                            ? "#166534"
                                                            : part.status === "temporary"
                                                                ? "#92400e"
                                                                : "#374151",
                                                    }, children: part.status })] }), _jsxs("div", { style: detailGridStyle, children: [_jsxs("div", { children: [_jsx("strong", { children: "Manufacturer:" }), " ", part.manufacturer ?? "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Part Code:" }), " ", part.partCode ?? "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Category:" }), " ", part.category ?? "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Asset Ref:" }), " ", part.linkedAssetReference ?? "—"] }), _jsxs("div", { style: { gridColumn: "1 / -1" }, children: [_jsx("strong", { children: "Location:" }), " ", part.locationText ?? "—"] }), _jsxs("div", { style: { gridColumn: "1 / -1" }, children: [_jsx("strong", { children: "Notes:" }), " ", part.notes ?? "—"] })] })] }, part.id))) }))] })] }), showAddModal ? (_jsx(AddPartActionModal, { siteFile: typedSiteFile, activeVisit: activeVisit, updateSite: updateSite, onClose: () => setShowAddModal(false), onSaved: () => setShowAddModal(false) })) : null] }));
}
function Chip({ label, active, onClick, }) {
    return (_jsx("button", { type: "button", onClick: onClick, style: active ? chipActiveStyle : chipStyle, children: label }));
}
const pageGridStyle = {
    display: "grid",
    gap: "14px",
};
const heroWrapStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "14px",
};
const heroActionStackStyle = {
    display: "grid",
    gap: "10px",
    minWidth: "150px",
    justifyItems: "end",
};
const heroButtonStyle = {
    minHeight: "46px",
    borderRadius: "999px",
    padding: "0 18px",
};
const eyebrowStyle = {
    fontSize: "0.72rem",
    fontWeight: 900,
    letterSpacing: "0.1em",
    color: "#6b7280",
    marginBottom: "6px",
};
const heroTitleStyle = {
    fontSize: "1.45rem",
    fontWeight: 900,
    lineHeight: 1.1,
    color: "#111827",
    marginBottom: "6px",
};
const heroSubStyle = {
    color: "#6b7280",
    fontSize: "0.95rem",
    lineHeight: 1.35,
    maxWidth: "700px",
};
const heroBadgeStyle = {
    borderRadius: "999px",
    padding: "8px 12px",
    background: "#eef2ff",
    color: "#3730a3",
    fontSize: "0.82rem",
    fontWeight: 900,
    whiteSpace: "nowrap",
};
const liveVisitBannerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "14px",
    borderRadius: "18px",
    background: "linear-gradient(180deg, #ecfdf5 0%, #dcfce7 100%)",
    border: "1px solid #86efac",
};
const liveVisitTitleStyle = {
    fontWeight: 900,
    color: "#166534",
    fontSize: "1rem",
};
const liveVisitMetaStyle = {
    marginTop: "4px",
    color: "#15803d",
    fontSize: "0.92rem",
};
const controlsGridStyle = {
    display: "grid",
    gap: "12px",
};
const actionsRowStyle = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
};
const chipWrapStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
};
const chipStyle = {
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#111827",
    borderRadius: "999px",
    padding: "10px 12px",
    fontSize: "0.88rem",
    cursor: "pointer",
};
const chipActiveStyle = {
    ...chipStyle,
    background: "#111827",
    color: "#fff",
    border: "1px solid #111827",
};
const gridListStyle = {
    display: "grid",
    gap: "12px",
};
const itemCardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "14px",
    background: "#f8fafc",
    display: "grid",
    gap: "12px",
};
const itemTopStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: "10px",
};
const itemTitleStyle = {
    fontSize: "1rem",
    fontWeight: 900,
    color: "#111827",
};
const itemMetaStyle = {
    marginTop: "4px",
    color: "#6b7280",
    fontWeight: 700,
    fontSize: "0.92rem",
};
const detailGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px 12px",
    color: "#374151",
    fontSize: "0.92rem",
};
const pillStyle = {
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "0.76rem",
    fontWeight: 900,
    whiteSpace: "nowrap",
};
const emptyTextStyle = {
    margin: 0,
    color: "#6b7280",
};
