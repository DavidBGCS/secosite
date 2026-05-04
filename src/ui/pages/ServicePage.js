import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { filterAssets, getAutomaticDetectorProgress, getAvailableAssetCategories, getColumnSummary, } from "../../core";
import { lockAssetServiceTick, tickAssetForService, unlockAssetServiceTick, untickAssetForService, } from "../../core/assets/serviceTicks";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { cleanFirestoreData } from "../../utils/cleanFirestoreData";
import { AppLayout } from "../layouts/AppLayout";
import { Card, CardTitle, Field, PrimaryButton, SecondaryButton, inputStyle, textareaStyle, } from "../components/ui";
import { formatIrishDate, formatIrishDateTime } from "../utils/dateTime";
const CATEGORY_LABELS = {
    all: "All",
    detector: "Detectors",
    "optical-detector": "Optical",
    "heat-detector": "Heat",
    multisensor: "Multisensor",
    beam: "Beam",
    aspirating: "Aspirating",
    mcp: "MCPs",
    sounder: "Sounders",
    "sounder-beacon": "Snd/Beacon",
    interface: "Interfaces",
    io: "I/O",
    atex: "ATEX",
    void: "Voids",
    attic: "Attics",
    panel: "Panels",
    repeater: "Repeaters",
    psu: "PSU",
    other: "Other",
};
function nowIso() {
    return new Date().toISOString();
}
function sortAssets(assets) {
    return [...assets].sort((a, b) => {
        const refA = a.reference?.toLowerCase() ?? "";
        const refB = b.reference?.toLowerCase() ?? "";
        return refA.localeCompare(refB);
    });
}
function getLatestVisit(siteFile) {
    return [...siteFile.visits].sort((a, b) => (b.completedAt ?? b.startedAt ?? "").localeCompare(a.completedAt ?? a.startedAt ?? ""))[0];
}
function getActiveVisit(siteFile) {
    return [...siteFile.visits]
        .filter((visit) => visit.status === "draft" || visit.status === "in-progress")
        .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))[0];
}
export function ServicePage() {
    const navigate = useNavigate();
    const { siteFile, updateSite, loading, error } = useFirestoreSite();
    const [search, setSearch] = useState("");
    const [selectedColumnKey, setSelectedColumnKey] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [showFilters, setShowFilters] = useState(false);
    const [noteDrafts, setNoteDrafts] = useState({});
    const [expandedNotes, setExpandedNotes] = useState({});
    const [messages, setMessages] = useState([]);
    const [saving, setSaving] = useState(false);
    const latestVisit = useMemo(() => {
        if (!siteFile)
            return undefined;
        return getLatestVisit(siteFile);
    }, [siteFile]);
    const activeVisit = useMemo(() => {
        if (!siteFile)
            return undefined;
        return getActiveVisit(siteFile);
    }, [siteFile]);
    const hasActiveVisit = !!activeVisit;
    const activeColumnKey = selectedColumnKey ||
        activeVisit?.serviceColumnKey ||
        siteFile?.serviceLayout.columns[0]?.key ||
        "";
    useEffect(() => {
        if (activeVisit?.serviceColumnKey) {
            setSelectedColumnKey(activeVisit.serviceColumnKey);
        }
    }, [activeVisit?.serviceColumnKey]);
    const activeColumn = useMemo(() => {
        if (!siteFile || !activeColumnKey)
            return undefined;
        return siteFile.serviceLayout.columns.find((column) => column.key === activeColumnKey);
    }, [siteFile, activeColumnKey]);
    const availableCategories = useMemo(() => {
        if (!siteFile)
            return [];
        return getAvailableAssetCategories(siteFile);
    }, [siteFile]);
    const filteredAssets = useMemo(() => {
        if (!siteFile)
            return [];
        return sortAssets(filterAssets(siteFile.assets, {
            category: selectedCategory === "all" ? undefined : selectedCategory,
            search,
            activeOnly: true,
            serviceTrackableOnly: true,
        }));
    }, [siteFile, selectedCategory, search]);
    const progress = useMemo(() => {
        if (!siteFile || !activeColumnKey)
            return undefined;
        return getAutomaticDetectorProgress(siteFile, activeColumnKey, {
            activeOnly: true,
            serviceTrackableOnly: true,
        }, 25);
    }, [siteFile, activeColumnKey]);
    const columnSummary = useMemo(() => {
        if (!siteFile || !activeColumnKey)
            return undefined;
        return getColumnSummary(siteFile, activeColumnKey, {
            activeOnly: true,
            serviceTrackableOnly: true,
        });
    }, [siteFile, activeColumnKey]);
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
    const getTickForAsset = (asset) => asset.serviceTicks?.find((tick) => tick.columnKey === activeColumnKey);
    const handleToggleTested = async (assetId) => {
        if (!siteFile || !activeColumnKey || !activeVisit)
            return;
        try {
            const next = JSON.parse(JSON.stringify(siteFile));
            const asset = next.assets.find((item) => item.id === assetId);
            if (!asset)
                return;
            const tick = asset.serviceTicks?.find((item) => item.columnKey === activeColumnKey);
            const isTicked = tick?.ticked ?? false;
            if (isTicked) {
                untickAssetForService(next, assetId, activeColumnKey);
            }
            else {
                tickAssetForService(next, assetId, activeColumnKey, {
                    testedAt: nowIso(),
                    visitId: activeVisit.id,
                    jobRef: activeVisit.id,
                    testedBy: activeVisit.engineerName || undefined,
                });
            }
            await persistSiteFile(next);
            setMessages([isTicked ? "Device marked not tested." : "Device marked tested."]);
        }
        catch (saveError) {
            setMessages([
                saveError instanceof Error ? saveError.message : "Failed to update service entry.",
            ]);
        }
    };
    const handleToggleLock = async (assetId) => {
        if (!siteFile || !activeColumnKey || !activeVisit)
            return;
        try {
            const next = JSON.parse(JSON.stringify(siteFile));
            const asset = next.assets.find((item) => item.id === assetId);
            if (!asset)
                return;
            const tick = asset.serviceTicks?.find((item) => item.columnKey === activeColumnKey);
            const isLocked = tick?.locked ?? false;
            if (isLocked) {
                unlockAssetServiceTick(next, assetId, activeColumnKey);
            }
            else {
                lockAssetServiceTick(next, assetId, activeColumnKey);
            }
            await persistSiteFile(next);
            setMessages([isLocked ? "Entry unlocked." : "Entry locked."]);
        }
        catch (saveError) {
            setMessages([
                saveError instanceof Error ? saveError.message : "Failed to update lock state.",
            ]);
        }
    };
    const handleSaveNote = async (assetId) => {
        if (!siteFile || !activeColumnKey || !activeVisit)
            return;
        try {
            const noteValue = (noteDrafts[assetId] ?? "").trim();
            const next = JSON.parse(JSON.stringify(siteFile));
            const asset = next.assets.find((item) => item.id === assetId);
            if (!asset)
                return;
            let tick = asset.serviceTicks?.find((item) => item.columnKey === activeColumnKey);
            if (!tick) {
                tickAssetForService(next, assetId, activeColumnKey, {
                    visitId: activeVisit.id,
                    jobRef: activeVisit.id,
                    testedBy: activeVisit.engineerName ?? undefined,
                });
                tick = asset.serviceTicks?.find((item) => item.columnKey === activeColumnKey);
                if (tick) {
                    tick.ticked = false;
                    tick.testedAt = undefined;
                }
            }
            if (!tick) {
                throw new Error("Could not create service entry for note.");
            }
            if (tick.locked) {
                throw new Error("This service entry is locked and the note cannot be changed.");
            }
            tick.note = noteValue || undefined;
            tick.visitId = activeVisit.id;
            tick.jobRef = activeVisit.id;
            tick.testedBy = activeVisit.engineerName ?? tick.testedBy;
            asset.updatedAt = nowIso();
            next.metadata.updatedAt = nowIso();
            await persistSiteFile(next);
            setMessages([noteValue ? "Device note saved." : "Device note cleared."]);
        }
        catch (saveError) {
            setMessages([
                saveError instanceof Error ? saveError.message : "Failed to save note.",
            ]);
        }
    };
    const toggleNoteExpanded = (assetId) => {
        setExpandedNotes((prev) => ({
            ...prev,
            [assetId]: !prev[assetId],
        }));
    };
    if (loading) {
        return (_jsx(AppLayout, { title: "Loading service", children: _jsx(Card, { children: "Loading service page..." }) }));
    }
    if (error) {
        return (_jsx(AppLayout, { title: "Service error", children: _jsx(Card, { children: error }) }));
    }
    if (!siteFile) {
        return (_jsx(AppLayout, { title: "Service not found", children: _jsxs(Card, { children: [_jsx("p", { style: { marginTop: 0 }, children: "The requested site could not be found." }), _jsx(SecondaryButton, { onClick: () => navigate("/"), children: "Back to Sites" })] }) }));
    }
    return (_jsx(AppLayout, { title: "Service", subtitle: `${siteFile.site.name} • ${siteFile.site.siteCode ?? siteFile.site.id}`, sessionStatus: {
            isVisitActive: hasActiveVisit,
            visitLabel: activeVisit?.visitType ?? latestVisit?.visitType,
            engineerName: activeVisit?.engineerName ?? latestVisit?.engineerName,
            startedAt: activeVisit?.startedAt,
            serviceColumnLabel: activeVisit?.serviceColumnKey?.toUpperCase() ?? activeColumnKey?.toUpperCase(),
        }, children: _jsxs("div", { style: pageGridStyle, children: [progress ? (_jsx("div", { style: stickyProgressWrapStyle, children: _jsxs("div", { style: stickyProgressShellStyle, children: [_jsxs("div", { style: stickyProgressTopStyle, children: [_jsxs("div", { children: [_jsx("div", { style: stickyEyebrowStyle, children: "ACTIVE SERVICE" }), _jsx("div", { style: stickyTitleStyle, children: activeColumn?.label ??
                                                    (activeColumnKey ? activeColumnKey.toUpperCase() : "No Column") }), _jsxs("div", { style: stickyMetaStyle, children: [activeColumn?.serviceDate
                                                        ? formatIrishDate(activeColumn.serviceDate)
                                                        : "No service date", activeVisit ? ` • ${activeVisit.engineerName || "No engineer"}` : ""] })] }), _jsxs("div", { style: stickyRightStyle, children: [_jsxs("div", { style: stickyPercentStyle, children: [progress.percentage, "%"] }), _jsxs("div", { style: stickyCountStyle, children: [progress.testedCount, " / ", progress.eligibleTotal] })] })] }), _jsx("div", { style: stickyTrackStyle, children: _jsx("div", { style: {
                                        ...stickyBarStyle,
                                        width: `${Math.min(progress.percentage, 100)}%`,
                                        background: progress.thresholdMet ? "#16a34a" : "#f59e0b",
                                    } }) }), _jsxs("div", { style: stickyFooterStyle, children: [progress.thresholdMet
                                        ? "25% requirement met"
                                        : `${progress.remainingToThreshold} more needed`, columnSummary
                                        ? ` • ${columnSummary.testedAssets}/${columnSummary.totalTrackableAssets} trackable assets`
                                        : ""] })] }) })) : null, !hasActiveVisit ? (_jsxs(Card, { children: [_jsx(CardTitle, { children: "No Active Visit" }), _jsxs("div", { style: blockedPanelStyle, children: [_jsx("div", { style: blockedTitleStyle, children: "Service is in review-only mode." }), _jsx("div", { style: blockedTextStyle, children: "You can review device history and status here, but you cannot test devices, save notes, or lock entries until a visit is started from Overview." }), _jsxs("div", { style: blockedActionGridStyle, children: [_jsx(PrimaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/overview`), children: "Start Visit from Overview" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/assets`), children: "View Asset Register" })] })] })] })) : (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Active Visit Session" }), _jsxs("div", { style: activeVisitPanelStyle, children: [_jsxs("div", { children: [_jsxs("div", { style: activeVisitTitleStyle, children: [activeVisit.visitType, " \u2022 ", activeVisit.status] }), _jsxs("div", { style: activeVisitMetaStyle, children: [activeVisit.engineerName || "No engineer", " \u2022", " ", activeVisit.startedAt ? formatIrishDateTime(activeVisit.startedAt) : "—", activeVisit.serviceColumnKey
                                                    ? ` • ${activeVisit.serviceColumnKey.toUpperCase()}`
                                                    : ""] })] }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/visit/${activeVisit.id}`, {
                                        state: { visit: activeVisit },
                                    }), children: "Open Visit" })] })] })), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Controls" }), _jsxs("div", { style: { display: "grid", gap: "12px" }, children: [_jsx(Field, { label: "Active Service Column", children: _jsx("select", { value: activeColumnKey, onChange: (e) => setSelectedColumnKey(e.target.value), style: inputStyle, children: siteFile.serviceLayout.columns.map((column) => (_jsxs("option", { value: column.key, children: [column.label, column.serviceDate ? ` • ${formatIrishDate(column.serviceDate)}` : ""] }, column.key))) }) }), _jsx(Field, { label: "Search Devices", children: _jsx("input", { type: "text", placeholder: "Ref, type, loop, address, zone, location...", value: search, onChange: (e) => setSearch(e.target.value), style: inputStyle }) }), _jsxs("div", { style: controlsActionRowStyle, children: [_jsx(SecondaryButton, { onClick: () => setShowFilters((v) => !v), children: showFilters ? "Hide Filters" : "Show Filters" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/overview`), children: "Back to Overview" })] }), showFilters ? (_jsxs("div", { style: filterPanelStyle, children: [_jsx("div", { style: filterPanelTitleStyle, children: "Categories" }), _jsxs("div", { style: chipWrapStyle, children: [_jsx(Chip, { label: "All", active: selectedCategory === "all", onClick: () => setSelectedCategory("all") }), availableCategories.map((category) => (_jsx(Chip, { label: CATEGORY_LABELS[category] ?? category, active: selectedCategory === category, onClick: () => setSelectedCategory(category) }, category)))] })] })) : null, saving ? _jsx("div", { style: savingTextStyle, children: "Saving\u2026" }) : null] })] }), messages.length > 0 ? (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Messages" }), _jsx("div", { style: messageListStyle, children: messages.map((message, index) => (_jsx("div", { children: message }, `${message}-${index}`))) })] })) : null, _jsxs(Card, { children: [_jsx(CardTitle, { children: "Devices for Service" }), filteredAssets.length === 0 ? (_jsx("p", { style: emptyTextStyle, children: "No devices match the current filters." })) : (_jsx("div", { style: deviceGridStyle, children: filteredAssets.map((asset) => {
                                const tick = getTickForAsset(asset);
                                const noteValue = noteDrafts[asset.id] ?? tick?.note ?? "";
                                const noteExpanded = !!expandedNotes[asset.id];
                                return (_jsxs("div", { style: deviceCardStyle, children: [_jsxs("div", { style: deviceCompactTopStyle, children: [_jsxs("div", { style: { minWidth: 0 }, children: [_jsx("div", { style: deviceRefStyle, children: asset.reference }), _jsx("div", { style: deviceTypeStyle, children: asset.assetType }), _jsxs("div", { style: deviceCompactMetaStyle, children: ["Loop ", asset.loop ?? "—", " \u2022 Addr ", asset.address ?? "—", " \u2022 Zone", " ", asset.zone ?? "—"] }), _jsx("div", { style: deviceCompactMetaStyle, children: asset.locationText ?? "No location" })] }), _jsxs("div", { style: statusPillWrapStyle, children: [_jsx("span", { style: {
                                                                ...statusPillStyle,
                                                                background: tick?.ticked ? "#dcfce7" : "#f3f4f6",
                                                                color: tick?.ticked ? "#166534" : "#374151",
                                                            }, children: tick?.ticked ? "Tested" : "Not tested" }), _jsx("span", { style: {
                                                                ...statusPillStyle,
                                                                background: tick?.locked ? "#e0e7ff" : "#fef3c7",
                                                                color: tick?.locked ? "#3730a3" : "#92400e",
                                                            }, children: tick?.locked ? "Locked" : "Unlocked" })] })] }), _jsxs("div", { style: miniInfoRowStyle, children: [_jsx("div", { style: miniInfoPillStyle, children: _jsx("strong", { children: activeColumn?.label ?? activeColumnKey.toUpperCase() }) }), _jsx("div", { style: miniInfoPillStyle, children: tick?.testedAt ? formatIrishDateTime(tick.testedAt) : "No test time" }), tick?.note ? _jsx("div", { style: miniInfoPillStyle, children: "Note saved" }) : null] }), _jsxs("div", { style: deviceActionGridStyle, children: [_jsx(PrimaryButton, { onClick: () => handleToggleTested(asset.id), disabled: saving || !activeColumnKey || !hasActiveVisit, style: compactButtonStyle, children: tick?.ticked ? "Untest" : "Test" }), _jsx(SecondaryButton, { onClick: () => toggleNoteExpanded(asset.id), disabled: saving, style: compactButtonStyle, children: noteExpanded ? "Hide Note" : tick?.note ? "Edit Note" : "Add Note" }), _jsx(SecondaryButton, { onClick: () => handleToggleLock(asset.id), disabled: saving || !activeColumnKey || !hasActiveVisit, style: {
                                                        ...compactButtonStyle,
                                                        ...(tick?.locked ? unlockButtonStyle : {}),
                                                    }, children: tick?.locked ? "Unlock" : "Lock" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/assets/${asset.id}/history`), disabled: saving, style: compactButtonStyle, children: "History" })] }), noteExpanded ? (_jsxs("div", { style: expandedNoteWrapStyle, children: [_jsx(Field, { label: "Engineer Note", children: _jsx("textarea", { rows: 3, value: noteValue, onChange: (e) => setNoteDrafts((prev) => ({
                                                            ...prev,
                                                            [asset.id]: e.target.value,
                                                        })), style: textareaStyle, placeholder: "Detector now inaccessible / recommend replacement / void not accessed / access restricted...", disabled: tick?.locked || !hasActiveVisit }) }), _jsxs("div", { style: expandedNoteActionsStyle, children: [_jsx(SecondaryButton, { onClick: () => handleSaveNote(asset.id), disabled: saving || !activeColumnKey || !hasActiveVisit, children: "Save Note" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/assets`), disabled: saving, children: "Asset Register" })] }), !hasActiveVisit ? (_jsx("div", { style: reviewOnlyHintStyle, children: "Review only \u2014 start a visit from Overview to save changes." })) : null] })) : null] }, asset.id));
                            }) }))] })] }) }));
}
function Chip({ label, active, onClick, }) {
    return (_jsx("button", { type: "button", onClick: onClick, style: active ? chipActiveStyle : chipStyle, children: label }));
}
const pageGridStyle = {
    display: "grid",
    gap: "14px",
};
const stickyProgressWrapStyle = {
    position: "sticky",
    top: "86px",
    zIndex: 18,
};
const stickyProgressShellStyle = {
    borderRadius: "20px",
    padding: "14px",
    background: "linear-gradient(135deg, #0f172a 0%, #172554 55%, #1e3a8a 100%)",
    color: "#f8fafc",
    boxShadow: "0 18px 28px rgba(15,23,42,0.18)",
};
const stickyProgressTopStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "start",
};
const stickyEyebrowStyle = {
    fontSize: "0.72rem",
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "#93c5fd",
    marginBottom: "4px",
};
const stickyTitleStyle = {
    fontSize: "1.06rem",
    fontWeight: 800,
    color: "#ffffff",
};
const stickyMetaStyle = {
    marginTop: "4px",
    fontSize: "0.88rem",
    color: "#cbd5e1",
};
const stickyRightStyle = {
    textAlign: "right",
};
const stickyPercentStyle = {
    fontSize: "1.35rem",
    fontWeight: 800,
    lineHeight: 1,
};
const stickyCountStyle = {
    marginTop: "6px",
    fontSize: "0.86rem",
    color: "#cbd5e1",
};
const stickyTrackStyle = {
    height: "12px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    marginTop: "12px",
};
const stickyBarStyle = {
    height: "100%",
    borderRadius: "999px",
};
const stickyFooterStyle = {
    marginTop: "10px",
    fontSize: "0.86rem",
    color: "#dbeafe",
    fontWeight: 700,
};
const blockedPanelStyle = {
    borderRadius: "18px",
    padding: "16px",
    background: "linear-gradient(180deg, #fef2f2 0%, #fee2e2 100%)",
    border: "1px solid #fecaca",
};
const blockedTitleStyle = {
    fontSize: "1rem",
    fontWeight: 800,
    color: "#7f1d1d",
};
const blockedTextStyle = {
    marginTop: "6px",
    color: "#7c2d12",
    lineHeight: 1.5,
};
const blockedActionGridStyle = {
    marginTop: "12px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const activeVisitPanelStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "14px",
    borderRadius: "18px",
    background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
    border: "1px solid #bfdbfe",
};
const activeVisitTitleStyle = {
    fontWeight: 800,
    color: "#1d4ed8",
};
const activeVisitMetaStyle = {
    marginTop: "4px",
    color: "#475569",
    fontSize: "0.9rem",
};
const controlsActionRowStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const filterPanelStyle = {
    borderRadius: "16px",
    padding: "14px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
};
const filterPanelTitleStyle = {
    fontWeight: 800,
    color: "#111827",
    marginBottom: "10px",
};
const savingTextStyle = {
    color: "#6b7280",
    fontWeight: 700,
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
const messageListStyle = {
    display: "grid",
    gap: "6px",
    color: "#92400e",
    fontWeight: 700,
};
const deviceGridStyle = {
    display: "grid",
    gap: "10px",
};
const deviceCardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "12px",
    background: "#f8fafc",
    display: "grid",
    gap: "10px",
};
const deviceCompactTopStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: "10px",
};
const deviceRefStyle = {
    fontSize: "1rem",
    fontWeight: 800,
    color: "#111827",
    lineHeight: 1.1,
};
const deviceTypeStyle = {
    marginTop: "4px",
    color: "#374151",
    fontWeight: 700,
    lineHeight: 1.2,
};
const deviceCompactMetaStyle = {
    marginTop: "4px",
    color: "#6b7280",
    fontSize: "0.86rem",
    lineHeight: 1.35,
};
const statusPillWrapStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    alignItems: "end",
    flexShrink: 0,
};
const statusPillStyle = {
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "0.74rem",
    fontWeight: 800,
    whiteSpace: "nowrap",
};
const miniInfoRowStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
};
const miniInfoPillStyle = {
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    color: "#475569",
    fontSize: "0.8rem",
};
const deviceActionGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr",
    gap: "8px",
};
const compactButtonStyle = {
    minHeight: "46px",
    fontSize: "0.88rem",
    padding: "10px 8px",
};
const unlockButtonStyle = {
    border: "1px solid #4f46e5",
    color: "#3730a3",
};
const expandedNoteWrapStyle = {
    borderTop: "1px solid #e5e7eb",
    paddingTop: "10px",
    display: "grid",
    gap: "10px",
};
const expandedNoteActionsStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const reviewOnlyHintStyle = {
    fontSize: "0.86rem",
    color: "#92400e",
    fontWeight: 700,
};
const emptyTextStyle = {
    margin: 0,
    color: "#6b7280",
};
