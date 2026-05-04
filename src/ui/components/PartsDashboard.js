import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatIrishDateTime } from "../utils/dateTime";
const DISCIPLINE_LABELS = {
    "fire-alarm": "Fire Alarm",
    "intruder-alarm": "Intruder",
    cctv: "CCTV",
    "access-control": "Access",
    "emergency-lighting": "Emergency Lighting",
};
function quantityTotal(items) {
    return items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
}
function actionLabel(value) {
    if (!value)
        return "Action";
    return value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}
function groupByQuantity(actions, getKey) {
    return Object.entries(actions.reduce((acc, action) => {
        const key = getKey(action) || "Unknown";
        acc[key] = (acc[key] ?? 0) + (action.quantity ?? 0);
        return acc;
    }, {})).sort((a, b) => b[1] - a[1]);
}
function getActionTone(actionType) {
    if (actionType === "add" || actionType === "replace") {
        return { background: "#dcfce7", color: "#166534" };
    }
    if (actionType === "temporary-add") {
        return { background: "#fef3c7", color: "#92400e" };
    }
    if (actionType === "remove" || actionType === "return") {
        return { background: "#fee2e2", color: "#991b1b" };
    }
    return { background: "#dbeafe", color: "#1d4ed8" };
}
function getActionTitleColour(actionType) {
    if (actionType === "add" || actionType === "replace")
        return "#166534";
    if (actionType === "temporary-add")
        return "#92400e";
    if (actionType === "remove" || actionType === "return")
        return "#991b1b";
    return "#111827";
}
export function PartsDashboard({ installedParts = [], partActions = [], activeVisitId, }) {
    const activeVisitActions = activeVisitId
        ? partActions.filter((action) => action.visitId === activeVisitId)
        : [];
    const installedQuantity = quantityTotal(installedParts);
    const visitQuantity = quantityTotal(activeVisitActions);
    const activeDisciplines = new Set(partActions.map((action) => action.discipline).filter(Boolean)).size;
    const byDiscipline = groupByQuantity(partActions, (action) => action.discipline);
    const byEngineer = groupByQuantity(partActions, (action) => action.engineerName || "Unknown");
    const recentActions = [...partActions]
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        .slice(0, 6);
    return (_jsxs("div", { style: wrapStyle, children: [_jsxs("div", { style: kpiGridStyle, children: [_jsx(KpiCard, { label: "Installed Parts", value: installedParts.length, hint: "Distinct fitted part records", tone: "blue" }), _jsx(KpiCard, { label: "Total Quantity", value: installedQuantity, hint: "Total parts fitted on site", tone: "orange" }), _jsx(KpiCard, { label: "Part Actions", value: partActions.length, hint: "Add / replace / remove log", tone: "slate" }), _jsx(KpiCard, { label: "Disciplines", value: activeDisciplines, hint: "Disciplines with activity", tone: "green" })] }), activeVisitId ? (_jsxs("div", { style: visitCardStyle, children: [_jsx("div", { style: sectionKickerStyle, children: "ACTIVE VISIT PARTS" }), _jsxs("div", { style: visitTitleStyle, children: [visitQuantity, " parts logged on this visit"] }), _jsxs("div", { style: visitSubStyle, children: [activeVisitActions.length, " action", activeVisitActions.length === 1 ? "" : "s", " linked to the live job."] })] })) : null, _jsxs("div", { style: panelGridStyle, children: [_jsx(Panel, { title: "By Discipline", children: byDiscipline.length === 0 ? (_jsx(EmptyText, {})) : (byDiscipline.map(([discipline, quantity]) => (_jsx(MetricRow, { label: DISCIPLINE_LABELS[discipline] ?? discipline, value: quantity }, discipline)))) }), _jsx(Panel, { title: "By Engineer", children: byEngineer.length === 0 ? (_jsx(EmptyText, {})) : (byEngineer.map(([engineer, quantity]) => (_jsx(MetricRow, { label: engineer, value: quantity }, engineer)))) })] }), _jsx(Panel, { title: "Recent Part Activity", children: recentActions.length === 0 ? (_jsx(EmptyText, {})) : (_jsx("div", { style: activityGridStyle, children: recentActions.map((action) => (_jsxs("div", { style: activityCardStyle, children: [_jsxs("div", { style: activityTopStyle, children: [_jsxs("div", { children: [_jsx("div", { style: {
                                                    ...activityTitleStyle,
                                                    color: getActionTitleColour(action.actionType),
                                                }, children: action.title }), _jsxs("div", { style: activityMetaStyle, children: [action.engineerName || "Unknown", " \u2022", " ", DISCIPLINE_LABELS[action.discipline] ?? action.discipline] })] }), _jsxs("span", { style: { ...qtyPillStyle, ...getActionTone(action.actionType) }, children: [action.quantity, " parts"] })] }), _jsxs("div", { style: activityMetaStyle, children: [actionLabel(action.actionType), " \u2022 ", action.quantity, " parts \u2022", " ", action.createdAt ? formatIrishDateTime(action.createdAt) : "—"] }), action.locationText ? (_jsx("div", { style: activityMetaStyle, children: action.locationText })) : null] }, action.id))) })) })] }));
}
function KpiCard({ label, value, hint, tone, }) {
    const toneStyle = tone === "blue"
        ? kpiBlueStyle
        : tone === "orange"
            ? kpiOrangeStyle
            : tone === "green"
                ? kpiGreenStyle
                : kpiSlateStyle;
    return (_jsxs("div", { style: { ...kpiCardStyle, ...toneStyle }, children: [_jsx("div", { style: kpiLabelStyle, children: label }), _jsx("div", { style: kpiValueStyle, children: value }), _jsx("div", { style: kpiHintStyle, children: hint })] }));
}
function Panel({ title, children }) {
    return (_jsxs("div", { style: panelStyle, children: [_jsx("div", { style: panelTitleStyle, children: title }), _jsx("div", { style: panelBodyStyle, children: children })] }));
}
function MetricRow({ label, value }) {
    return (_jsxs("div", { style: metricRowStyle, children: [_jsx("span", { children: label }), _jsx("strong", { children: value })] }));
}
function EmptyText() {
    return (_jsxs("div", { style: emptyStateWrapStyle, children: [_jsx("div", { style: emptyTitleStyle, children: "No parts recorded yet" }), _jsx("div", { style: emptySubStyle, children: "Start adding parts to build your site record." })] }));
}
const wrapStyle = {
    display: "grid",
    gap: "14px",
};
const kpiGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
};
const kpiCardStyle = {
    borderRadius: "22px",
    padding: "16px 14px",
    minHeight: "128px",
    display: "grid",
    alignContent: "center",
    justifyItems: "center",
    gap: "8px",
    textAlign: "center",
    boxShadow: "0 14px 30px rgba(15,23,42,0.10)",
};
const kpiBlueStyle = {
    background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
    color: "#1d4ed8",
};
const kpiOrangeStyle = {
    background: "linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)",
    color: "#9a3412",
};
const kpiSlateStyle = {
    background: "linear-gradient(180deg, #f8fafc 0%, #e5e7eb 100%)",
    color: "#111827",
};
const kpiGreenStyle = {
    background: "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)",
    color: "#166534",
};
const kpiLabelStyle = {
    fontSize: "0.78rem",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
};
const kpiValueStyle = {
    fontSize: "2rem",
    fontWeight: 900,
    lineHeight: 1,
};
const kpiHintStyle = {
    fontSize: "0.84rem",
    lineHeight: 1.35,
    opacity: 0.86,
};
const visitCardStyle = {
    borderRadius: "22px",
    padding: "16px",
    background: "linear-gradient(135deg, #0f172a 0%, #172554 100%)",
    color: "#f8fafc",
    boxShadow: "0 16px 28px rgba(15,23,42,0.16)",
};
const sectionKickerStyle = {
    fontSize: "0.72rem",
    fontWeight: 900,
    letterSpacing: "0.1em",
    color: "#93c5fd",
    marginBottom: "6px",
};
const visitTitleStyle = {
    fontSize: "1.15rem",
    fontWeight: 900,
};
const visitSubStyle = {
    marginTop: "4px",
    color: "#cbd5e1",
    fontSize: "0.92rem",
};
const panelGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
};
const panelStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: "22px",
    padding: "14px",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    display: "grid",
    gap: "12px",
    boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
};
const panelTitleStyle = {
    fontSize: "1rem",
    fontWeight: 900,
    color: "#111827",
    textAlign: "center",
};
const panelBodyStyle = {
    display: "grid",
    gap: "8px",
};
const metricRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "10px 12px",
    borderRadius: "14px",
    background: "#f8fafc",
    color: "#374151",
};
const activityGridStyle = {
    display: "grid",
    gap: "10px",
};
const activityCardStyle = {
    borderRadius: "18px",
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    padding: "12px",
    display: "grid",
    gap: "8px",
};
const activityTopStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: "10px",
};
const activityTitleStyle = {
    fontWeight: 900,
};
const activityMetaStyle = {
    color: "#6b7280",
    fontSize: "0.88rem",
    lineHeight: 1.35,
};
const qtyPillStyle = {
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "0.76rem",
    fontWeight: 900,
    whiteSpace: "nowrap",
};
const emptyStateWrapStyle = {
    textAlign: "center",
    padding: "14px 8px",
};
const emptyTitleStyle = {
    fontWeight: 900,
    color: "#111827",
};
const emptySubStyle = {
    marginTop: "4px",
    color: "#6b7280",
    fontSize: "0.9rem",
    lineHeight: 1.35,
};
