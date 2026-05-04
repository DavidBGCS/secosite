import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/ui/pages/ClosedFaultsPage.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { cleanFirestoreData } from "../../utils/cleanFirestoreData";
import { AppLayout } from "../layouts/AppLayout";
import { Card, CardTitle, Field, PrimaryButton, SecondaryButton, inputStyle, } from "../components/ui";
import { formatIrishDate, formatIrishDateTime } from "../utils/dateTime";
function nowIso() {
    return new Date().toISOString();
}
function getSeverityColors(severity) {
    const value = severity?.toLowerCase();
    if (value === "high" || value === "critical") {
        return {
            background: "#fee2e2",
            color: "#b91c1c",
            border: "#fecaca",
        };
    }
    if (value === "medium") {
        return {
            background: "#fef3c7",
            color: "#92400e",
            border: "#fde68a",
        };
    }
    if (value === "low") {
        return {
            background: "#dcfce7",
            color: "#166534",
            border: "#bbf7d0",
        };
    }
    return {
        background: "#f3f4f6",
        color: "#374151",
        border: "#e5e7eb",
    };
}
function getPriorityColors(priority) {
    const value = priority?.toLowerCase();
    if (value === "p1" || value === "urgent" || value === "high") {
        return {
            background: "#fee2e2",
            color: "#b91c1c",
        };
    }
    if (value === "p2" || value === "medium") {
        return {
            background: "#fef3c7",
            color: "#92400e",
        };
    }
    if (value === "p3" || value === "low") {
        return {
            background: "#dcfce7",
            color: "#166534",
        };
    }
    return {
        background: "#f3f4f6",
        color: "#374151",
    };
}
function getStatusColors(status) {
    const value = status?.toLowerCase();
    if (value === "closed" || value === "resolved") {
        return {
            background: "#dcfce7",
            color: "#166534",
        };
    }
    if (value === "abandoned") {
        return {
            background: "#fee2e2",
            color: "#b91c1c",
        };
    }
    return {
        background: "#f3f4f6",
        color: "#374151",
    };
}
export function ClosedFaultsPage() {
    const navigate = useNavigate();
    const { siteFile, updateSite, loading, error } = useFirestoreSite();
    const [search, setSearch] = useState("");
    const [messages, setMessages] = useState([]);
    const [saving, setSaving] = useState(false);
    const filteredFaults = useMemo(() => {
        if (!siteFile)
            return [];
        const q = search.trim().toLowerCase();
        if (!q) {
            return [...siteFile.closedFaults].sort((a, b) => (b.resolvedAt ?? b.updatedAt ?? "").localeCompare(a.resolvedAt ?? a.updatedAt ?? ""));
        }
        return [...siteFile.closedFaults]
            .filter((fault) => {
            const systemName = fault.systemId
                ? siteFile.systems.find((s) => s.id === fault.systemId)?.name
                : "";
            const haystack = [
                fault.title,
                fault.category,
                fault.severity,
                fault.priority,
                fault.status,
                fault.deviceId,
                fault.location?.locationText,
                fault.location?.level,
                fault.location?.room,
                fault.symptom?.summary,
                fault.rootCause?.summary,
                fault.notes,
                systemName,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return haystack.includes(q);
        })
            .sort((a, b) => (b.resolvedAt ?? b.updatedAt ?? "").localeCompare(a.resolvedAt ?? a.updatedAt ?? ""));
    }, [siteFile, search]);
    const persistSiteFile = async (next) => {
        setSaving(true);
        try {
            await updateSite(cleanFirestoreData({
                ...next,
                metadata: {
                    ...next.metadata,
                    updatedAt: nowIso(),
                },
            }));
        }
        finally {
            setSaving(false);
        }
    };
    const handleReopenFault = async (faultId) => {
        if (!siteFile)
            return;
        const confirmed = window.confirm("Reopen this fault and move it back to the open faults register?");
        if (!confirmed)
            return;
        try {
            const next = JSON.parse(JSON.stringify(siteFile));
            const fault = next.closedFaults.find((item) => item.id === faultId);
            if (!fault)
                return;
            const reopened = {
                ...fault,
                status: "open",
                resolvedAt: undefined,
                updatedAt: nowIso(),
            };
            next.closedFaults = next.closedFaults.filter((item) => item.id !== faultId);
            next.openFaults.unshift(reopened);
            await persistSiteFile(next);
            setMessages([`Fault "${fault.title}" reopened.`]);
        }
        catch (reopenError) {
            setMessages([
                reopenError instanceof Error ? reopenError.message : "Failed to reopen fault.",
            ]);
        }
    };
    if (loading) {
        return (_jsx(AppLayout, { title: "Loading closed faults", children: _jsx(Card, { children: "Loading closed faults..." }) }));
    }
    if (error) {
        return (_jsx(AppLayout, { title: "Closed faults error", children: _jsx(Card, { children: error }) }));
    }
    if (!siteFile) {
        return (_jsx(AppLayout, { title: "Closed faults not found", children: _jsxs(Card, { children: [_jsx("p", { style: { marginTop: 0 }, children: "The requested site could not be found." }), _jsx(SecondaryButton, { onClick: () => navigate("/"), children: "Back to Sites" })] }) }));
    }
    return (_jsx(AppLayout, { title: "Closed Faults", subtitle: `${siteFile.site.name} • ${siteFile.closedFaults.length} closed`, children: _jsxs("div", { style: pageGridStyle, children: [_jsx(Card, { children: _jsxs("div", { style: heroWrapStyle, children: [_jsxs("div", { children: [_jsx("div", { style: eyebrowStyle, children: "FAULT HISTORY" }), _jsx("div", { style: heroTitleStyle, children: "Closed / Resolved Faults" }), _jsx("div", { style: heroSubStyle, children: "Review resolved issues, confirm resolution trail, and reopen faults if needed." })] }), _jsxs("div", { style: heroBadgeStyle, children: [siteFile.closedFaults.length, " Closed"] })] }) }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Controls" }), _jsxs("div", { style: { display: "grid", gap: "12px" }, children: [_jsx(Field, { label: "Search Closed Faults", children: _jsx("input", { type: "text", placeholder: "Title, severity, system, location, symptom...", value: search, onChange: (e) => setSearch(e.target.value), style: inputStyle }) }), _jsxs("div", { style: twoColStyle, children: [_jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/faults/open`), children: "Open Faults" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/overview`), children: "Back to Overview" })] }), saving ? _jsx("div", { style: savingTextStyle, children: "Saving\u2026" }) : null] })] }), messages.length > 0 && (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Messages" }), _jsx("div", { style: messageListStyle, children: messages.map((message, index) => (_jsx("div", { children: message }, `${message}-${index}`))) })] })), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Closed Fault Register" }), filteredFaults.length === 0 ? (_jsx("p", { style: emptyTextStyle, children: "No closed faults found." })) : (_jsx("div", { style: faultGridStyle, children: filteredFaults.map((fault) => {
                                const systemName = fault.systemId
                                    ? siteFile.systems.find((s) => s.id === fault.systemId)?.name
                                    : undefined;
                                const severityColors = getSeverityColors(fault.severity);
                                const priorityColors = getPriorityColors(fault.priority);
                                const statusColors = getStatusColors(fault.status);
                                return (_jsxs("div", { style: {
                                        ...faultCardStyle,
                                        borderColor: severityColors.border,
                                    }, children: [_jsxs("div", { style: faultTopRowStyle, children: [_jsxs("div", { style: { minWidth: 0 }, children: [_jsx("div", { style: faultTitleStyle, children: fault.title }), _jsxs("div", { style: faultSubTitleStyle, children: [fault.deviceId ?? "No device ref", " \u2022", " ", fault.location?.locationText ?? "No location"] })] }), _jsxs("div", { style: faultBadgeGroupStyle, children: [_jsx("span", { style: {
                                                                ...badgeStyle,
                                                                background: statusColors.background,
                                                                color: statusColors.color,
                                                            }, children: fault.status ?? "closed" }), _jsx("span", { style: {
                                                                ...badgeStyle,
                                                                background: severityColors.background,
                                                                color: severityColors.color,
                                                            }, children: fault.severity ?? "—" }), _jsx("span", { style: {
                                                                ...badgeStyle,
                                                                background: priorityColors.background,
                                                                color: priorityColors.color,
                                                            }, children: fault.priority ?? "—" })] })] }), _jsxs("div", { style: faultInfoGridStyle, children: [_jsxs("div", { children: [_jsx("strong", { children: "Category:" }), " ", fault.category ?? "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "System:" }), " ", systemName ?? "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Opened:" }), " ", fault.firstObservedAt
                                                            ? formatIrishDateTime(fault.firstObservedAt)
                                                            : "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Resolved:" }), " ", fault.resolvedAt
                                                            ? formatIrishDateTime(fault.resolvedAt)
                                                            : fault.updatedAt
                                                                ? formatIrishDateTime(fault.updatedAt)
                                                                : "—"] })] }), _jsxs("div", { style: timelineCardStyle, children: [_jsx("div", { style: timelineTitleStyle, children: "Resolution Trail" }), _jsxs("div", { style: timelineLineStyle, children: ["Reported", " ", fault.firstObservedAt
                                                            ? formatIrishDate(fault.firstObservedAt)
                                                            : "—"] }), _jsxs("div", { style: timelineLineStyle, children: ["Last updated", " ", fault.updatedAt ? formatIrishDateTime(fault.updatedAt) : "—"] }), _jsxs("div", { style: timelineLineStyle, children: ["Closed", " ", fault.resolvedAt ? formatIrishDateTime(fault.resolvedAt) : "—"] })] }), fault.symptom?.summary ? (_jsxs("div", { style: faultTextBlockStyle, children: [_jsx("div", { style: faultTextLabelStyle, children: "Symptom" }), _jsx("div", { style: faultTextValueStyle, children: fault.symptom.summary })] })) : null, fault.rootCause?.summary ? (_jsxs("div", { style: faultTextBlockStyle, children: [_jsx("div", { style: faultTextLabelStyle, children: "Cause / Resolution" }), _jsx("div", { style: faultTextValueStyle, children: fault.rootCause.summary })] })) : null, fault.notes ? (_jsxs("div", { style: faultTextBlockStyle, children: [_jsx("div", { style: faultTextLabelStyle, children: "Notes" }), _jsx("div", { style: faultTextValueStyle, children: fault.notes })] })) : null, _jsxs("div", { style: faultActionsStyle, children: [_jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/visit/new`), disabled: saving, children: "New Visit" }), _jsx(PrimaryButton, { onClick: () => handleReopenFault(fault.id), disabled: saving, children: "Reopen Fault" })] })] }, fault.id));
                            }) }))] })] }) }));
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
    background: "#dcfce7",
    color: "#166534",
    fontSize: "0.82rem",
    fontWeight: 800,
    whiteSpace: "nowrap",
};
const twoColStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const savingTextStyle = {
    color: "#6b7280",
    fontWeight: 700,
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
const faultGridStyle = {
    display: "grid",
    gap: "12px",
};
const faultCardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "14px",
    background: "#ffffff",
    display: "grid",
    gap: "12px",
};
const faultTopRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: "10px",
};
const faultTitleStyle = {
    fontSize: "1rem",
    fontWeight: 800,
    color: "#111827",
    lineHeight: 1.2,
};
const faultSubTitleStyle = {
    color: "#6b7280",
    fontSize: "0.9rem",
    marginTop: "4px",
    lineHeight: 1.35,
};
const faultBadgeGroupStyle = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "end",
    gap: "6px",
};
const badgeStyle = {
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "0.75rem",
    fontWeight: 800,
    whiteSpace: "nowrap",
};
const faultInfoGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px 12px",
    color: "#374151",
    fontSize: "0.92rem",
};
const timelineCardStyle = {
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    padding: "12px",
    display: "grid",
    gap: "6px",
};
const timelineTitleStyle = {
    fontSize: "0.75rem",
    fontWeight: 800,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "2px",
};
const timelineLineStyle = {
    color: "#374151",
    fontSize: "0.9rem",
    lineHeight: 1.35,
};
const faultTextBlockStyle = {
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    padding: "12px",
};
const faultTextLabelStyle = {
    fontSize: "0.75rem",
    fontWeight: 800,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "6px",
};
const faultTextValueStyle = {
    color: "#111827",
    lineHeight: 1.45,
    fontSize: "0.94rem",
};
const faultActionsStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
