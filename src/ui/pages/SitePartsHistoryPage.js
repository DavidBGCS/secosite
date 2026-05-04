import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { AppLayout } from "../layouts/AppLayout";
import { Card, CardTitle, Field, SecondaryButton, inputStyle, } from "../components/ui";
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
function toActionLabel(value) {
    if (!value)
        return "Action";
    return value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}
export function SitePartsHistoryPage() {
    const navigate = useNavigate();
    const { siteFile, loading, error } = useFirestoreSite();
    const typedSiteFile = siteFile;
    const [search, setSearch] = useState("");
    const [selectedDiscipline, setSelectedDiscipline] = useState("all");
    const actions = useMemo(() => {
        if (!typedSiteFile)
            return [];
        const raw = typedSiteFile.partActions ?? [];
        const q = search.trim().toLowerCase();
        return [...raw]
            .filter((action) => {
            const disciplineMatch = selectedDiscipline === "all" ||
                action.discipline === selectedDiscipline;
            const text = [
                action.title,
                action.manufacturer,
                action.partCode,
                action.category,
                action.locationText,
                action.linkedAssetReference,
                action.engineerName,
                action.discipline,
                action.actionType,
                action.note,
                action.sourceType,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            const searchMatch = !q || text.includes(q);
            return disciplineMatch && searchMatch;
        })
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }, [typedSiteFile, search, selectedDiscipline]);
    if (loading) {
        return (_jsx(AppLayout, { title: "Parts History", children: _jsx(Card, { children: "Loading parts history..." }) }));
    }
    if (error || !typedSiteFile) {
        return (_jsx(AppLayout, { title: "Parts History Error", children: _jsx(Card, { children: error || "Site not found" }) }));
    }
    return (_jsx(AppLayout, { title: "Parts History", subtitle: `${typedSiteFile.site.name} • ${typedSiteFile.site.siteCode ?? typedSiteFile.site.id}`, children: _jsxs("div", { style: pageGridStyle, children: [_jsx(Card, { children: _jsxs("div", { style: heroWrapStyle, children: [_jsxs("div", { children: [_jsx("div", { style: eyebrowStyle, children: "PARTS ACTIVITY LOG" }), _jsx("div", { style: heroTitleStyle, children: "Site Parts History" }), _jsx("div", { style: heroSubStyle, children: "Full record of installed, replaced, removed, and temporary parts across all disciplines." })] }), _jsxs("div", { style: heroBadgeStyle, children: [actions.length, " Actions"] })] }) }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Filters" }), _jsxs("div", { style: filterGridStyle, children: [_jsx(Field, { label: "Search", children: _jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), style: inputStyle, placeholder: "Part, engineer, asset ref, location..." }) }), _jsx(Field, { label: "Discipline", children: _jsxs("div", { style: chipWrapStyle, children: [_jsx(Chip, { label: "All", active: selectedDiscipline === "all", onClick: () => setSelectedDiscipline("all") }), PART_DISCIPLINE_OPTIONS.map((option) => (_jsx(Chip, { label: option.label, active: selectedDiscipline === option.value, onClick: () => setSelectedDiscipline(option.value) }, option.value)))] }) }), _jsxs("div", { style: actionRowStyle, children: [_jsx(SecondaryButton, { onClick: () => navigate(`/site/${typedSiteFile.metadata.siteFileId}/parts`), children: "Back to Parts" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${typedSiteFile.metadata.siteFileId}/overview`), children: "Back to Overview" })] })] })] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Activity" }), actions.length === 0 ? (_jsx("p", { style: emptyTextStyle, children: "No parts activity recorded yet." })) : (_jsx("div", { style: historyGridStyle, children: actions.map((action) => (_jsxs("div", { style: historyCardStyle, children: [_jsxs("div", { style: historyTopRowStyle, children: [_jsxs("div", { children: [_jsx("div", { style: historyTitleStyle, children: action.title }), _jsxs("div", { style: historyMetaStyle, children: [DISCIPLINE_LABELS[action.discipline], " \u2022", " ", toActionLabel(action.actionType)] })] }), _jsxs("div", { style: pillWrapStyle, children: [_jsxs("span", { style: quantityPillStyle, children: ["Qty ", action.quantity] }), _jsx("span", { style: statusPillStyle, children: action.sourceType ?? "Unknown Source" })] })] }), _jsxs("div", { style: detailGridStyle, children: [_jsxs("div", { children: [_jsx("strong", { children: "Engineer:" }), " ", action.engineerName || "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Time:" }), " ", action.createdAt
                                                        ? formatIrishDateTime(action.createdAt)
                                                        : "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Manufacturer:" }), " ", action.manufacturer || "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Part Code:" }), " ", action.partCode || "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Category:" }), " ", action.category || "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Visit:" }), " ", action.visitId || "—"] }), _jsxs("div", { style: { gridColumn: "1 / -1" }, children: [_jsx("strong", { children: "Location:" }), " ", action.locationText || "—"] }), _jsxs("div", { style: { gridColumn: "1 / -1" }, children: [_jsx("strong", { children: "Linked Asset:" }), " ", action.linkedAssetReference || "—"] }), _jsxs("div", { style: { gridColumn: "1 / -1" }, children: [_jsx("strong", { children: "Note:" }), " ", action.note || "—"] })] })] }, action.id))) }))] })] }) }));
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
const filterGridStyle = {
    display: "grid",
    gap: "12px",
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
const actionRowStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const historyGridStyle = {
    display: "grid",
    gap: "12px",
};
const historyCardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "14px",
    background: "#f8fafc",
    display: "grid",
    gap: "12px",
};
const historyTopRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: "10px",
};
const historyTitleStyle = {
    fontSize: "1rem",
    fontWeight: 800,
    color: "#111827",
};
const historyMetaStyle = {
    marginTop: "4px",
    color: "#6b7280",
    fontWeight: 700,
    fontSize: "0.92rem",
};
const pillWrapStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    justifyContent: "end",
};
const quantityPillStyle = {
    borderRadius: "999px",
    padding: "6px 10px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: "0.76rem",
    fontWeight: 800,
    whiteSpace: "nowrap",
};
const statusPillStyle = {
    borderRadius: "999px",
    padding: "6px 10px",
    background: "#f3f4f6",
    color: "#374151",
    fontSize: "0.76rem",
    fontWeight: 800,
    whiteSpace: "nowrap",
};
const detailGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px 12px",
    color: "#374151",
    fontSize: "0.92rem",
};
const emptyTextStyle = {
    margin: 0,
    color: "#6b7280",
};
