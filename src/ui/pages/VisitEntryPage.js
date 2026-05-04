import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../app/context/AuthContext";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { cleanFirestoreData } from "../../utils/cleanFirestoreData";
import { AppLayout } from "../layouts/AppLayout";
import { Card, CardTitle, Field, PrimaryButton, SecondaryButton, inputStyle as baseInputStyle, textareaStyle as baseTextareaStyle, } from "../components/ui";
import { formatIrishDateTime } from "../utils/dateTime";
import { AddPartActionModal } from "../components/AddPartActionModal";
/* ---------------- helpers ---------------- */
function nowIso() {
    return new Date().toISOString();
}
function formatElapsed(startedAt) {
    if (!startedAt)
        return "00:00:00";
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - start);
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
        .map((value) => String(value).padStart(2, "0"))
        .join(":");
}
function toVisitTypeLabel(value) {
    if (!value)
        return "Visit";
    return value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}
/* ---------------- component ---------------- */
export function VisitEntryPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { visitId } = useParams();
    const { user } = useAuth();
    const { siteFile, updateSite, loading, error } = useFirestoreSite();
    const routeVisit = location.state?.visit;
    const existingVisit = useMemo(() => {
        if (!siteFile || !visitId)
            return undefined;
        return siteFile.visits.find((v) => v.id === visitId);
    }, [siteFile, visitId]);
    const visit = existingVisit ?? routeVisit;
    const isHydrating = !!visitId && !visit;
    const [form, setForm] = useState({
        engineerName: "",
        visitType: "routine-service",
        status: "in-progress",
        discipline: "fire-alarm",
        systemStatus: "unknown",
        serviceColumnKey: "",
        workCarriedOut: "",
    });
    const [elapsed, setElapsed] = useState("00:00:00");
    const [saving, setSaving] = useState(false);
    const [showPartsModal, setShowPartsModal] = useState(false);
    const [messages, setMessages] = useState([]);
    /* ---------------- hydrate ---------------- */
    useEffect(() => {
        if (!siteFile || !visit)
            return;
        setForm({
            engineerName: visit.engineerName || user?.displayName || user?.email || "",
            visitType: visit.visitType ?? "routine-service",
            status: visit.status === "draft"
                ? "in-progress"
                : visit.status ?? "in-progress",
            discipline: visit.discipline ?? "fire-alarm",
            systemStatus: visit.systemStatus ?? "unknown",
            serviceColumnKey: visit.serviceColumnKey ?? siteFile.serviceLayout.columns[0]?.key ?? "",
            workCarriedOut: visit.workCarriedOut ?? "",
        });
    }, [visit, siteFile, user]);
    useEffect(() => {
        if (!visit?.startedAt) {
            setElapsed("00:00:00");
            return;
        }
        const update = () => {
            setElapsed(formatElapsed(visit.startedAt));
        };
        update();
        const interval = window.setInterval(update, 1000);
        return () => window.clearInterval(interval);
    }, [visit?.startedAt]);
    /* ---------------- persist ---------------- */
    const persistVisit = async (status) => {
        if (!siteFile || !visit)
            return;
        const next = JSON.parse(JSON.stringify(siteFile));
        const updated = {
            ...visit,
            ...form,
            status,
            updatedAt: nowIso(),
            completedAt: status === "completed" ? nowIso() : undefined,
        };
        const index = next.visits.findIndex((v) => v.id === updated.id);
        if (index >= 0) {
            next.visits[index] = updated;
        }
        else {
            next.visits.unshift(updated);
        }
        next.metadata.updatedAt = nowIso();
        setSaving(true);
        try {
            await updateSite(cleanFirestoreData(next));
        }
        finally {
            setSaving(false);
        }
        return updated;
    };
    /* ---------------- actions ---------------- */
    const handleSaveProgress = async () => {
        if (!visit)
            return;
        try {
            await persistVisit("in-progress");
            setMessages(["Progress saved."]);
        }
        catch (saveError) {
            setMessages([
                saveError instanceof Error ? saveError.message : "Failed to save progress.",
            ]);
        }
    };
    const handleComplete = async () => {
        if (form.status !== "in-progress") {
            setMessages(["Visit must be in progress before completing."]);
            return;
        }
        try {
            await persistVisit("completed");
            setMessages(["Visit completed."]);
            navigate(`/site/${siteFile?.metadata.siteFileId}/overview`);
        }
        catch (saveError) {
            setMessages([
                saveError instanceof Error ? saveError.message : "Failed to complete visit.",
            ]);
        }
    };
    /* ---------------- loading states ---------------- */
    if (loading) {
        return (_jsx(AppLayout, { title: "Loading", children: _jsx(Card, { children: "Loading\u2026" }) }));
    }
    if (error || !siteFile) {
        return (_jsx(AppLayout, { title: "Error", children: _jsx(Card, { children: error || "Site not found" }) }));
    }
    /* ---------------- UI ---------------- */
    return (_jsxs(AppLayout, { title: "Visit Control", subtitle: siteFile.site.name, sessionStatus: {
            isVisitActive: !!visit && form.status === "in-progress",
            visitLabel: form.visitType,
            engineerName: form.engineerName,
            startedAt: visit?.startedAt,
            serviceColumnLabel: form.serviceColumnKey?.toUpperCase(),
        }, children: [_jsxs("div", { style: pageGridStyle, children: [isHydrating && (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Opening Visit\u2026" }), _jsx("p", { style: plainTextStyle, children: "Syncing visit data\u2026" })] })), !isHydrating && visit && (_jsxs(_Fragment, { children: [_jsx(Card, { children: _jsxs("div", { style: heroShellStyle, children: [_jsxs("div", { style: heroTopRowStyle, children: [_jsxs("div", { children: [_jsx("div", { style: heroEyebrowStyle, children: "LIVE JOB CONTROL" }), _jsx("div", { style: heroTitleStyle, children: toVisitTypeLabel(form.visitType) }), _jsxs("div", { style: heroSubStyle, children: [form.engineerName || "Engineer", " \u2022", " ", form.serviceColumnKey
                                                                    ? form.serviceColumnKey.toUpperCase()
                                                                    : "No service column"] })] }), _jsx("div", { style: heroBadgeStyle, children: "\u25CF LIVE" })] }), _jsxs("div", { style: heroInfoGridStyle, children: [_jsxs("div", { style: heroInfoCardStyle, children: [_jsx("div", { style: heroInfoLabelStyle, children: "Started" }), _jsx("div", { style: heroInfoValueStyle, children: visit.startedAt ? formatIrishDateTime(visit.startedAt) : "—" })] }), _jsxs("div", { style: heroInfoCardStyle, children: [_jsx("div", { style: heroInfoLabelStyle, children: "Elapsed" }), _jsx("div", { style: heroInfoValueStyle, children: elapsed })] }), _jsxs("div", { style: heroInfoCardStyle, children: [_jsx("div", { style: heroInfoLabelStyle, children: "Discipline" }), _jsx("div", { style: heroInfoValueStyle, children: form.discipline })] }), _jsxs("div", { style: heroInfoCardStyle, children: [_jsx("div", { style: heroInfoLabelStyle, children: "Status" }), _jsx("div", { style: heroInfoValueStyle, children: form.status })] })] })] }) }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Job Status" }), _jsxs("div", { style: sectionGridStyle, children: [_jsx(Field, { label: "Engineer", children: _jsx("input", { value: form.engineerName, disabled: true, style: inputStyle }) }), _jsx(Field, { label: "System Status", children: _jsxs("select", { value: form.systemStatus, onChange: (e) => setForm((prev) => ({
                                                        ...prev,
                                                        systemStatus: e.target.value,
                                                    })), style: inputStyle, children: [_jsx("option", { value: "normal", children: "Normal" }), _jsx("option", { value: "faulted", children: "Faulted" }), _jsx("option", { value: "partially-faulted", children: "Partially Faulted" }), _jsx("option", { value: "disabled", children: "Disabled" }), _jsx("option", { value: "partially-disabled", children: "Partially Disabled" }), _jsx("option", { value: "unknown", children: "Unknown" })] }) })] }), _jsxs("div", { style: quickNavGridStyle, children: [_jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/service`), style: navButtonStyle, children: "Go to Service" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/faults/open`), style: navButtonStyle, children: "Go to Faults" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/assets`), style: navButtonStyle, children: "Open Assets" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/parts`), style: navButtonStyle, children: "Open Parts" }), _jsx(PrimaryButton, { onClick: () => setShowPartsModal(true), style: navButtonStyle, children: "Add Parts" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/reports`), style: navButtonStyle, children: "Open Reports" })] })] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Engineer Notes" }), _jsx(Field, { label: "Work Carried Out", children: _jsx("textarea", { value: form.workCarriedOut, onChange: (e) => setForm((prev) => ({
                                                ...prev,
                                                workCarriedOut: e.target.value,
                                            })), placeholder: "What was done on this visit?", style: textareaStyle }) })] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Visit Actions" }), _jsxs("div", { style: actionsGridStyle, children: [_jsx(SecondaryButton, { onClick: handleSaveProgress, disabled: saving, style: actionButtonStyle, children: saving ? "Saving..." : "Save Progress" }), _jsx(PrimaryButton, { onClick: handleComplete, disabled: saving, style: actionButtonStyle, children: "Complete Visit" })] })] })] })), messages.length > 0 && (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Messages" }), _jsx("div", { style: messageListStyle, children: messages.map((message, index) => (_jsx("div", { children: message }, `${message}-${index}`))) })] }))] }), showPartsModal && visit ? (_jsx(AddPartActionModal, { siteFile: siteFile, activeVisit: visit, updateSite: updateSite, onClose: () => setShowPartsModal(false), onSaved: () => {
                    setShowPartsModal(false);
                    setMessages(["Part action saved to this live visit."]);
                } })) : null] }));
}
/* ---------------- styles ---------------- */
const pageGridStyle = {
    display: "grid",
    gap: "14px",
};
const plainTextStyle = {
    margin: 0,
    color: "#6b7280",
};
const heroShellStyle = {
    display: "grid",
    gap: "14px",
    padding: "16px",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #0f172a 0%, #172554 55%, #1e3a8a 100%)",
    color: "#f8fafc",
    boxShadow: "0 18px 28px rgba(15,23,42,0.18)",
};
const heroTopRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: "12px",
};
const heroEyebrowStyle = {
    fontSize: "0.74rem",
    fontWeight: 800,
    letterSpacing: "0.1em",
    color: "#93c5fd",
    marginBottom: "6px",
};
const heroTitleStyle = {
    fontSize: "1.45rem",
    fontWeight: 800,
    lineHeight: 1.1,
};
const heroSubStyle = {
    marginTop: "6px",
    color: "#cbd5e1",
    fontSize: "0.95rem",
};
const heroBadgeStyle = {
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(34,197,94,0.16)",
    border: "1px solid rgba(34,197,94,0.24)",
    color: "#dcfce7",
    fontWeight: 800,
    whiteSpace: "nowrap",
};
const heroInfoGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const heroInfoCardStyle = {
    padding: "12px",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(148,163,184,0.18)",
};
const heroInfoLabelStyle = {
    fontSize: "0.72rem",
    fontWeight: 800,
    letterSpacing: "0.08em",
    color: "#93c5fd",
    textTransform: "uppercase",
    marginBottom: "6px",
};
const heroInfoValueStyle = {
    fontSize: "0.98rem",
    fontWeight: 700,
    color: "#f8fafc",
    lineHeight: 1.35,
};
const sectionGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const quickNavGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginTop: "12px",
};
const actionsGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const navButtonStyle = {
    minHeight: "52px",
};
const actionButtonStyle = {
    minHeight: "56px",
    fontWeight: 800,
};
const messageListStyle = {
    display: "grid",
    gap: "6px",
    color: "#1e3a8a",
    fontWeight: 700,
};
const inputStyle = {
    ...baseInputStyle,
    minHeight: "52px",
    borderRadius: "14px",
};
const textareaStyle = {
    ...baseTextareaStyle,
    minHeight: "140px",
    borderRadius: "14px",
};
