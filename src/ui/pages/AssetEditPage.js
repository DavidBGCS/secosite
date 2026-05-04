import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { cleanFirestoreData } from "../../utils/cleanFirestoreData";
import { AppLayout } from "../layouts/AppLayout";
import { Card, CardTitle, Field, PrimaryButton, SecondaryButton, inputStyle, } from "../components/ui";
const CATEGORY_OPTIONS = [
    { value: "detector", label: "Detector" },
    { value: "optical-detector", label: "Optical Detector" },
    { value: "heat-detector", label: "Heat Detector" },
    { value: "multisensor", label: "Multisensor" },
    { value: "beam", label: "Beam" },
    { value: "aspirating", label: "Aspirating" },
    { value: "mcp", label: "MCP" },
    { value: "sounder", label: "Sounder" },
    { value: "sounder-beacon", label: "Sounder / Beacon" },
    { value: "interface", label: "Interface" },
    { value: "io", label: "I/O" },
    { value: "panel", label: "Panel" },
    { value: "repeater", label: "Repeater" },
    { value: "psu", label: "PSU" },
    { value: "void", label: "Void" },
    { value: "attic", label: "Attic" },
    { value: "atex", label: "ATEX" },
    { value: "other", label: "Other" },
];
function nowIso() {
    return new Date().toISOString();
}
export function AssetEditPage() {
    const navigate = useNavigate();
    const { assetId } = useParams();
    const { siteFile, updateSite, loading, error } = useFirestoreSite();
    const asset = useMemo(() => {
        if (!siteFile || !assetId)
            return undefined;
        return siteFile.assets.find((item) => item.id === assetId);
    }, [siteFile, assetId]);
    const [form, setForm] = useState({
        reference: "",
        loop: "",
        address: "",
        zone: "",
        assetType: "",
        category: "other",
        description: "",
        locationText: "",
        tagsText: "",
        active: true,
        serviceTrackable: true,
        countsTowardAutoDetectionPercentage: false,
    });
    const [saving, setSaving] = useState(false);
    const [messages, setMessages] = useState([]);
    useEffect(() => {
        if (!asset)
            return;
        setForm({
            reference: asset.reference ?? "",
            loop: asset.loop ?? "",
            address: asset.address ?? "",
            zone: asset.zone ?? "",
            assetType: asset.assetType ?? "",
            category: asset.category ?? "other",
            description: asset.description ?? "",
            locationText: asset.locationText ?? "",
            tagsText: (asset.tags ?? []).join(", "),
            active: asset.active ?? true,
            serviceTrackable: asset.serviceTrackable ?? true,
            countsTowardAutoDetectionPercentage: asset.countsTowardAutoDetectionPercentage ?? false,
        });
    }, [asset]);
    const handleSave = async () => {
        if (!siteFile || !asset)
            return;
        if (!form.reference.trim()) {
            setMessages(["Reference is required."]);
            return;
        }
        if (!form.assetType.trim()) {
            setMessages(["Asset type is required."]);
            return;
        }
        try {
            const next = JSON.parse(JSON.stringify(siteFile));
            const target = next.assets.find((item) => item.id === asset.id);
            if (!target) {
                throw new Error("Asset not found.");
            }
            target.reference = form.reference.trim();
            target.loop = form.loop.trim() || undefined;
            target.address = form.address.trim() || undefined;
            target.zone = form.zone.trim() || undefined;
            target.assetType = form.assetType.trim();
            target.category = form.category;
            target.description = form.description.trim() || undefined;
            target.locationText = form.locationText.trim() || undefined;
            target.tags = form.tagsText
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
            target.active = form.active;
            target.serviceTrackable = form.serviceTrackable;
            target.countsTowardAutoDetectionPercentage =
                form.countsTowardAutoDetectionPercentage;
            target.updatedAt = nowIso();
            next.metadata.updatedAt = nowIso();
            setSaving(true);
            setMessages([]);
            try {
                await updateSite(cleanFirestoreData(next));
            }
            finally {
                setSaving(false);
            }
            setMessages(["Asset updated successfully."]);
        }
        catch (saveError) {
            setMessages([
                saveError instanceof Error ? saveError.message : "Failed to save asset.",
            ]);
        }
    };
    if (loading) {
        return (_jsx(AppLayout, { title: "Loading asset", children: _jsx(Card, { children: "Loading asset..." }) }));
    }
    if (error) {
        return (_jsx(AppLayout, { title: "Asset error", children: _jsx(Card, { children: error }) }));
    }
    if (!siteFile || !asset) {
        return (_jsx(AppLayout, { title: "Asset not found", children: _jsxs(Card, { children: [_jsx("p", { style: { marginTop: 0 }, children: "The requested asset could not be found." }), _jsx(SecondaryButton, { onClick: () => navigate(siteFile ? `/site/${siteFile.metadata.siteFileId}/assets` : "/"), children: "Back" })] }) }));
    }
    return (_jsx(AppLayout, { title: "Edit Asset", subtitle: `${asset.reference} • ${siteFile.site.name}`, children: _jsxs("div", { style: pageGridStyle, children: [_jsx(Card, { children: _jsxs("div", { style: heroWrapStyle, children: [_jsxs("div", { children: [_jsx("div", { style: eyebrowStyle, children: "ASSET EDITOR" }), _jsx("div", { style: heroTitleStyle, children: asset.reference }), _jsx("div", { style: heroSubStyle, children: "Correct device details, update categorisation, and manage service settings." })] }), _jsx("div", { style: heroBadgeWrapStyle, children: _jsx("span", { style: {
                                        ...statusPillStyle,
                                        background: form.active ? "#dcfce7" : "#f3f4f6",
                                        color: form.active ? "#166534" : "#374151",
                                    }, children: form.active ? "Active" : "Inactive" }) })] }) }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Core Details" }), _jsxs("div", { style: formGridStyle, children: [_jsx(Field, { label: "Reference", children: _jsx("input", { value: form.reference, onChange: (e) => setForm((prev) => ({ ...prev, reference: e.target.value })), style: inputStyle, placeholder: "L1-A01" }) }), _jsxs("div", { style: twoColStyle, children: [_jsx(Field, { label: "Loop", children: _jsx("input", { value: form.loop, onChange: (e) => setForm((prev) => ({ ...prev, loop: e.target.value })), style: inputStyle }) }), _jsx(Field, { label: "Address", children: _jsx("input", { value: form.address, onChange: (e) => setForm((prev) => ({ ...prev, address: e.target.value })), style: inputStyle }) })] }), _jsxs("div", { style: twoColStyle, children: [_jsx(Field, { label: "Zone", children: _jsx("input", { value: form.zone, onChange: (e) => setForm((prev) => ({ ...prev, zone: e.target.value })), style: inputStyle }) }), _jsx(Field, { label: "Category", children: _jsx("select", { value: form.category, onChange: (e) => setForm((prev) => ({
                                                    ...prev,
                                                    category: e.target.value,
                                                })), style: inputStyle, children: CATEGORY_OPTIONS.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) }) })] }), _jsx(Field, { label: "Asset Type", children: _jsx("input", { value: form.assetType, onChange: (e) => setForm((prev) => ({ ...prev, assetType: e.target.value })), style: inputStyle, placeholder: "Optical Detector" }) }), _jsx(Field, { label: "Location", children: _jsx("input", { value: form.locationText, onChange: (e) => setForm((prev) => ({ ...prev, locationText: e.target.value })), style: inputStyle, placeholder: "Entry Lobby / Basement / Riser..." }) }), _jsx(Field, { label: "Description", children: _jsx("input", { value: form.description, onChange: (e) => setForm((prev) => ({ ...prev, description: e.target.value })), style: inputStyle, placeholder: "Description" }) }), _jsx(Field, { label: "Tags", children: _jsx("input", { value: form.tagsText, onChange: (e) => setForm((prev) => ({ ...prev, tagsText: e.target.value })), style: inputStyle, placeholder: "void, attic, mcp" }) })] })] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Service & Status" }), _jsxs("div", { style: toggleGridStyle, children: [_jsx(ToggleRow, { label: "Active Device", description: "Inactive devices remain in the register but are treated as no longer live.", checked: form.active, onChange: (value) => setForm((prev) => ({ ...prev, active: value })) }), _jsx(ToggleRow, { label: "Service Trackable", description: "Include this device in service workflows.", checked: form.serviceTrackable, onChange: (value) => setForm((prev) => ({ ...prev, serviceTrackable: value })) }), _jsx(ToggleRow, { label: "Counts Toward Detection Percentage", description: "Use for automatic detector percentage calculations.", checked: form.countsTowardAutoDetectionPercentage, onChange: (value) => setForm((prev) => ({
                                        ...prev,
                                        countsTowardAutoDetectionPercentage: value,
                                    })) })] })] }), messages.length > 0 && (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Messages" }), _jsx("div", { style: messageListStyle, children: messages.map((message, index) => (_jsx("div", { children: message }, `${message}-${index}`))) })] })), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Actions" }), _jsxs("div", { style: actionGridStyle, children: [_jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/assets/${asset.id}/history`), children: "View History" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/assets`), children: "Back to Assets" }), _jsx(PrimaryButton, { onClick: handleSave, disabled: saving, children: saving ? "Saving..." : "Save Asset" })] })] })] }) }));
}
function ToggleRow({ label, description, checked, onChange, }) {
    return (_jsxs("div", { style: toggleRowStyle, children: [_jsxs("div", { children: [_jsx("div", { style: toggleLabelStyle, children: label }), _jsx("div", { style: toggleDescriptionStyle, children: description })] }), _jsx("button", { type: "button", onClick: () => onChange(!checked), style: checked ? toggleButtonOnStyle : toggleButtonOffStyle, children: _jsx("span", { style: checked ? toggleKnobOnStyle : toggleKnobOffStyle }) })] }));
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
const heroBadgeWrapStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
};
const statusPillStyle = {
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "0.76rem",
    fontWeight: 800,
    whiteSpace: "nowrap",
};
const formGridStyle = {
    display: "grid",
    gap: "12px",
};
const twoColStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const toggleGridStyle = {
    display: "grid",
    gap: "12px",
};
const toggleRowStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    background: "#f8fafc",
    padding: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "14px",
};
const toggleLabelStyle = {
    fontWeight: 800,
    color: "#111827",
};
const toggleDescriptionStyle = {
    marginTop: "4px",
    color: "#6b7280",
    fontSize: "0.9rem",
    lineHeight: 1.4,
};
const toggleButtonOnStyle = {
    width: "56px",
    height: "32px",
    borderRadius: "999px",
    border: "none",
    background: "#16a34a",
    position: "relative",
    cursor: "pointer",
    flexShrink: 0,
};
const toggleButtonOffStyle = {
    ...toggleButtonOnStyle,
    background: "#cbd5e1",
};
const toggleKnobOnStyle = {
    position: "absolute",
    top: "4px",
    left: "28px",
    width: "24px",
    height: "24px",
    borderRadius: "999px",
    background: "#ffffff",
    boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
};
const toggleKnobOffStyle = {
    ...toggleKnobOnStyle,
    left: "4px",
};
const messageListStyle = {
    display: "grid",
    gap: "6px",
    color: "#92400e",
    fontWeight: 700,
};
const actionGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "10px",
};
