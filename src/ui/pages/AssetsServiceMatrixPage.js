import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/ui/pages/AssetsServiceMatrixPage.tsx
import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { filterAssets, getAutomaticDetectorProgress, getAvailableAssetCategories, getAvailableAssetTags, getColumnSummary, importAssetRows, parseBulkAddText, parseCsvText, parsePastedTable, } from "../../core";
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
function sortAssets(assets) {
    return [...assets].sort((a, b) => {
        const refA = a.reference?.toLowerCase() ?? "";
        const refB = b.reference?.toLowerCase() ?? "";
        return refA.localeCompare(refB);
    });
}
function getServiceTick(asset, columnKey) {
    return asset.serviceTicks?.find((tick) => tick.columnKey === columnKey);
}
function getAssetStatusText(asset, activeColumnKey) {
    const tick = getServiceTick(asset, activeColumnKey);
    if (!tick)
        return "No record";
    if (tick.ticked && tick.locked)
        return "Tested & locked";
    if (tick.ticked)
        return "Tested";
    return "Untested";
}
function getAssetStatusColors(asset, activeColumnKey) {
    const tick = getServiceTick(asset, activeColumnKey);
    if (tick?.ticked && tick?.locked) {
        return { background: "#dcfce7", color: "#166534" };
    }
    if (tick?.ticked) {
        return { background: "#dbeafe", color: "#1d4ed8" };
    }
    return { background: "#f3f4f6", color: "#374151" };
}
export function AssetsServiceMatrixPage() {
    const navigate = useNavigate();
    const { siteFile, updateSite, loading, error } = useFirestoreSite();
    const [search, setSearch] = useState("");
    const [selectedColumnKey, setSelectedColumnKey] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedTag, setSelectedTag] = useState("");
    const [importMode, setImportMode] = useState("manual");
    const [showImportPanel, setShowImportPanel] = useState(false);
    const [manualReference, setManualReference] = useState("");
    const [manualLoop, setManualLoop] = useState("");
    const [manualAddress, setManualAddress] = useState("");
    const [manualZone, setManualZone] = useState("");
    const [manualType, setManualType] = useState("");
    const [manualDescription, setManualDescription] = useState("");
    const [manualLocation, setManualLocation] = useState("");
    const [manualTags, setManualTags] = useState("");
    const [bulkText, setBulkText] = useState("");
    const [pasteText, setPasteText] = useState("");
    const [csvText, setCsvText] = useState("");
    const [csvReferenceHeader, setCsvReferenceHeader] = useState("reference");
    const [csvLoopHeader, setCsvLoopHeader] = useState("loop");
    const [csvAddressHeader, setCsvAddressHeader] = useState("address");
    const [csvZoneHeader, setCsvZoneHeader] = useState("zone");
    const [csvTypeHeader, setCsvTypeHeader] = useState("assetType");
    const [csvDescriptionHeader, setCsvDescriptionHeader] = useState("description");
    const [csvLocationHeader, setCsvLocationHeader] = useState("locationText");
    const [csvTagsHeader, setCsvTagsHeader] = useState("tags");
    const [messages, setMessages] = useState([]);
    const [saving, setSaving] = useState(false);
    const activeColumnKey = selectedColumnKey || siteFile?.serviceLayout.columns[0]?.key || "";
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
    const availableTags = useMemo(() => {
        if (!siteFile)
            return [];
        return getAvailableAssetTags(siteFile);
    }, [siteFile]);
    const filteredAssets = useMemo(() => {
        if (!siteFile)
            return [];
        return sortAssets(filterAssets(siteFile.assets, {
            category: selectedCategory === "all" ? undefined : selectedCategory,
            tag: selectedTag || undefined,
            search,
            activeOnly: false,
            serviceTrackableOnly: false,
        }));
    }, [siteFile, selectedCategory, selectedTag, search]);
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
                    updatedAt: new Date().toISOString(),
                },
            }));
        }
        finally {
            setSaving(false);
        }
    };
    const handleManualAdd = async (event) => {
        event.preventDefault();
        if (!siteFile)
            return;
        try {
            const result = importAssetRows([
                {
                    reference: manualReference || undefined,
                    loop: manualLoop || undefined,
                    address: manualAddress || undefined,
                    zone: manualZone || undefined,
                    assetType: manualType || undefined,
                    description: manualDescription || undefined,
                    locationText: manualLocation || undefined,
                    tags: manualTags
                        .split(/[;,|]/g)
                        .map((item) => item.trim())
                        .filter(Boolean),
                    source: "manual",
                },
            ], {
                siteId: siteFile.site.id,
                discipline: "fire-alarm",
                source: "manual",
            });
            if (result.errors.length > 0) {
                setMessages(result.errors);
                return;
            }
            const next = JSON.parse(JSON.stringify(siteFile));
            next.assets.push(...result.assets);
            await persistSiteFile(next);
            setMessages(result.warnings.length ? result.warnings : ["Device added."]);
            setManualReference("");
            setManualLoop("");
            setManualAddress("");
            setManualZone("");
            setManualType("");
            setManualDescription("");
            setManualLocation("");
            setManualTags("");
        }
        catch (saveError) {
            setMessages([
                saveError instanceof Error ? saveError.message : "Failed to add device.",
            ]);
        }
    };
    const handleBulkImport = async () => {
        if (!siteFile)
            return;
        try {
            const result = parseBulkAddText(bulkText, {
                siteId: siteFile.site.id,
                discipline: "fire-alarm",
                source: "manual",
            });
            if (result.errors.length > 0) {
                setMessages(result.errors);
                return;
            }
            const next = JSON.parse(JSON.stringify(siteFile));
            next.assets.push(...result.assets);
            await persistSiteFile(next);
            setMessages(result.warnings.length ? result.warnings : [`Imported ${result.assets.length} assets.`]);
            setBulkText("");
        }
        catch (saveError) {
            setMessages([
                saveError instanceof Error ? saveError.message : "Failed to import bulk text.",
            ]);
        }
    };
    const handlePasteImport = async () => {
        if (!siteFile)
            return;
        try {
            const result = parsePastedTable(pasteText, {
                siteId: siteFile.site.id,
                discipline: "fire-alarm",
                source: "panel-import",
            });
            if (result.errors.length > 0) {
                setMessages(result.errors);
                return;
            }
            const next = JSON.parse(JSON.stringify(siteFile));
            next.assets.push(...result.assets);
            await persistSiteFile(next);
            setMessages(result.warnings.length ? result.warnings : [`Imported ${result.assets.length} assets.`]);
            setPasteText("");
        }
        catch (saveError) {
            setMessages([
                saveError instanceof Error ? saveError.message : "Failed to import pasted table.",
            ]);
        }
    };
    const handleCsvImport = async () => {
        if (!siteFile)
            return;
        try {
            const result = parseCsvText(csvText, {
                reference: csvReferenceHeader,
                loop: csvLoopHeader,
                address: csvAddressHeader,
                zone: csvZoneHeader,
                assetType: csvTypeHeader,
                description: csvDescriptionHeader,
                locationText: csvLocationHeader,
                tags: csvTagsHeader,
            }, {
                siteId: siteFile.site.id,
                discipline: "fire-alarm",
                source: "csv-import",
            });
            if (result.errors.length > 0) {
                setMessages(result.errors);
                return;
            }
            const next = JSON.parse(JSON.stringify(siteFile));
            next.assets.push(...result.assets);
            await persistSiteFile(next);
            setMessages(result.warnings.length ? result.warnings : [`Imported ${result.assets.length} assets.`]);
            setCsvText("");
        }
        catch (saveError) {
            setMessages([
                saveError instanceof Error ? saveError.message : "Failed to import CSV text.",
            ]);
        }
    };
    const toggleTick = async (assetId, columnKey) => {
        if (!siteFile)
            return;
        try {
            const next = JSON.parse(JSON.stringify(siteFile));
            const asset = next.assets.find((a) => a.id === assetId);
            if (!asset)
                return;
            const tick = getServiceTick(asset, columnKey);
            const ticked = tick?.ticked ?? false;
            const locked = tick?.locked ?? false;
            if (locked) {
                setMessages([
                    `This service entry is locked. Unlock it before making changes.`,
                ]);
                return;
            }
            if (ticked) {
                untickAssetForService(next, assetId, columnKey);
            }
            else {
                tickAssetForService(next, assetId, columnKey, {
                    testedBy: "Engineer",
                    lockAfterTick: false,
                });
            }
            await persistSiteFile(next);
            setMessages([]);
        }
        catch (saveError) {
            setMessages([
                saveError instanceof Error ? saveError.message : "Failed to update service tick.",
            ]);
        }
    };
    const toggleLock = async (assetId, columnKey) => {
        if (!siteFile)
            return;
        try {
            const next = JSON.parse(JSON.stringify(siteFile));
            const asset = next.assets.find((a) => a.id === assetId);
            if (!asset)
                return;
            const tick = getServiceTick(asset, columnKey);
            const locked = tick?.locked ?? false;
            if (locked) {
                unlockAssetServiceTick(next, assetId, columnKey);
                setMessages(["Service entry unlocked."]);
            }
            else {
                lockAssetServiceTick(next, assetId, columnKey);
                setMessages(["Service entry locked."]);
            }
            await persistSiteFile(next);
        }
        catch (saveError) {
            setMessages([
                saveError instanceof Error ? saveError.message : "Failed to update lock state.",
            ]);
        }
    };
    if (loading) {
        return (_jsx(AppLayout, { title: "Loading assets", children: _jsx(Card, { children: "Loading assets..." }) }));
    }
    if (error) {
        return (_jsx(AppLayout, { title: "Assets error", children: _jsx(Card, { children: error }) }));
    }
    if (!siteFile) {
        return (_jsx(AppLayout, { title: "Assets not found", children: _jsxs(Card, { children: [_jsx("p", { style: { marginTop: 0 }, children: "The requested site could not be found." }), _jsx(SecondaryButton, { onClick: () => navigate("/"), children: "Back to Sites" })] }) }));
    }
    return (_jsx(AppLayout, { title: "Assets / Service Matrix", subtitle: `${siteFile.site.name} • ${siteFile.site.siteCode ?? siteFile.site.id}`, children: _jsxs("div", { style: pageGridStyle, children: [_jsx(Card, { children: _jsxs("div", { style: heroWrapStyle, children: [_jsxs("div", { children: [_jsx("div", { style: eyebrowStyle, children: "SERVICE MATRIX" }), _jsx("div", { style: heroTitleStyle, children: "Testing Sheet View" }), _jsx("div", { style: heroSubStyle, children: "Designed for fast on-site checking of what has been tested, when it was tested, and whether that entry is locked." })] }), _jsx("div", { style: heroBadgeStyle, children: activeColumn?.label ?? (activeColumnKey ? activeColumnKey.toUpperCase() : "No Column") })] }) }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Controls" }), _jsxs("div", { style: { display: "grid", gap: "12px" }, children: [_jsx(Field, { label: "Active Service Column", children: _jsx("select", { value: activeColumnKey, onChange: (e) => setSelectedColumnKey(e.target.value), style: inputStyle, children: siteFile.serviceLayout.columns.map((column) => (_jsxs("option", { value: column.key, children: [column.label, column.serviceDate ? ` • ${formatIrishDate(column.serviceDate)}` : ""] }, column.key))) }) }), activeColumn ? (_jsxs("div", { style: activeColumnCardStyle, children: [_jsxs("div", { style: activeColumnTitleStyle, children: ["Active Column: ", activeColumn.label] }), _jsx("div", { style: activeColumnMetaStyle, children: activeColumn.serviceDate
                                                ? `Planned service date: ${formatIrishDate(activeColumn.serviceDate)}`
                                                : "No service date recorded for this column" })] })) : null, _jsx(Field, { label: "Search Assets", children: _jsx("input", { type: "text", placeholder: "Ref, type, loop, address, location, tags...", value: search, onChange: (e) => setSearch(e.target.value), style: inputStyle }) }), _jsxs("div", { style: twoColStyle, children: [_jsx(PrimaryButton, { onClick: () => setShowImportPanel((v) => !v), children: showImportPanel ? "Hide Add / Import" : "Add / Import" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/overview`), children: "Back to Overview" })] }), saving ? _jsx("div", { style: savingTextStyle, children: "Saving\u2026" }) : null] })] }), progress && (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Automatic Detector Progress" }), _jsxs("div", { style: progressTopRowStyle, children: [_jsxs("div", { children: [_jsx("div", { style: progressTitleStyle, children: activeColumn?.label ?? activeColumnKey.toUpperCase() }), _jsx("div", { style: progressSubStyle, children: activeColumn?.serviceDate
                                                ? formatIrishDate(activeColumn.serviceDate)
                                                : "No service date" })] }), _jsxs("div", { style: progressCountStyle, children: [progress.testedCount, " / ", progress.eligibleTotal] })] }), _jsx("div", { style: progressTrackStyle, children: _jsx("div", { style: {
                                    ...progressBarStyle,
                                    width: `${Math.min(progress.percentage, 100)}%`,
                                    background: progress.thresholdMet ? "#16a34a" : "#f59e0b",
                                } }) }), _jsxs("div", { style: progressFooterStyle, children: [progress.percentage, "% tested \u2022", " ", progress.thresholdMet
                                    ? "25% requirement met"
                                    : `${progress.remainingToThreshold} more needed`] }), columnSummary ? (_jsxs("div", { style: progressSecondaryStyle, children: [columnSummary.testedAssets, " / ", columnSummary.totalTrackableAssets, " trackable assets ticked"] })) : null] })), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Categories" }), _jsxs("div", { style: chipWrapStyle, children: [_jsx(Chip, { label: "All", active: selectedCategory === "all", onClick: () => setSelectedCategory("all") }), availableCategories.map((category) => (_jsx(Chip, { label: CATEGORY_LABELS[category] ?? category, active: selectedCategory === category, onClick: () => setSelectedCategory(category) }, category)))] })] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Tags" }), _jsxs("div", { style: chipWrapStyle, children: [_jsx(Chip, { label: "All Tags", active: selectedTag === "", onClick: () => setSelectedTag("") }), availableTags.map((tag) => (_jsx(Chip, { label: tag, active: selectedTag === tag, onClick: () => setSelectedTag(tag) }, tag)))] })] }), showImportPanel && (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Add / Import Devices" }), _jsxs("div", { style: importModeGridStyle, children: [_jsx(ModeButton, { active: importMode === "manual", onClick: () => setImportMode("manual"), children: "Manual" }), _jsx(ModeButton, { active: importMode === "bulk", onClick: () => setImportMode("bulk"), children: "Bulk Add" }), _jsx(ModeButton, { active: importMode === "paste", onClick: () => setImportMode("paste"), children: "Paste Table" }), _jsx(ModeButton, { active: importMode === "csv", onClick: () => setImportMode("csv"), children: "CSV Text" })] }), importMode === "manual" && (_jsxs("form", { onSubmit: handleManualAdd, children: [_jsx(Field, { label: "Reference", children: _jsx("input", { value: manualReference, onChange: (e) => setManualReference(e.target.value), style: inputStyle, placeholder: "L1-A11" }) }), _jsxs("div", { style: twoColStyle, children: [_jsx(Field, { label: "Loop", children: _jsx("input", { value: manualLoop, onChange: (e) => setManualLoop(e.target.value), style: inputStyle }) }), _jsx(Field, { label: "Address", children: _jsx("input", { value: manualAddress, onChange: (e) => setManualAddress(e.target.value), style: inputStyle }) })] }), _jsxs("div", { style: twoColStyle, children: [_jsx(Field, { label: "Zone", children: _jsx("input", { value: manualZone, onChange: (e) => setManualZone(e.target.value), style: inputStyle }) }), _jsx(Field, { label: "Asset Type", children: _jsx("input", { value: manualType, onChange: (e) => setManualType(e.target.value), style: inputStyle, placeholder: "Optical Detector", required: true }) })] }), _jsx(Field, { label: "Description", children: _jsx("input", { value: manualDescription, onChange: (e) => setManualDescription(e.target.value), style: inputStyle }) }), _jsx(Field, { label: "Location", children: _jsx("input", { value: manualLocation, onChange: (e) => setManualLocation(e.target.value), style: inputStyle }) }), _jsx(Field, { label: "Tags", children: _jsx("input", { value: manualTags, onChange: (e) => setManualTags(e.target.value), style: inputStyle, placeholder: "void, atex, attic" }) }), _jsx(PrimaryButton, { type: "submit", style: { width: "100%" }, disabled: saving, children: "Add Device" })] })), importMode === "bulk" && (_jsxs("div", { style: { display: "grid", gap: "12px" }, children: [_jsx(Field, { label: "Bulk Add Text", children: _jsx("textarea", { rows: 8, value: bulkText, onChange: (e) => setBulkText(e.target.value), style: textareaStyle, placeholder: `Loop 1 A11 Optical Detector - Corridor
Loop 1 A12 Optical Detector - Office 1
Loop 1 A13 MCP - Final Exit` }) }), _jsx(PrimaryButton, { onClick: handleBulkImport, style: { width: "100%" }, disabled: saving, children: "Import Bulk Text" })] })), importMode === "paste" && (_jsxs("div", { style: { display: "grid", gap: "12px" }, children: [_jsx(Field, { label: "Paste Panel Table", children: _jsx("textarea", { rows: 8, value: pasteText, onChange: (e) => setPasteText(e.target.value), style: textareaStyle, placeholder: `L1-A11    Optical Detector    Corridor    Zone 1` }) }), _jsx(PrimaryButton, { onClick: handlePasteImport, style: { width: "100%" }, disabled: saving, children: "Import Pasted Table" })] })), importMode === "csv" && (_jsxs("div", { style: { display: "grid", gap: "12px" }, children: [_jsx(Field, { label: "CSV Headers Mapping", children: _jsxs("div", { style: csvHeaderGridStyle, children: [_jsx("input", { value: csvReferenceHeader, onChange: (e) => setCsvReferenceHeader(e.target.value), style: inputStyle, placeholder: "reference" }), _jsx("input", { value: csvLoopHeader, onChange: (e) => setCsvLoopHeader(e.target.value), style: inputStyle, placeholder: "loop" }), _jsx("input", { value: csvAddressHeader, onChange: (e) => setCsvAddressHeader(e.target.value), style: inputStyle, placeholder: "address" }), _jsx("input", { value: csvZoneHeader, onChange: (e) => setCsvZoneHeader(e.target.value), style: inputStyle, placeholder: "zone" }), _jsx("input", { value: csvTypeHeader, onChange: (e) => setCsvTypeHeader(e.target.value), style: inputStyle, placeholder: "assetType" }), _jsx("input", { value: csvDescriptionHeader, onChange: (e) => setCsvDescriptionHeader(e.target.value), style: inputStyle, placeholder: "description" }), _jsx("input", { value: csvLocationHeader, onChange: (e) => setCsvLocationHeader(e.target.value), style: inputStyle, placeholder: "locationText" }), _jsx("input", { value: csvTagsHeader, onChange: (e) => setCsvTagsHeader(e.target.value), style: inputStyle, placeholder: "tags" })] }) }), _jsx(Field, { label: "CSV Text", children: _jsx("textarea", { rows: 10, value: csvText, onChange: (e) => setCsvText(e.target.value), style: textareaStyle, placeholder: `reference,loop,address,zone,assetType,description,locationText,tags
L1-A11,1,11,1,Optical Detector,Corridor detector,Corridor,detector` }) }), _jsx(PrimaryButton, { onClick: handleCsvImport, style: { width: "100%" }, disabled: saving, children: "Import CSV Text" })] }))] })), messages.length > 0 && (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Messages" }), _jsx("div", { style: messageListStyle, children: messages.map((message, index) => (_jsx("div", { children: message }, `${message}-${index}`))) })] })), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Testing Sheet" }), filteredAssets.length === 0 ? (_jsx("p", { style: emptyTextStyle, children: "No assets match the current filters." })) : (_jsx("div", { style: sheetScrollWrapStyle, children: _jsxs("div", { style: sheetTableStyle, children: [_jsxs("div", { style: sheetHeaderRowStyle, children: [_jsx("div", { style: sheetRefHeaderStyle, children: "Ref" }), _jsx("div", { style: sheetTypeHeaderStyle, children: "Type / Location" }), siteFile.serviceLayout.columns.map((column) => (_jsxs("div", { style: sheetColumnHeaderStyle, children: [_jsx("div", { style: sheetColumnHeaderLabelStyle, children: column.label }), _jsx("div", { style: sheetColumnHeaderDateStyle, children: column.serviceDate ? formatIrishDate(column.serviceDate) : "—" })] }, column.key)))] }), filteredAssets.map((asset) => (_jsxs("div", { style: sheetAssetRowStyle, children: [_jsx("div", { style: sheetRefCellStyle, children: _jsx("div", { style: sheetRefValueStyle, children: asset.reference ?? "—" }) }), _jsxs("div", { style: sheetTypeCellStyle, children: [_jsx("div", { style: sheetTypeValueStyle, children: asset.assetType ?? "Unknown type" }), _jsxs("div", { style: sheetMetaValueStyle, children: ["Loop ", asset.loop ?? "—", " \u2022 Address ", asset.address ?? "—", " \u2022 Zone", " ", asset.zone ?? "—"] }), _jsx("div", { style: sheetMetaValueStyle, children: asset.locationText ?? asset.description ?? "No location / description" }), (asset.tags ?? []).length > 0 ? (_jsx("div", { style: assetTagsWrapStyle, children: asset.tags.map((tag) => (_jsx("span", { style: tagPillStyle, children: tag }, tag))) })) : null, _jsx("div", { style: {
                                                            ...assetStatusPillStyle,
                                                            ...getAssetStatusColors(asset, activeColumnKey),
                                                        }, children: getAssetStatusText(asset, activeColumnKey) })] }), siteFile.serviceLayout.columns.map((column) => {
                                                const tick = getServiceTick(asset, column.key);
                                                const ticked = tick?.ticked ?? false;
                                                const locked = tick?.locked ?? false;
                                                const testedAt = tick?.testedAt;
                                                const testedBy = tick?.testedBy;
                                                const jobRef = tick?.jobRef;
                                                return (_jsx("div", { style: sheetColumnCellWrapStyle, children: _jsxs("div", { style: {
                                                            ...sheetTickCellStyle,
                                                            background: ticked ? "#22c55e" : "#ffffff",
                                                            borderColor: ticked ? "#16a34a" : "#d1d5db",
                                                            boxShadow: column.key === activeColumnKey
                                                                ? "0 0 0 2px rgba(37,99,235,0.16)"
                                                                : "none",
                                                        }, onClick: () => toggleTick(asset.id, column.key), children: [_jsx("button", { type: "button", style: sheetLockButtonStyle, onClick: (e) => {
                                                                    e.stopPropagation();
                                                                    toggleLock(asset.id, column.key);
                                                                }, "aria-label": locked ? "Unlock service entry" : "Lock service entry", title: locked ? "Unlock service entry" : "Lock service entry", children: locked ? "🔒" : "🔓" }), _jsx("div", { style: sheetTickMarkStyle, children: ticked ? "✓" : "" }), _jsx("div", { style: sheetTickMetaStyle, children: testedAt ? formatIrishDate(testedAt) : "—" }), _jsx("div", { style: sheetTickMetaStyle, children: jobRef ? jobRef : ticked ? "Tested" : "Not tested" }), _jsx("div", { style: sheetTickMetaSubtleStyle, children: testedBy ? testedBy : "" }), _jsx("div", { style: sheetTickMetaSubtleStyle, children: locked && tick?.lockedAt
                                                                    ? `Locked ${formatIrishDateTime(tick.lockedAt)}`
                                                                    : locked
                                                                        ? "Locked"
                                                                        : "" })] }) }, column.key));
                                            })] }, asset.id)))] }) }))] })] }) }));
}
function Chip({ label, active, onClick, }) {
    return (_jsx("button", { type: "button", onClick: onClick, style: active ? chipActiveStyle : chipStyle, children: label }));
}
function ModeButton({ children, active, onClick, }) {
    return (_jsx("button", { type: "button", onClick: onClick, style: active ? chipActiveStyle : chipStyle, children: children }));
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
const activeColumnCardStyle = {
    padding: "14px",
    borderRadius: "16px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    display: "grid",
    gap: "6px",
};
const activeColumnTitleStyle = {
    fontWeight: 800,
    color: "#111827",
};
const activeColumnMetaStyle = {
    color: "#6b7280",
    fontSize: "0.92rem",
    lineHeight: 1.4,
};
const progressTopRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
};
const progressTitleStyle = {
    fontWeight: 700,
};
const progressSubStyle = {
    color: "#6b7280",
    fontSize: "0.9rem",
    marginTop: "2px",
};
const progressCountStyle = {
    fontWeight: 800,
    fontSize: "1rem",
};
const progressTrackStyle = {
    height: "16px",
    borderRadius: "999px",
    background: "#e5e7eb",
    overflow: "hidden",
    marginBottom: "8px",
};
const progressBarStyle = {
    height: "100%",
    borderRadius: "999px",
};
const progressFooterStyle = {
    color: "#6b7280",
    marginBottom: "6px",
};
const progressSecondaryStyle = {
    color: "#6b7280",
    fontSize: "0.92rem",
};
const twoColStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const importModeGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "8px",
    marginBottom: "14px",
};
const csvHeaderGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
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
const sheetScrollWrapStyle = {
    overflowX: "auto",
};
const sheetTableStyle = {
    minWidth: "1100px",
    display: "grid",
    gap: "10px",
};
const sheetHeaderRowStyle = {
    display: "grid",
    gridTemplateColumns: "120px 280px repeat(4, 110px)",
    gap: "10px",
    alignItems: "stretch",
};
const sheetAssetRowStyle = {
    display: "grid",
    gridTemplateColumns: "120px 280px repeat(4, 110px)",
    gap: "10px",
    alignItems: "stretch",
};
const sheetRefHeaderStyle = {
    padding: "10px 12px",
    borderRadius: "14px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    fontWeight: 800,
    color: "#111827",
};
const sheetTypeHeaderStyle = {
    padding: "10px 12px",
    borderRadius: "14px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    fontWeight: 800,
    color: "#111827",
};
const sheetColumnHeaderStyle = {
    padding: "10px 8px",
    borderRadius: "14px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    textAlign: "center",
};
const sheetColumnHeaderLabelStyle = {
    fontWeight: 800,
    color: "#111827",
    marginBottom: "4px",
};
const sheetColumnHeaderDateStyle = {
    fontSize: "0.78rem",
    color: "#6b7280",
};
const sheetRefCellStyle = {
    padding: "12px",
    borderRadius: "16px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "start",
};
const sheetRefValueStyle = {
    fontWeight: 800,
    color: "#111827",
    fontSize: "0.98rem",
};
const sheetTypeCellStyle = {
    padding: "12px",
    borderRadius: "16px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    display: "grid",
    gap: "6px",
};
const sheetTypeValueStyle = {
    fontWeight: 800,
    color: "#111827",
};
const sheetMetaValueStyle = {
    color: "#6b7280",
    fontSize: "0.84rem",
    lineHeight: 1.35,
};
const assetTagsWrapStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: "2px",
};
const tagPillStyle = {
    padding: "5px 9px",
    borderRadius: "999px",
    background: "#e0e7ff",
    color: "#3730a3",
    fontSize: "0.76rem",
};
const assetStatusPillStyle = {
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "0.76rem",
    fontWeight: 800,
    whiteSpace: "nowrap",
    width: "fit-content",
    marginTop: "4px",
};
const sheetColumnCellWrapStyle = {
    display: "flex",
};
const sheetTickCellStyle = {
    width: "100%",
    minHeight: "110px",
    borderRadius: "14px",
    border: "2px solid #d1d5db",
    background: "#ffffff",
    position: "relative",
    display: "grid",
    alignContent: "center",
    justifyItems: "center",
    gap: "4px",
    padding: "10px 8px 8px",
    cursor: "pointer",
    userSelect: "none",
};
const sheetLockButtonStyle = {
    position: "absolute",
    top: "6px",
    right: "6px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "0.82rem",
    padding: 0,
};
const sheetTickMarkStyle = {
    fontSize: "1.35rem",
    fontWeight: 900,
    lineHeight: 1,
};
const sheetTickMetaStyle = {
    fontSize: "0.72rem",
    fontWeight: 700,
    textAlign: "center",
    lineHeight: 1.2,
};
const sheetTickMetaSubtleStyle = {
    fontSize: "0.66rem",
    color: "#334155",
    textAlign: "center",
    lineHeight: 1.2,
};
