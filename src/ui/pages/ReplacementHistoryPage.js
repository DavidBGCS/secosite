import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
export function ReplacementHistoryPage() {
    const { siteFileId } = useParams();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        // TODO: replace with real data source
        const mock = [
            {
                id: "1",
                assetRef: "L1-023",
                assetType: "Optical Detector",
                location: "Corridor Outside Office",
                replacedWith: "Apollo XP95 Optical",
                date: "2026-03-25T10:20:00Z",
                engineer: "David",
                notes: "False alarms reported",
            },
            {
                id: "2",
                assetRef: "L2-011",
                assetType: "Manual Call Point",
                location: "Rear Exit",
                replacedWith: "New MCP Unit",
                date: "2026-03-25T09:10:00Z",
                engineer: "David",
            },
        ];
        setTimeout(() => {
            setRecords(mock);
            setLoading(false);
        }, 300);
    }, []);
    // 🇮🇪 Irish formatted date
    const formatDate = (date) => new Intl.DateTimeFormat("en-IE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(date));
    // Group by date
    const grouped = useMemo(() => {
        const map = {};
        records.forEach((r) => {
            const key = formatDate(r.date);
            if (!map[key])
                map[key] = [];
            map[key].push(r);
        });
        return map;
    }, [records]);
    return (_jsx(AppLayout, { title: "Replacement History", subtitle: "Parts replaced across all visits", children: loading ? (_jsx("div", { style: emptyStateStyle, children: "Loading replacement history\u2026" })) : records.length === 0 ? (_jsx("div", { style: emptyStateStyle, children: "No replacements recorded" })) : (Object.entries(grouped).map(([date, items]) => (_jsxs("div", { style: sectionStyle, children: [_jsx("div", { style: sectionHeaderStyle, children: date }), _jsx("div", { style: cardListStyle, children: items.map((r) => (_jsxs("div", { style: cardStyle, children: [_jsxs("div", { style: cardTopRow, children: [_jsx("div", { style: assetRefStyle, children: r.assetRef }), _jsx("div", { style: badgeStyle, children: "Replaced" })] }), _jsx("div", { style: assetTypeStyle, children: r.assetType }), r.location && (_jsx("div", { style: locationStyle, children: r.location })), r.replacedWith && (_jsxs("div", { style: replacementStyle, children: ["\u2192 ", r.replacedWith] })), _jsx("div", { style: metaRow, children: r.engineer && (_jsxs("span", { style: metaText, children: ["\uD83D\uDC77 ", r.engineer] })) }), r.notes && (_jsx("div", { style: notesStyle, children: r.notes }))] }, r.id))) })] }, date)))) }));
}
/* =======================
   STYLES (POLISHED UI)
======================= */
const sectionStyle = {
    marginBottom: "20px",
};
const sectionHeaderStyle = {
    fontWeight: 800,
    fontSize: "0.95rem",
    color: "#6b7280",
    marginBottom: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
};
const cardListStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
};
const cardStyle = {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "14px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 6px 14px rgba(15,23,42,0.05)",
};
const cardTopRow = {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "6px",
};
const assetRefStyle = {
    fontWeight: 800,
    fontSize: "0.95rem",
    color: "#111827",
};
const badgeStyle = {
    background: "#dcfce7",
    color: "#166534",
    fontSize: "0.7rem",
    fontWeight: 700,
    padding: "4px 8px",
    borderRadius: "999px",
};
const assetTypeStyle = {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#374151",
};
const locationStyle = {
    fontSize: "0.85rem",
    color: "#6b7280",
    marginTop: "4px",
};
const replacementStyle = {
    marginTop: "8px",
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#2563eb",
};
const metaRow = {
    marginTop: "8px",
};
const metaText = {
    fontSize: "0.8rem",
    color: "#6b7280",
};
const notesStyle = {
    marginTop: "8px",
    fontSize: "0.85rem",
    color: "#374151",
    background: "#f9fafb",
    padding: "8px",
    borderRadius: "10px",
};
const emptyStateStyle = {
    textAlign: "center",
    padding: "40px 0",
    color: "#6b7280",
};
