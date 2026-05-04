import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSiteFileSummaryReport } from "../../core";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { useAuth } from "../../app/context/AuthContext";
import { cleanFirestoreData } from "../../utils/cleanFirestoreData";
import { AppLayout } from "../layouts/AppLayout";
import { Card, CardTitle, PrimaryButton, SecondaryButton, } from "../components/ui";
import { formatIrishDate, formatIrishDateTime } from "../utils/dateTime";
const DISCIPLINE_LABELS = {
    "fire-alarm": "Fire",
    "intruder-alarm": "Intruder",
    cctv: "CCTV",
    "access-control": "Access",
    "emergency-lighting": "E-Lighting",
};
function makeId(prefix = "id") {
    if (globalThis.crypto?.randomUUID) {
        return `${prefix}-${globalThis.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
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
function getEngineerNameFromUser(user) {
    if (!user)
        return "";
    if (user.displayName?.trim())
        return user.displayName.trim();
    if (user.email?.trim())
        return user.email.split("@")[0];
    return "";
}
export function SiteOverviewPage() {
    const navigate = useNavigate();
    const { siteFile, updateSite, loading, error } = useFirestoreSite();
    const { user } = useAuth();
    const [visitType, setVisitType] = useState("routine-service");
    const [selectedDisciplines, setSelectedDisciplines] = useState([
        "fire-alarm",
    ]);
    const [selectedServiceColumnKey, setSelectedServiceColumnKey] = useState("");
    const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
    const [elapsed, setElapsed] = useState("00:00:00");
    const [startingVisit, setStartingVisit] = useState(false);
    const [messages, setMessages] = useState([]);
    const [showEndJobModal, setShowEndJobModal] = useState(false);
    const currentServiceColumnKey = siteFile?.serviceLayout.columns[0]?.key ?? "";
    const summary = useMemo(() => {
        if (!siteFile)
            return undefined;
        return getSiteFileSummaryReport(siteFile, {
            currentServiceColumnKey,
        });
    }, [siteFile, currentServiceColumnKey]);
    const completedServiceKeys = useMemo(() => {
        if (!siteFile)
            return new Set();
        return new Set(siteFile.visits
            .filter((visit) => (visit.status === "completed" || visit.status === "exported") &&
            !!visit.serviceColumnKey)
            .map((visit) => visit.serviceColumnKey));
    }, [siteFile]);
    const availableServiceColumns = useMemo(() => {
        if (!siteFile)
            return [];
        return siteFile.serviceLayout.columns.filter((column) => !completedServiceKeys.has(column.key));
    }, [siteFile, completedServiceKeys]);
    const recentVisit = useMemo(() => {
        return summary?.recentVisits?.[0];
    }, [summary]);
    const activeVisit = useMemo(() => {
        if (!siteFile)
            return undefined;
        return [...siteFile.visits]
            .filter((visit) => visit.status === "draft" || visit.status === "in-progress")
            .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))[0];
    }, [siteFile]);
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);
    useEffect(() => {
        if (!activeVisit?.startedAt) {
            setElapsed("00:00:00");
            return;
        }
        const updateElapsed = () => {
            setElapsed(formatElapsed(activeVisit.startedAt));
        };
        updateElapsed();
        const interval = window.setInterval(updateElapsed, 1000);
        return () => window.clearInterval(interval);
    }, [activeVisit?.startedAt]);
    const toggleDiscipline = (discipline) => {
        setSelectedDisciplines((prev) => {
            if (prev.includes(discipline)) {
                if (prev.length === 1)
                    return prev;
                return prev.filter((item) => item !== discipline);
            }
            return [...prev, discipline];
        });
    };
    const handleStartVisit = async () => {
        if (!siteFile)
            return;
        if (activeVisit) {
            navigate(`/site/${siteFile.metadata.siteFileId}/visit/${activeVisit.id}`, {
                state: { visit: activeVisit },
            });
            return;
        }
        if (visitType === "routine-service" &&
            availableServiceColumns.length > 0 &&
            !selectedServiceColumnKey) {
            setMessages(["Please select the service quarter / column before starting the visit."]);
            return;
        }
        const engineerName = getEngineerNameFromUser(user);
        if (!engineerName) {
            setMessages(["Could not determine engineer name from login."]);
            return;
        }
        try {
            setStartingVisit(true);
            setMessages([]);
            const now = nowIso();
            const newVisit = {
                id: makeId("visit"),
                siteId: siteFile.site.id,
                startedAt: now,
                engineerName,
                visitType,
                status: "in-progress",
                discipline: selectedDisciplines[0] ?? "fire-alarm",
                systemStatus: "unknown",
                photoIds: [],
                faultIds: [],
                complianceIds: [],
                replacementIds: [],
                systemIds: [],
                serviceColumnKey: visitType === "routine-service" ? selectedServiceColumnKey || undefined : undefined,
                exportPdfCreated: "no",
                createdAt: now,
                updatedAt: now,
            };
            const next = JSON.parse(JSON.stringify(siteFile));
            next.visits.unshift(newVisit);
            next.metadata.updatedAt = now;
            await updateSite(cleanFirestoreData(next));
            navigate(`/site/${siteFile.metadata.siteFileId}/visit/${newVisit.id}`, {
                state: { visit: newVisit },
            });
        }
        catch (startError) {
            setMessages([
                startError instanceof Error ? startError.message : "Failed to start visit.",
            ]);
        }
        finally {
            setStartingVisit(false);
        }
    };
    const handleContinueJob = () => {
        if (!siteFile || !activeVisit)
            return;
        navigate(`/site/${siteFile.metadata.siteFileId}/visit/${activeVisit.id}`, {
            state: { visit: activeVisit },
        });
    };
    const handleConfirmEndJob = async () => {
        if (!siteFile || !activeVisit)
            return;
        try {
            setStartingVisit(true);
            const next = JSON.parse(JSON.stringify(siteFile));
            const index = next.visits.findIndex((visit) => visit.id === activeVisit.id);
            if (index < 0)
                return;
            next.visits[index] = {
                ...next.visits[index],
                status: "completed",
                completedAt: nowIso(),
                updatedAt: nowIso(),
            };
            next.metadata.updatedAt = nowIso();
            await updateSite(cleanFirestoreData(next));
            setMessages(["Job ended and visit completed."]);
            setShowEndJobModal(false);
        }
        catch (endError) {
            setMessages([
                endError instanceof Error ? endError.message : "Failed to end active job.",
            ]);
        }
        finally {
            setStartingVisit(false);
        }
    };
    if (loading) {
        return (_jsx(AppLayout, { title: "Loading site", children: _jsx(Card, { children: "Loading site..." }) }));
    }
    if (error) {
        return (_jsx(AppLayout, { title: "Site error", children: _jsx(Card, { children: error }) }));
    }
    if (!siteFile || !summary) {
        return (_jsx(AppLayout, { title: "Site not found", children: _jsxs(Card, { children: [_jsx("p", { style: { marginTop: 0 }, children: "The requested site could not be found." }), _jsx(SecondaryButton, { onClick: () => navigate("/"), children: "Back to Sites" })] }) }));
    }
    const siteFileId = siteFile.metadata.siteFileId;
    const engineerName = getEngineerNameFromUser(user);
    const openFaultCount = summary.headline.openFaultsCount ?? 0;
    const visitsCount = summary.headline.visitsCount ?? 0;
    const assetsCount = summary.headline.assetsCount ?? 0;
    const reportsCount = summary.headline.exportedReportsCount ?? 0;
    const installedPartsCount = (siteFile.installedParts ?? []).length;
    return (_jsx(AppLayout, { title: summary.headline.siteName, subtitle: `Ref: ${summary.headline.siteReference ?? "—"}`, sessionStatus: {
            isVisitActive: !!activeVisit,
            visitLabel: activeVisit?.visitType,
            engineerName: activeVisit?.engineerName ?? engineerName,
            startedAt: activeVisit?.startedAt,
            serviceColumnLabel: activeVisit?.serviceColumnKey?.toUpperCase(),
        }, children: _jsxs("div", { style: pageGridStyle, children: [_jsx(Card, { children: _jsxs("div", { style: heroShellStyle, children: [_jsx("div", { style: heroGlowStyle }), _jsxs("div", { style: heroContentStyle, children: [_jsxs("div", { style: { minWidth: 0 }, children: [_jsx("div", { style: heroEyebrowStyle, children: "SITE CONTROL" }), _jsx("div", { style: heroTitleStyle, children: summary.headline.siteName }), _jsx("div", { style: heroSubStyle, children: summary.headline.address ?? "No address recorded" }), _jsxs("div", { style: heroMetaWrapStyle, children: [_jsx("span", { style: heroMetaPillStyle, children: summary.headline.siteReference ?? "No reference" }), _jsxs("span", { style: heroMetaPillStyle, children: ["Maintained By: ", summary.headline.maintainedBy ?? "—"] }), _jsxs("span", { style: heroMetaPillStyle, children: ["Engineer: ", engineerName || "—"] })] })] }), _jsxs("div", { style: heroRightStackStyle, children: [_jsxs("div", { style: isOnline ? onlineChipStyle : offlineChipStyle, children: [_jsx("span", { style: isOnline ? onlineDotStyle : offlineDotStyle }), isOnline ? "Online" : "Offline"] }), activeVisit ? (_jsxs("div", { style: activeMiniPanelStyle, children: [_jsx("div", { style: activeMiniLabelStyle, children: "Live Job" }), _jsx("div", { style: activeMiniValueStyle, children: elapsed })] })) : (_jsxs("div", { style: idleMiniPanelStyle, children: [_jsx("div", { style: activeMiniLabelStyle, children: "No Active Job" }), _jsx("div", { style: idleMiniValueStyle, children: "Idle" })] }))] })] })] }) }), activeVisit ? (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Live Job" }), _jsxs("div", { style: liveJobPanelStyle, children: [_jsxs("div", { children: [_jsx("div", { style: liveJobKickerStyle, children: "\u25CF LIVE JOB" }), _jsxs("div", { style: liveJobTitleStyle, children: [activeVisit.visitType, activeVisit.serviceColumnKey
                                                    ? ` • ${activeVisit.serviceColumnKey.toUpperCase()}`
                                                    : ""] }), _jsxs("div", { style: liveJobMetaStyle, children: [activeVisit.engineerName || "No engineer", " \u2022", " ", activeVisit.startedAt
                                                    ? formatIrishDateTime(activeVisit.startedAt)
                                                    : "—", " ", "\u2022 ", elapsed] })] }), _jsxs("div", { style: liveJobActionsStyle, children: [_jsx(PrimaryButton, { onClick: handleContinueJob, style: liveActionButtonStyle, children: "Continue Job" }), _jsx(SecondaryButton, { onClick: () => setShowEndJobModal(true), style: liveActionButtonStyle, children: "End Job" })] })] })] })) : (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Start Visit" }), _jsxs("div", { style: startVisitGridStyle, children: [_jsxs("div", { style: visitStateBannerStyle(false), children: [_jsx("div", { style: visitStateTitleStyle, children: "No active visit" }), _jsx("div", { style: visitStateSubStyle, children: "Choose the visit type, disciplines, and quarter below. Press Start Visit to create the live visit immediately." })] }), _jsxs("div", { style: fieldBlockStyle, children: [_jsx("div", { style: fieldLabelStyle, children: "Visit Type" }), _jsxs("div", { style: segmentedWrapStyle, children: [_jsx(SegmentButton, { active: visitType === "routine-service", onClick: () => setVisitType("routine-service"), children: "Service" }), _jsx(SegmentButton, { active: visitType === "fault-visit", onClick: () => setVisitType("fault-visit"), children: "Fault" }), _jsx(SegmentButton, { active: visitType === "reactive-callout", onClick: () => setVisitType("reactive-callout"), children: "Call-out" }), _jsx(SegmentButton, { active: visitType === "inspection", onClick: () => setVisitType("inspection"), children: "Inspect" }), _jsx(SegmentButton, { active: visitType === "small-works", onClick: () => setVisitType("small-works"), children: "Works" })] })] }), _jsxs("div", { style: fieldBlockStyle, children: [_jsx("div", { style: fieldLabelStyle, children: "Disciplines" }), _jsx("div", { style: segmentedWrapStyle, children: Object.keys(DISCIPLINE_LABELS).map((discipline) => (_jsx(SegmentButton, { active: selectedDisciplines.includes(discipline), onClick: () => toggleDiscipline(discipline), children: DISCIPLINE_LABELS[discipline] }, discipline))) })] }), visitType === "routine-service" ? (_jsxs("div", { style: fieldBlockStyle, children: [_jsx("div", { style: fieldLabelStyle, children: "Service Quarter / Column" }), availableServiceColumns.length === 0 ? (_jsx("div", { style: infoPanelStyle, children: "All current service columns appear completed. Review service data or start a non-service visit instead." })) : (_jsx("div", { style: serviceColumnGridStyle, children: availableServiceColumns.map((column) => {
                                                const active = selectedServiceColumnKey === column.key;
                                                return (_jsxs("button", { type: "button", onClick: () => setSelectedServiceColumnKey(column.key), style: active ? serviceColumnCardActiveStyle : serviceColumnCardStyle, children: [_jsx("div", { style: serviceColumnTitleStyle, children: column.label }), _jsx("div", { style: serviceColumnMetaStyle, children: column.serviceDate ? formatIrishDate(column.serviceDate) : "No date" })] }, column.key));
                                            }) }))] })) : null, _jsxs("div", { style: startVisitActionRowStyle, children: [_jsx(PrimaryButton, { onClick: handleStartVisit, disabled: startingVisit, style: startVisitButtonStyle, children: startingVisit ? "Starting..." : "Start Visit" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFileId}/site-notes`), style: startVisitButtonStyle, children: "Review Site Notes" })] })] })] })), messages.length > 0 ? (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Messages" }), _jsx("div", { style: messageListStyle, children: messages.map((message, index) => (_jsx("div", { children: message }, `${message}-${index}`))) })] })) : null, _jsxs("div", { style: kpiGridStyle, children: [_jsxs("button", { type: "button", onClick: () => navigate(`/site/${siteFileId}/faults/open`), style: { ...kpiCardStyle, ...kpiDangerStyle }, children: [_jsx("div", { style: kpiIconStyle, children: "\u26A0\uFE0F" }), _jsx("div", { style: kpiValueStyle, children: openFaultCount }), _jsx("div", { style: kpiLabelStyle, children: "Open Faults" }), _jsx("div", { style: kpiHintStyle, children: "Active issues needing attention" })] }), _jsxs("button", { type: "button", onClick: () => navigate(`/site/${siteFileId}/assets`), style: { ...kpiCardStyle, ...kpiNeutralStyle }, children: [_jsx("div", { style: kpiIconStyle, children: "\uD83D\uDCCB" }), _jsx("div", { style: kpiValueStyle, children: assetsCount }), _jsx("div", { style: kpiLabelStyle, children: "Assets" }), _jsx("div", { style: kpiHintStyle, children: "Open the asset register" })] }), _jsxs("button", { type: "button", onClick: () => navigate(`/site/${siteFileId}/service`), style: { ...kpiCardStyle, ...kpiPrimaryStyle }, children: [_jsx("div", { style: kpiIconStyle, children: "\uD83D\uDEE0\uFE0F" }), _jsx("div", { style: kpiValueStyle, children: visitsCount }), _jsx("div", { style: kpiLabelStyle, children: "Service" }), _jsx("div", { style: kpiHintStyle, children: "Execute and track device testing" })] }), _jsxs("button", { type: "button", onClick: () => navigate(`/site/${siteFileId}/parts`), style: { ...kpiCardStyle, ...kpiPartsStyle }, children: [_jsx("div", { style: kpiIconStyle, children: "\uD83D\uDD29" }), _jsx("div", { style: kpiValueStyle, children: installedPartsCount }), _jsx("div", { style: kpiLabelStyle, children: "Parts" }), _jsx("div", { style: kpiHintStyle, children: "Installed parts and activity" })] }), _jsxs("button", { type: "button", onClick: () => navigate(`/site/${siteFileId}/reports`), style: { ...kpiCardStyle, ...kpiSuccessStyle }, children: [_jsx("div", { style: kpiIconStyle, children: "\uD83D\uDCC4" }), _jsx("div", { style: kpiValueStyle, children: reportsCount }), _jsx("div", { style: kpiLabelStyle, children: "Reports" }), _jsx("div", { style: kpiHintStyle, children: "Print, review and export" })] })] }), _jsxs("div", { style: twoCardGridStyle, children: [_jsxs(Card, { children: [_jsx(CardTitle, { children: "Recent Visit" }), recentVisit ? (_jsxs("div", { style: summaryCardStyle, children: [_jsx("div", { style: summaryCardTitleStyle, children: recentVisit.visitType }), _jsx("div", { style: summaryCardMetaStyle, children: recentVisit.engineerName || "No engineer" }), _jsx("div", { style: summaryCardMetaStyle, children: (recentVisit.completedAt ?? recentVisit.startedAt)
                                                ? formatIrishDate(recentVisit.completedAt ?? recentVisit.startedAt)
                                                : "—" }), _jsx("div", { style: summaryCardMetaStyle, children: recentVisit.serviceColumnKey
                                                ? recentVisit.serviceColumnKey.toUpperCase()
                                                : "No service column" }), _jsx("div", { style: { marginTop: "12px" }, children: _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFileId}/visit/${recentVisit.id}`, {
                                                    state: { visit: recentVisit },
                                                }), children: "Open Visit" }) })] })) : (_jsx("p", { style: emptyTextStyle, children: "No visits recorded yet." }))] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Quick Actions" }), _jsxs("div", { style: quickActionGridStyle, children: [_jsx(QuickActionButton, { label: "Edit Site", icon: "\u270F\uFE0F", onClick: () => navigate(`/site/${siteFileId}/edit`) }), _jsx(QuickActionButton, { label: "Site Notes", icon: "\uD83D\uDCDD", onClick: () => navigate(`/site/${siteFileId}/site-notes`) }), _jsx(QuickActionButton, { label: "Assets", icon: "\uD83D\uDCCB", onClick: () => navigate(`/site/${siteFileId}/assets`) }), _jsx(QuickActionButton, { label: "Parts", icon: "\uD83D\uDD29", onClick: () => navigate(`/site/${siteFileId}/parts`) }), _jsx(QuickActionButton, { label: "Faults", icon: "\uD83D\uDEA8", onClick: () => navigate(`/site/${siteFileId}/faults/open`) }), _jsx(QuickActionButton, { label: "Closed", icon: "\u2705", onClick: () => navigate(`/site/${siteFileId}/faults/closed`) }), _jsx(QuickActionButton, { label: "Reports", icon: "\uD83D\uDDA8\uFE0F", onClick: () => navigate(`/site/${siteFileId}/reports`) })] })] })] }), showEndJobModal && activeVisit ? (_jsx("div", { style: modalOverlayStyle, children: _jsxs("div", { style: modalCardStyle, children: [_jsx("div", { style: modalKickerStyle, children: "END LIVE JOB" }), _jsx("div", { style: modalTitleStyle, children: "Confirm job completion" }), _jsx("div", { style: modalTextStyle, children: "This will mark the current live visit as completed." }), _jsxs("div", { style: modalInfoGridStyle, children: [_jsxs("div", { style: modalInfoItemStyle, children: [_jsx("div", { style: modalInfoLabelStyle, children: "Visit" }), _jsx("div", { style: modalInfoValueStyle, children: activeVisit.visitType })] }), _jsxs("div", { style: modalInfoItemStyle, children: [_jsx("div", { style: modalInfoLabelStyle, children: "Service" }), _jsx("div", { style: modalInfoValueStyle, children: activeVisit.serviceColumnKey?.toUpperCase() ?? "—" })] }), _jsxs("div", { style: modalInfoItemStyle, children: [_jsx("div", { style: modalInfoLabelStyle, children: "Engineer" }), _jsx("div", { style: modalInfoValueStyle, children: activeVisit.engineerName || "—" })] }), _jsxs("div", { style: modalInfoItemStyle, children: [_jsx("div", { style: modalInfoLabelStyle, children: "Elapsed" }), _jsx("div", { style: modalInfoValueStyle, children: elapsed })] }), _jsxs("div", { style: { ...modalInfoItemStyle, gridColumn: "1 / -1" }, children: [_jsx("div", { style: modalInfoLabelStyle, children: "Started" }), _jsx("div", { style: modalInfoValueStyle, children: activeVisit.startedAt
                                                    ? formatIrishDateTime(activeVisit.startedAt)
                                                    : "—" })] })] }), _jsxs("div", { style: modalActionRowStyle, children: [_jsx(SecondaryButton, { onClick: () => setShowEndJobModal(false), style: modalButtonStyle, children: "Cancel" }), _jsx(PrimaryButton, { onClick: handleConfirmEndJob, disabled: startingVisit, style: modalButtonStyle, children: startingVisit ? "Ending..." : "End Job" })] })] }) })) : null] }) }));
}
function SegmentButton({ active, onClick, children, }) {
    return (_jsx("button", { type: "button", onClick: onClick, style: active ? segmentButtonActiveStyle : segmentButtonStyle, children: children }));
}
function QuickActionButton({ label, icon, onClick, }) {
    return (_jsxs("button", { type: "button", onClick: onClick, style: quickActionButtonStyle, children: [_jsx("span", { style: quickActionIconStyle, children: icon }), _jsx("span", { children: label })] }));
}
const pageGridStyle = {
    display: "grid",
    gap: "14px",
};
const heroShellStyle = {
    position: "relative",
    borderRadius: "22px",
    overflow: "hidden",
    background: "linear-gradient(135deg, #0f172a 0%, #172554 55%, #1e3a8a 100%)",
    boxShadow: "0 20px 36px rgba(15,23,42,0.18)",
};
const heroGlowStyle = {
    position: "absolute",
    inset: 0,
    background: "radial-gradient(circle at top right, rgba(96,165,250,0.28) 0%, rgba(96,165,250,0) 34%)",
    pointerEvents: "none",
};
const heroContentStyle = {
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: "12px",
    padding: "18px",
};
const heroEyebrowStyle = {
    fontSize: "0.72rem",
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "#60a5fa",
    marginBottom: "6px",
};
const heroTitleStyle = {
    margin: "0 0 6px 0",
    fontSize: "1.7rem",
    lineHeight: 1.05,
    fontWeight: 800,
    color: "#f8fafc",
};
const heroSubStyle = {
    color: "#cbd5e1",
    fontSize: "0.95rem",
    lineHeight: 1.45,
    maxWidth: "700px",
};
const heroMetaWrapStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "12px",
};
const heroMetaPillStyle = {
    display: "inline-flex",
    width: "fit-content",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.08)",
    color: "#e2e8f0",
    fontSize: "0.82rem",
    fontWeight: 700,
    border: "1px solid rgba(148,163,184,0.16)",
};
const heroRightStackStyle = {
    display: "grid",
    gap: "10px",
    justifyItems: "end",
    minWidth: "170px",
};
const onlineChipStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 14px",
    borderRadius: "999px",
    background: "rgba(34,197,94,0.12)",
    border: "1px solid rgba(34,197,94,0.22)",
    color: "#dcfce7",
    fontWeight: 800,
};
const offlineChipStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 14px",
    borderRadius: "999px",
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.22)",
    color: "#fee2e2",
    fontWeight: 800,
};
const onlineDotStyle = {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    background: "#22c55e",
    boxShadow: "0 0 0 4px rgba(34,197,94,0.18)",
};
const offlineDotStyle = {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    background: "#ef4444",
    boxShadow: "0 0 0 4px rgba(239,68,68,0.18)",
};
const activeMiniPanelStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(148,163,184,0.16)",
    textAlign: "right",
};
const idleMiniPanelStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(148,163,184,0.12)",
    textAlign: "right",
};
const activeMiniLabelStyle = {
    fontSize: "0.76rem",
    fontWeight: 800,
    color: "#93c5fd",
    marginBottom: "4px",
};
const activeMiniValueStyle = {
    fontSize: "1rem",
    fontWeight: 800,
    color: "#f8fafc",
};
const idleMiniValueStyle = {
    fontSize: "1rem",
    fontWeight: 800,
    color: "#cbd5e1",
};
const liveJobPanelStyle = {
    display: "grid",
    gap: "14px",
    padding: "16px",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #166534 0%, #15803d 100%)",
    color: "#f0fdf4",
    boxShadow: "0 16px 26px rgba(22,101,52,0.18)",
};
const liveJobKickerStyle = {
    fontSize: "0.76rem",
    fontWeight: 800,
    letterSpacing: "0.1em",
    color: "#bbf7d0",
    marginBottom: "6px",
};
const liveJobTitleStyle = {
    fontSize: "1.3rem",
    fontWeight: 800,
    lineHeight: 1.1,
};
const liveJobMetaStyle = {
    marginTop: "6px",
    color: "#dcfce7",
    lineHeight: 1.45,
    fontSize: "0.95rem",
};
const liveJobActionsStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const liveActionButtonStyle = {
    minHeight: "54px",
};
const startVisitGridStyle = {
    display: "grid",
    gap: "14px",
};
const visitStateBannerStyle = (_activeVisit) => ({
    padding: "14px",
    borderRadius: "18px",
    background: "linear-gradient(180deg, #fef2f2 0%, #fee2e2 100%)",
    border: "1px solid #fca5a5",
});
const visitStateTitleStyle = {
    fontWeight: 800,
    fontSize: "1rem",
    color: "#111827",
};
const visitStateSubStyle = {
    marginTop: "4px",
    color: "#475569",
    lineHeight: 1.45,
};
const fieldBlockStyle = {
    display: "grid",
    gap: "10px",
};
const fieldLabelStyle = {
    fontSize: "0.86rem",
    fontWeight: 800,
    color: "#475569",
    letterSpacing: "0.03em",
    textTransform: "uppercase",
};
const segmentedWrapStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
};
const segmentButtonStyle = {
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    borderRadius: "999px",
    padding: "10px 14px",
    fontSize: "0.88rem",
    fontWeight: 700,
    cursor: "pointer",
};
const segmentButtonActiveStyle = {
    ...segmentButtonStyle,
    background: "#0f172a",
    color: "#ffffff",
    border: "1px solid #0f172a",
    boxShadow: "0 8px 18px rgba(15,23,42,0.12)",
};
const serviceColumnGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
};
const serviceColumnCardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "14px",
    textAlign: "left",
    background: "#ffffff",
    cursor: "pointer",
};
const serviceColumnCardActiveStyle = {
    ...serviceColumnCardStyle,
    border: "1px solid #16a34a",
    background: "#f0fdf4",
    boxShadow: "0 10px 18px rgba(22,163,74,0.12)",
};
const serviceColumnTitleStyle = {
    fontWeight: 800,
    color: "#111827",
};
const serviceColumnMetaStyle = {
    marginTop: "4px",
    fontSize: "0.9rem",
    color: "#6b7280",
};
const infoPanelStyle = {
    padding: "14px",
    borderRadius: "16px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    color: "#475569",
    lineHeight: 1.45,
};
const startVisitActionRowStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const startVisitButtonStyle = {
    minHeight: "56px",
    fontSize: "1rem",
    fontWeight: 800,
};
const messageListStyle = {
    display: "grid",
    gap: "6px",
    color: "#92400e",
    fontWeight: 700,
};
const kpiGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
};
const kpiCardStyle = {
    border: "none",
    borderRadius: "20px",
    padding: "16px 14px",
    minHeight: "122px",
    display: "grid",
    alignContent: "start",
    gap: "6px",
    textAlign: "left",
    cursor: "pointer",
    boxShadow: "0 14px 28px rgba(15,23,42,0.10)",
};
const kpiDangerStyle = {
    background: "linear-gradient(180deg, #fff5f5 0%, #fee2e2 100%)",
    color: "#7f1d1d",
};
const kpiPrimaryStyle = {
    background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
    color: "#1d4ed8",
};
const kpiSuccessStyle = {
    background: "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)",
    color: "#166534",
};
const kpiNeutralStyle = {
    background: "linear-gradient(180deg, #f8fafc 0%, #e5e7eb 100%)",
    color: "#111827",
};
const kpiPartsStyle = {
    background: "linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)",
    color: "#9a3412",
};
const kpiIconStyle = {
    fontSize: "1.2rem",
    lineHeight: 1,
};
const kpiValueStyle = {
    fontSize: "1.8rem",
    fontWeight: 800,
    lineHeight: 1,
};
const kpiLabelStyle = {
    fontSize: "0.98rem",
    fontWeight: 700,
};
const kpiHintStyle = {
    fontSize: "0.82rem",
    opacity: 0.86,
};
const twoCardGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
};
const summaryCardStyle = {
    padding: "14px",
    borderRadius: "18px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
};
const summaryCardTitleStyle = {
    fontWeight: 800,
    color: "#111827",
    marginBottom: "6px",
};
const summaryCardMetaStyle = {
    color: "#6b7280",
    fontSize: "0.92rem",
    marginTop: "2px",
};
const quickActionGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
};
const quickActionButtonStyle = {
    minHeight: "70px",
    borderRadius: "16px",
    border: "1px solid #e5e7eb",
    background: "#fff",
    padding: "12px",
    display: "grid",
    gap: "6px",
    justifyItems: "start",
    alignContent: "center",
    textAlign: "left",
    fontWeight: 700,
    color: "#111827",
    cursor: "pointer",
};
const quickActionIconStyle = {
    fontSize: "1rem",
};
const emptyTextStyle = {
    margin: 0,
    color: "#6b7280",
};
const modalOverlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,23,0.66)",
    backdropFilter: "blur(6px)",
    zIndex: 80,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
};
const modalCardStyle = {
    width: "100%",
    maxWidth: "560px",
    borderRadius: "24px",
    background: "#ffffff",
    padding: "20px",
    boxShadow: "0 28px 60px rgba(2,6,23,0.32)",
    display: "grid",
    gap: "14px",
};
const modalKickerStyle = {
    fontSize: "0.74rem",
    fontWeight: 800,
    letterSpacing: "0.1em",
    color: "#b91c1c",
};
const modalTitleStyle = {
    fontSize: "1.5rem",
    fontWeight: 800,
    color: "#111827",
    lineHeight: 1.1,
};
const modalTextStyle = {
    color: "#475569",
    lineHeight: 1.5,
};
const modalInfoGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const modalInfoItemStyle = {
    borderRadius: "16px",
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    padding: "12px",
};
const modalInfoLabelStyle = {
    fontSize: "0.74rem",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#64748b",
    marginBottom: "6px",
};
const modalInfoValueStyle = {
    fontSize: "0.98rem",
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.35,
};
const modalActionRowStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginTop: "4px",
};
const modalButtonStyle = {
    minHeight: "54px",
};
