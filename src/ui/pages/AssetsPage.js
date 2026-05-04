import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { filterAssets, getAvailableAssetCategories, importAssetRows, parseBulkAddText, parseCsvText, parsePastedTable, } from "../../core";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { cleanFirestoreData } from "../../utils/cleanFirestoreData";
import { AppLayout } from "../layouts/AppLayout";
import { Card, CardTitle, Field, PrimaryButton, SecondaryButton, inputStyle, textareaStyle, } from "../components/ui";
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
function nowIso() {
    return new Date().toISOString();
}
function escapeCsv(value) {
    const stringValue = String(value ?? "");
    if (stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}
function downloadTextFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
export function AssetsPage() {
    const navigate = useNavigate();
    const { siteFile, updateSite, loading, error } = useFirestoreSite();
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
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
            activeOnly: false,
            serviceTrackableOnly: false,
        }));
    }, [siteFile, selectedCategory, search]);
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
    const handleExportCsv = () => {
        if (!siteFile)
            return;
        const rows = filteredAssets.map((asset) => ({
            reference: asset.reference ?? "",
            loop: asset.loop ?? "",
            address: asset.address ?? "",
            zone: asset.zone ?? "",
            assetType: asset.assetType ?? "",
            category: asset.category ?? "",
            description: asset.description ?? "",
            locationText: asset.locationText ?? "",
            tags: (asset.tags ?? []).join("|"),
            active: asset.active ? "yes" : "no",
            serviceTrackable: asset.serviceTrackable ? "yes" : "no",
            source: asset.source ?? "",
        }));
        const headers = [
            "reference",
            "loop",
            "address",
            "zone",
            "assetType",
            "category",
            "description",
            "locationText",
            "tags",
            "active",
            "serviceTrackable",
            "source",
        ];
        const csv = [
            headers.join(","),
            ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")),
        ].join("\n");
        const safeSiteName = (siteFile.site.name || "site")
            .replace(/[^\w\s-]/g, "")
            .trim()
            .replace(/\s+/g, "_");
        downloadTextFile(`${safeSiteName}_assets.csv`, csv, "text/csv;charset=utf-8;");
        setMessages([`Exported ${rows.length} asset${rows.length === 1 ? "" : "s"} to CSV.`]);
    };
    if (loading) {
        return (_jsx(AppLayout, { title: "Loading assets", children: _jsx(Card, { children: "Loading asset register..." }) }));
    }
    if (error) {
        return (_jsx(AppLayout, { title: "Asset error", children: _jsx(Card, { children: error }) }));
    }
    if (!siteFile) {
        return (_jsx(AppLayout, { title: "Assets not found", children: _jsxs(Card, { children: [_jsx("p", { style: { marginTop: 0 }, children: "The requested site could not be found." }), _jsx(SecondaryButton, { onClick: () => navigate("/"), children: "Back to Sites" })] }) }));
    }
    return (_jsx(AppLayout, { title: "Assets", subtitle: `${siteFile.site.name} • ${siteFile.site.siteCode ?? siteFile.site.id}`, children: _jsxs("div", { style: pageGridStyle, children: [_jsx(Card, { children: _jsxs("div", { style: heroWrapStyle, children: [_jsxs("div", { children: [_jsx("div", { style: eyebrowStyle, children: "ASSET REGISTER" }), _jsx("div", { style: heroTitleStyle, children: "Site Devices" }), _jsx("div", { style: heroSubStyle, children: "Add, import, review and manage all devices on this site. Service interaction is handled separately in the Service section." })] }), _jsxs("div", { style: heroBadgeStyle, children: [siteFile.assets.length, " Devices"] })] }) }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Controls" }), _jsxs("div", { style: { display: "grid", gap: "12px" }, children: [_jsx(Field, { label: "Search Assets", children: _jsx("input", { type: "text", placeholder: "Ref, type, loop, address, location...", value: search, onChange: (e) => setSearch(e.target.value), style: inputStyle }) }), _jsxs("div", { style: controlsActionRowStyle, children: [_jsx(PrimaryButton, { onClick: () => setShowImportPanel((v) => !v), children: showImportPanel ? "Hide Add / Import" : "Add / Import" }), _jsx(SecondaryButton, { onClick: handleExportCsv, children: "Export CSV" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/service`), children: "Go to Service" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/overview`), children: "Back to Overview" })] }), saving ? _jsx("div", { style: savingTextStyle, children: "Saving\u2026" }) : null] })] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Categories" }), _jsxs("div", { style: chipWrapStyle, children: [_jsx(Chip, { label: "All", active: selectedCategory === "all", onClick: () => setSelectedCategory("all") }), availableCategories.map((category) => (_jsx(Chip, { label: CATEGORY_LABELS[category] ?? category, active: selectedCategory === category, onClick: () => setSelectedCategory(category) }, category)))] })] }), showImportPanel && (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Add / Import Devices" }), _jsxs("div", { style: importModeGridStyle, children: [_jsx(ModeButton, { active: importMode === "manual", onClick: () => setImportMode("manual"), children: "Manual" }), _jsx(ModeButton, { active: importMode === "bulk", onClick: () => setImportMode("bulk"), children: "Bulk Add" }), _jsx(ModeButton, { active: importMode === "paste", onClick: () => setImportMode("paste"), children: "Paste Table" }), _jsx(ModeButton, { active: importMode === "csv", onClick: () => setImportMode("csv"), children: "CSV Text" })] }), importMode === "manual" && (_jsxs("form", { onSubmit: handleManualAdd, style: { display: "grid", gap: "12px" }, children: [_jsx(Field, { label: "Reference", children: _jsx("input", { value: manualReference, onChange: (e) => setManualReference(e.target.value), style: inputStyle, placeholder: "L1-A01" }) }), _jsxs("div", { style: twoColStyle, children: [_jsx(Field, { label: "Loop", children: _jsx("input", { value: manualLoop, onChange: (e) => setManualLoop(e.target.value), style: inputStyle }) }), _jsx(Field, { label: "Address", children: _jsx("input", { value: manualAddress, onChange: (e) => setManualAddress(e.target.value), style: inputStyle }) })] }), _jsxs("div", { style: twoColStyle, children: [_jsx(Field, { label: "Zone", children: _jsx("input", { value: manualZone, onChange: (e) => setManualZone(e.target.value), style: inputStyle }) }), _jsx(Field, { label: "Asset Type", children: _jsx("input", { value: manualType, onChange: (e) => setManualType(e.target.value), style: inputStyle, placeholder: "Optical Detector", required: true }) })] }), _jsx(Field, { label: "Description", children: _jsx("input", { value: manualDescription, onChange: (e) => setManualDescription(e.target.value), style: inputStyle, placeholder: "Device description" }) }), _jsx(Field, { label: "Location", children: _jsx("input", { value: manualLocation, onChange: (e) => setManualLocation(e.target.value), style: inputStyle, placeholder: "Entry lobby / basement / riser..." }) }), _jsx(Field, { label: "Tags", children: _jsx("input", { value: manualTags, onChange: (e) => setManualTags(e.target.value), style: inputStyle, placeholder: "void, attic, mcp" }) }), _jsx(PrimaryButton, { type: "submit", disabled: saving, children: "Add Device" })] })), importMode === "bulk" && (_jsxs("div", { style: { display: "grid", gap: "12px" }, children: [_jsx(Field, { label: "Bulk Add Text", children: _jsx("textarea", { rows: 8, value: bulkText, onChange: (e) => setBulkText(e.target.value), style: textareaStyle, placeholder: `Loop 1 A11 Optical Detector - Corridor
Loop 1 A12 Optical Detector - Office 1
Loop 1 A13 MCP - Final Exit` }) }), _jsx(PrimaryButton, { onClick: handleBulkImport, disabled: saving, children: "Import Bulk Text" })] })), importMode === "paste" && (_jsxs("div", { style: { display: "grid", gap: "12px" }, children: [_jsx(Field, { label: "Paste Panel Table", children: _jsx("textarea", { rows: 8, value: pasteText, onChange: (e) => setPasteText(e.target.value), style: textareaStyle, placeholder: `L1-A11    Optical Detector    Corridor    Zone 1` }) }), _jsx(PrimaryButton, { onClick: handlePasteImport, disabled: saving, children: "Import Pasted Table" })] })), importMode === "csv" && (_jsxs("div", { style: { display: "grid", gap: "12px" }, children: [_jsx(Field, { label: "CSV Header Mapping", children: _jsxs("div", { style: csvHeaderGridStyle, children: [_jsx("input", { value: csvReferenceHeader, onChange: (e) => setCsvReferenceHeader(e.target.value), style: inputStyle, placeholder: "reference" }), _jsx("input", { value: csvLoopHeader, onChange: (e) => setCsvLoopHeader(e.target.value), style: inputStyle, placeholder: "loop" }), _jsx("input", { value: csvAddressHeader, onChange: (e) => setCsvAddressHeader(e.target.value), style: inputStyle, placeholder: "address" }), _jsx("input", { value: csvZoneHeader, onChange: (e) => setCsvZoneHeader(e.target.value), style: inputStyle, placeholder: "zone" }), _jsx("input", { value: csvTypeHeader, onChange: (e) => setCsvTypeHeader(e.target.value), style: inputStyle, placeholder: "assetType" }), _jsx("input", { value: csvDescriptionHeader, onChange: (e) => setCsvDescriptionHeader(e.target.value), style: inputStyle, placeholder: "description" }), _jsx("input", { value: csvLocationHeader, onChange: (e) => setCsvLocationHeader(e.target.value), style: inputStyle, placeholder: "locationText" }), _jsx("input", { value: csvTagsHeader, onChange: (e) => setCsvTagsHeader(e.target.value), style: inputStyle, placeholder: "tags" })] }) }), _jsx(Field, { label: "CSV Text", children: _jsx("textarea", { rows: 10, value: csvText, onChange: (e) => setCsvText(e.target.value), style: textareaStyle, placeholder: `reference,loop,address,zone,assetType,description,locationText,tags
L1-A11,1,11,1,Optical Detector,Corridor detector,Corridor,detector` }) }), _jsx(PrimaryButton, { onClick: handleCsvImport, disabled: saving, children: "Import CSV Text" })] }))] })), messages.length > 0 && (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Messages" }), _jsx("div", { style: messageListStyle, children: messages.map((message, index) => (_jsx("div", { children: message }, `${message}-${index}`))) })] })), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Asset Register" }), filteredAssets.length === 0 ? (_jsx("p", { style: emptyTextStyle, children: "No assets match the current filters." })) : (_jsx("div", { style: assetGridStyle, children: filteredAssets.map((asset) => (_jsxs("div", { style: assetCardStyle, children: [_jsxs("div", { style: assetTopRowStyle, children: [_jsxs("div", { children: [_jsx("div", { style: assetRefStyle, children: asset.reference }), _jsx("div", { style: assetTypeStyle, children: asset.assetType })] }), _jsxs("div", { style: assetStatusWrapStyle, children: [_jsx("span", { style: {
                                                            ...statusPillStyle,
                                                            background: asset.active ? "#dcfce7" : "#f3f4f6",
                                                            color: asset.active ? "#166534" : "#374151",
                                                        }, children: asset.active ? "Active" : "Inactive" }), _jsx("span", { style: {
                                                            ...statusPillStyle,
                                                            background: asset.serviceTrackable ? "#dbeafe" : "#f3f4f6",
                                                            color: asset.serviceTrackable ? "#1d4ed8" : "#374151",
                                                        }, children: asset.serviceTrackable ? "Trackable" : "Non-trackable" })] })] }), _jsxs("div", { style: assetMetaGridStyle, children: [_jsxs("div", { children: [_jsx("strong", { children: "Loop:" }), " ", asset.loop ?? "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Address:" }), " ", asset.address ?? "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Zone:" }), " ", asset.zone ?? "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Category:" }), " ", asset.category ?? "—"] }), _jsxs("div", { style: { gridColumn: "1 / -1" }, children: [_jsx("strong", { children: "Location:" }), " ", asset.locationText ?? "—"] }), _jsxs("div", { style: { gridColumn: "1 / -1" }, children: [_jsx("strong", { children: "Description:" }), " ", asset.description ?? "—"] })] }), (asset.tags ?? []).length > 0 && (_jsx("div", { style: chipWrapStyle, children: asset.tags.map((tag) => (_jsx("span", { style: tagPillStyle, children: tag }, tag))) })), _jsxs("div", { style: assetFooterStyle, children: [_jsxs("div", { style: assetFooterMetaStyle, children: ["Source: ", asset.source ?? "—"] }), _jsxs("div", { style: assetActionGridStyle, children: [_jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/assets/${asset.id}/edit`), children: "Edit" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/assets/${asset.id}/history`), children: "History" })] })] })] }, asset.id))) }))] })] }) }));
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
const controlsActionRowStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
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
const messageListStyle = {
    display: "grid",
    gap: "6px",
    color: "#92400e",
    fontWeight: 700,
};
const assetGridStyle = {
    display: "grid",
    gap: "12px",
};
const assetCardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "14px",
    background: "#f8fafc",
    display: "grid",
    gap: "12px",
};
const assetTopRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: "10px",
};
const assetRefStyle = {
    fontSize: "1rem",
    fontWeight: 800,
    color: "#111827",
};
const assetTypeStyle = {
    marginTop: "4px",
    color: "#374151",
    fontWeight: 700,
};
const assetStatusWrapStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    justifyContent: "end",
};
const statusPillStyle = {
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "0.76rem",
    fontWeight: 800,
    whiteSpace: "nowrap",
};
const assetMetaGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px 12px",
    color: "#374151",
    fontSize: "0.92rem",
};
const tagPillStyle = {
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#e0e7ff",
    color: "#3730a3",
    fontSize: "0.8rem",
};
const assetFooterStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "center",
};
const assetFooterMetaStyle = {
    color: "#6b7280",
    fontSize: "0.9rem",
};
const assetActionGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
};
const emptyTextStyle = {
    margin: 0,
    color: "#6b7280",
};
