import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/ui/pages/SiteNotesPage.tsx
import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { cleanFirestoreData } from "../../utils/cleanFirestoreData";
import { buildSiteCriticalInfoText, emptySiteCriticalInfo, parseSiteCriticalInfo, } from "../utils/siteCriticalInfo";
import { AppLayout } from "../layouts/AppLayout";
import { Card, CardTitle, Field, PrimaryButton, SecondaryButton, inputStyle, textareaStyle, } from "../components/ui";
export function SiteNotesPage() {
    const navigate = useNavigate();
    const { siteFile, updateSite, loading, error } = useFirestoreSite();
    const [form, setForm] = useState(emptySiteCriticalInfo);
    const [saving, setSaving] = useState(false);
    const [messages, setMessages] = useState([]);
    useEffect(() => {
        if (!siteFile)
            return;
        setForm(parseSiteCriticalInfo(siteFile.site.notes));
    }, [siteFile]);
    const handleChange = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };
    const handleSave = async (event) => {
        event.preventDefault();
        if (!siteFile)
            return;
        const next = JSON.parse(JSON.stringify(siteFile));
        const notesText = buildSiteCriticalInfoText(form);
        const now = new Date().toISOString();
        next.site = {
            ...next.site,
            notes: notesText || undefined,
            updatedAt: now,
        };
        next.metadata = {
            ...next.metadata,
            updatedAt: now,
        };
        setSaving(true);
        setMessages([]);
        try {
            await updateSite(cleanFirestoreData(next));
            setMessages(["Site notes saved."]);
        }
        catch (saveError) {
            setMessages([
                saveError instanceof Error ? saveError.message : "Failed to save site notes.",
            ]);
        }
        finally {
            setSaving(false);
        }
    };
    if (loading) {
        return (_jsx(AppLayout, { title: "Loading site notes", children: _jsx(Card, { children: "Loading site notes..." }) }));
    }
    if (error) {
        return (_jsx(AppLayout, { title: "Site notes error", children: _jsx(Card, { children: error }) }));
    }
    if (!siteFile) {
        return (_jsx(AppLayout, { title: "Site notes not found", children: _jsxs(Card, { children: [_jsx("p", { style: { marginTop: 0 }, children: "The requested site could not be found." }), _jsx(SecondaryButton, { onClick: () => navigate("/"), children: "Back to Sites" })] }) }));
    }
    return (_jsxs(AppLayout, { title: "Site Notes / Critical Info", subtitle: `${siteFile.site.name} • ${siteFile.site.siteCode ?? siteFile.site.id}`, children: [_jsxs(Card, { children: [_jsx(CardTitle, { children: "Critical Site Info" }), _jsxs("form", { onSubmit: handleSave, children: [_jsx(Field, { label: "Panel Location", children: _jsx("input", { value: form.panelLocation, onChange: (e) => handleChange("panelLocation", e.target.value), style: inputStyle, placeholder: "Main panel location" }) }), _jsxs("div", { style: twoColStyle, children: [_jsx(Field, { label: "ARC Account Number", children: _jsx("input", { value: form.arcAccountNumber, onChange: (e) => handleChange("arcAccountNumber", e.target.value), style: inputStyle }) }), _jsx(Field, { label: "ARC Name", children: _jsx("input", { value: form.arcName, onChange: (e) => handleChange("arcName", e.target.value), style: inputStyle }) })] }), _jsx(Field, { label: "ARC Phone", children: _jsx("input", { value: form.arcPhone, onChange: (e) => handleChange("arcPhone", e.target.value), style: inputStyle }) }), _jsx(Field, { label: "Repeater Panel Locations", children: _jsx("textarea", { value: form.repeaterPanelLocations, onChange: (e) => handleChange("repeaterPanelLocations", e.target.value), style: textareaStyle, rows: 3 }) }), _jsx(Field, { label: "PSU Locations", children: _jsx("textarea", { value: form.psuLocations, onChange: (e) => handleChange("psuLocations", e.target.value), style: textareaStyle, rows: 3 }) }), _jsx(Field, { label: "Expander Locations", children: _jsx("textarea", { value: form.expanderLocations, onChange: (e) => handleChange("expanderLocations", e.target.value), style: textareaStyle, rows: 3 }) }), _jsx(Field, { label: "Communicator Location", children: _jsx("input", { value: form.communicatorLocation, onChange: (e) => handleChange("communicatorLocation", e.target.value), style: inputStyle }) }), _jsx(Field, { label: "Entry Instructions", children: _jsx("textarea", { value: form.entryInstructions, onChange: (e) => handleChange("entryInstructions", e.target.value), style: textareaStyle, rows: 3 }) }), _jsxs("div", { style: twoColStyle, children: [_jsx(Field, { label: "Out Of Hours Access", children: _jsx("textarea", { value: form.outOfHoursAccess, onChange: (e) => handleChange("outOfHoursAccess", e.target.value), style: textareaStyle, rows: 3 }) }), _jsx(Field, { label: "Key Location", children: _jsx("textarea", { value: form.keyLocation, onChange: (e) => handleChange("keyLocation", e.target.value), style: textareaStyle, rows: 3 }) })] }), _jsxs("div", { style: twoColStyle, children: [_jsx(Field, { label: "Isolation Procedure", children: _jsx("textarea", { value: form.isolationProcedure, onChange: (e) => handleChange("isolationProcedure", e.target.value), style: textareaStyle, rows: 3 }) }), _jsx(Field, { label: "Reset Procedure", children: _jsx("textarea", { value: form.resetProcedure, onChange: (e) => handleChange("resetProcedure", e.target.value), style: textareaStyle, rows: 3 }) })] }), _jsxs("div", { style: twoColStyle, children: [_jsx(Field, { label: "Zone Chart Location", children: _jsx("input", { value: form.zoneChartLocation, onChange: (e) => handleChange("zoneChartLocation", e.target.value), style: inputStyle }) }), _jsx(Field, { label: "As Fitted Drawing Location", children: _jsx("input", { value: form.asFittedDrawingLocation, onChange: (e) => handleChange("asFittedDrawingLocation", e.target.value), style: inputStyle }) })] }), _jsx(Field, { label: "Special Risks", children: _jsx("textarea", { value: form.specialRisks, onChange: (e) => handleChange("specialRisks", e.target.value), style: textareaStyle, rows: 4 }) }), _jsx(Field, { label: "Known Fault History", children: _jsx("textarea", { value: form.knownFaultHistory, onChange: (e) => handleChange("knownFaultHistory", e.target.value), style: textareaStyle, rows: 4 }) }), _jsx(Field, { label: "Client Service Notes", children: _jsx("textarea", { value: form.clientServiceNotes, onChange: (e) => handleChange("clientServiceNotes", e.target.value), style: textareaStyle, rows: 4 }) }), _jsx(Field, { label: "General Notes", children: _jsx("textarea", { value: form.generalNotes, onChange: (e) => handleChange("generalNotes", e.target.value), style: textareaStyle, rows: 5 }) }), _jsxs("div", { style: buttonGridStyle, children: [_jsx(SecondaryButton, { type: "button", onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/overview`), children: "Back to Overview" }), _jsx(PrimaryButton, { type: "submit", disabled: saving, children: saving ? "Saving..." : "Save Site Notes" })] })] })] }), messages.length > 0 && (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Messages" }), _jsx("div", { style: { display: "grid", gap: "6px", color: "#1e3a8a" }, children: messages.map((message, index) => (_jsx("div", { children: message }, `${message}-${index}`))) })] }))] }));
}
const twoColStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const buttonGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginTop: "14px",
};
