import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/ui/pages/DisciplineProfilesPage.tsx
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { AppLayout } from "../layouts/AppLayout";
import { Card, CardTitle, Field, PrimaryButton, SecondaryButton, inputStyle, textareaStyle, } from "../components/ui";
function makeId(prefix = "id") {
    if (globalThis.crypto?.randomUUID) {
        return `${prefix}-${globalThis.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function nowIso() {
    return new Date().toISOString();
}
const defaultForm = {
    discipline: "fire-alarm",
    systemId: "",
    panelMake: "",
    panelModel: "",
    systemType: "",
    zonesLoopsSummary: "",
    maintainedBy: "",
    serviceInterval: "quarterly",
    visitsPerYear: "4",
    notes: "",
};
export function DisciplineProfilesPage() {
    const navigate = useNavigate();
    const { siteFile, updateSite, loading, error } = useFirestoreSite();
    const [showForm, setShowForm] = useState(false);
    const [editingProfileId, setEditingProfileId] = useState(null);
    const [form, setForm] = useState(defaultForm);
    const [messages, setMessages] = useState([]);
    const [saving, setSaving] = useState(false);
    if (loading) {
        return (_jsx(AppLayout, { title: "Loading profiles", children: _jsx(Card, { children: "Loading profiles..." }) }));
    }
    if (error) {
        return (_jsx(AppLayout, { title: "Profiles error", children: _jsx(Card, { children: error }) }));
    }
    if (!siteFile) {
        return (_jsx(AppLayout, { title: "Profiles not found", children: _jsxs(Card, { children: [_jsx("p", { style: { marginTop: 0 }, children: "The requested site could not be found." }), _jsx(SecondaryButton, { onClick: () => navigate("/"), children: "Back to Sites" })] }) }));
    }
    const persistSiteFile = async (next) => {
        setSaving(true);
        try {
            await updateSite({
                ...next,
                metadata: {
                    ...next.metadata,
                    updatedAt: nowIso(),
                },
            });
        }
        finally {
            setSaving(false);
        }
    };
    const startNewProfile = () => {
        setEditingProfileId(null);
        setForm(defaultForm);
        setShowForm(true);
        setMessages([]);
    };
    const startEditProfile = (profile) => {
        setEditingProfileId(profile.id);
        setForm({
            discipline: profile.discipline,
            systemId: profile.systemId ?? "",
            panelMake: profile.panelMake ?? "",
            panelModel: profile.panelModel ?? "",
            systemType: profile.systemType ?? "",
            zonesLoopsSummary: profile.zonesLoopsSummary ?? "",
            maintainedBy: profile.maintainedBy ?? "",
            serviceInterval: profile.serviceInterval,
            visitsPerYear: String(profile.visitsPerYear ?? 1),
            notes: profile.notes ?? "",
        });
        setShowForm(true);
        setMessages([]);
    };
    const handleSaveProfile = async (event) => {
        event.preventDefault();
        const visitsPerYear = Number(form.visitsPerYear);
        if (!Number.isFinite(visitsPerYear) || visitsPerYear <= 0) {
            setMessages(["Visits per year must be greater than zero."]);
            return;
        }
        try {
            const next = JSON.parse(JSON.stringify(siteFile));
            const now = nowIso();
            const existing = editingProfileId
                ? next.disciplineProfiles.find((item) => item.id === editingProfileId)
                : undefined;
            const profile = {
                ...(existing ?? {
                    id: makeId("discipline"),
                    siteId: siteFile.site.id,
                    createdAt: now,
                }),
                discipline: form.discipline,
                systemId: form.systemId || undefined,
                panelMake: form.panelMake.trim() || undefined,
                panelModel: form.panelModel.trim() || undefined,
                systemType: form.systemType.trim() || undefined,
                zonesLoopsSummary: form.zonesLoopsSummary.trim() || undefined,
                maintainedBy: form.maintainedBy.trim() || undefined,
                serviceInterval: form.serviceInterval,
                visitsPerYear,
                notes: form.notes.trim() || undefined,
                updatedAt: now,
            };
            if (editingProfileId) {
                next.disciplineProfiles = next.disciplineProfiles.map((item) => item.id === editingProfileId ? profile : item);
            }
            else {
                next.disciplineProfiles.unshift(profile);
            }
            await persistSiteFile(next);
            setMessages([editingProfileId ? "Profile updated." : "Profile added."]);
            setShowForm(false);
            setEditingProfileId(null);
            setForm(defaultForm);
        }
        catch (saveError) {
            setMessages([
                saveError instanceof Error ? saveError.message : "Failed to save profile.",
            ]);
        }
    };
    const handleDeleteProfile = async (profileId) => {
        const confirmed = window.confirm("Delete this discipline profile?");
        if (!confirmed)
            return;
        try {
            const next = JSON.parse(JSON.stringify(siteFile));
            next.disciplineProfiles = next.disciplineProfiles.filter((item) => item.id !== profileId);
            await persistSiteFile(next);
            setMessages(["Profile deleted."]);
        }
        catch (deleteError) {
            setMessages([
                deleteError instanceof Error ? deleteError.message : "Failed to delete profile.",
            ]);
        }
    };
    return (_jsxs(AppLayout, { title: "Systems / Profiles", subtitle: `${siteFile.site.name} • ${siteFile.disciplineProfiles.length} profiles`, children: [_jsxs(Card, { children: [_jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }, children: [_jsx(PrimaryButton, { onClick: startNewProfile, children: "Add Profile" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/overview`), children: "Overview" })] }), saving ? _jsx("div", { style: { color: "#6b7280", marginTop: "10px" }, children: "Saving..." }) : null] }), messages.length > 0 && (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Messages" }), _jsx("div", { style: { display: "grid", gap: "6px", color: "#1e3a8a" }, children: messages.map((message, index) => (_jsx("div", { children: message }, `${message}-${index}`))) })] })), showForm && (_jsxs(Card, { children: [_jsx(CardTitle, { children: editingProfileId ? "Edit Profile" : "Add Discipline Profile" }), _jsxs("form", { onSubmit: handleSaveProfile, children: [_jsxs("div", { style: twoColStyle, children: [_jsx(Field, { label: "Discipline", children: _jsxs("select", { value: form.discipline, onChange: (e) => setForm((prev) => ({
                                                ...prev,
                                                discipline: e.target.value,
                                            })), style: inputStyle, children: [_jsx("option", { value: "fire-alarm", children: "Fire Alarm" }), _jsx("option", { value: "emergency-lighting", children: "Emergency Lighting" }), _jsx("option", { value: "intruder-alarm", children: "Intruder Alarm" }), _jsx("option", { value: "cctv", children: "CCTV" }), _jsx("option", { value: "access-control", children: "Access Control" }), _jsx("option", { value: "other", children: "Other" })] }) }), _jsx(Field, { label: "Linked System", children: _jsxs("select", { value: form.systemId, onChange: (e) => setForm((prev) => ({ ...prev, systemId: e.target.value })), style: inputStyle, children: [_jsx("option", { value: "", children: "None" }), siteFile.systems.map((system) => (_jsx("option", { value: system.id, children: system.name }, system.id)))] }) })] }), _jsxs("div", { style: twoColStyle, children: [_jsx(Field, { label: "Panel Make", children: _jsx("input", { value: form.panelMake, onChange: (e) => setForm((prev) => ({ ...prev, panelMake: e.target.value })), style: inputStyle }) }), _jsx(Field, { label: "Panel Model", children: _jsx("input", { value: form.panelModel, onChange: (e) => setForm((prev) => ({ ...prev, panelModel: e.target.value })), style: inputStyle }) })] }), _jsxs("div", { style: twoColStyle, children: [_jsx(Field, { label: "System Type", children: _jsx("input", { value: form.systemType, onChange: (e) => setForm((prev) => ({ ...prev, systemType: e.target.value })), style: inputStyle, placeholder: "Addressable, conventional, IP, etc." }) }), _jsx(Field, { label: "Maintained By", children: _jsx("input", { value: form.maintainedBy, onChange: (e) => setForm((prev) => ({ ...prev, maintainedBy: e.target.value })), style: inputStyle }) })] }), _jsxs("div", { style: twoColStyle, children: [_jsx(Field, { label: "Service Interval", children: _jsxs("select", { value: form.serviceInterval, onChange: (e) => setForm((prev) => ({
                                                ...prev,
                                                serviceInterval: e.target.value,
                                            })), style: inputStyle, children: [_jsx("option", { value: "quarterly", children: "Quarterly" }), _jsx("option", { value: "bi-yearly", children: "Bi-Yearly" }), _jsx("option", { value: "annual", children: "Annual" }), _jsx("option", { value: "custom", children: "Custom" })] }) }), _jsx(Field, { label: "Visits Per Year", children: _jsx("input", { type: "number", min: "1", value: form.visitsPerYear, onChange: (e) => setForm((prev) => ({ ...prev, visitsPerYear: e.target.value })), style: inputStyle }) })] }), _jsx(Field, { label: "Zones / Loops Summary", children: _jsx("textarea", { value: form.zonesLoopsSummary, onChange: (e) => setForm((prev) => ({ ...prev, zonesLoopsSummary: e.target.value })), rows: 3, style: textareaStyle }) }), _jsx(Field, { label: "Notes", children: _jsx("textarea", { value: form.notes, onChange: (e) => setForm((prev) => ({ ...prev, notes: e.target.value })), rows: 4, style: textareaStyle }) }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }, children: [_jsx(SecondaryButton, { type: "button", onClick: () => {
                                            setShowForm(false);
                                            setEditingProfileId(null);
                                            setForm(defaultForm);
                                        }, disabled: saving, children: "Cancel" }), _jsx(PrimaryButton, { type: "submit", disabled: saving, children: "Save Profile" })] })] })] })), siteFile.disciplineProfiles.length === 0 ? (_jsx(Card, { children: _jsx("p", { style: { margin: 0, color: "#6b7280" }, children: "No profiles yet. Add a discipline profile to define the system and service regime." }) })) : (siteFile.disciplineProfiles.map((profile) => {
                const linkedSystem = profile.systemId
                    ? siteFile.systems.find((system) => system.id === profile.systemId)
                    : undefined;
                return (_jsxs(Card, { children: [_jsx(CardTitle, { children: profile.discipline }), _jsxs("div", { style: { display: "grid", gap: "6px", color: "#374151", marginBottom: "12px" }, children: [_jsxs("div", { children: [_jsx("strong", { children: "Panel:" }), " ", profile.panelMake ?? "—", " ", profile.panelModel ?? ""] }), _jsxs("div", { children: [_jsx("strong", { children: "System Type:" }), " ", profile.systemType ?? "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Linked System:" }), " ", linkedSystem?.name ?? "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Maintained By:" }), " ", profile.maintainedBy ?? "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Service Interval:" }), " ", profile.serviceInterval] }), _jsxs("div", { children: [_jsx("strong", { children: "Visits / Year:" }), " ", profile.visitsPerYear] }), profile.zonesLoopsSummary ? (_jsxs("div", { children: [_jsx("strong", { children: "Zones / Loops:" }), " ", profile.zonesLoopsSummary] })) : null, profile.notes ? (_jsxs("div", { children: [_jsx("strong", { children: "Notes:" }), " ", profile.notes] })) : null] }), _jsxs("div", { style: { display: "grid", gap: "10px" }, children: [_jsx(SecondaryButton, { onClick: () => startEditProfile(profile), disabled: saving, children: "Edit" }), _jsx(SecondaryButton, { style: { border: "1px solid #ef4444", color: "#b91c1c" }, onClick: () => handleDeleteProfile(profile.id), disabled: saving, children: "Delete" })] })] }, profile.id));
            }))] }));
}
const twoColStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
