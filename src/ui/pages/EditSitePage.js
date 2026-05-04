import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { cleanFirestoreData } from "../../utils/cleanFirestoreData";
import { AppLayout } from "../layouts/AppLayout";
import { Card, CardTitle, Field, PrimaryButton, SecondaryButton, inputStyle, } from "../components/ui";
function nowIso() {
    return new Date().toISOString();
}
export function EditSitePage() {
    const navigate = useNavigate();
    const { siteFile, updateSite, loading, error } = useFirestoreSite();
    const [form, setForm] = useState({
        name: "",
        siteCode: "",
        clientName: "",
        addressLine1: "",
        city: "",
        county: "",
        country: "Ireland",
    });
    const [messages, setMessages] = useState([]);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (!siteFile)
            return;
        setForm({
            name: siteFile.site.name || "",
            siteCode: siteFile.site.siteCode || "",
            clientName: siteFile.site.clientName || "",
            addressLine1: typeof siteFile.site.address === "object"
                ? siteFile.site.address?.line1 || ""
                : "",
            city: typeof siteFile.site.address === "object"
                ? siteFile.site.address?.city || ""
                : "",
            county: typeof siteFile.site.address === "object"
                ? siteFile.site.address?.county || ""
                : "",
            country: typeof siteFile.site.address === "object"
                ? siteFile.site.address?.country || "Ireland"
                : "Ireland",
        });
    }, [siteFile]);
    const handleSave = async () => {
        if (!siteFile)
            return;
        if (!form.name.trim()) {
            setMessages(["Site name is required."]);
            return;
        }
        try {
            setSaving(true);
            const next = JSON.parse(JSON.stringify(siteFile));
            next.site.name = form.name.trim();
            next.site.siteCode = form.siteCode.trim() || undefined;
            next.site.clientName = form.clientName.trim() || undefined;
            next.site.address = {
                line1: form.addressLine1,
                city: form.city,
                county: form.county,
                country: form.country,
            };
            next.site.updatedAt = nowIso();
            next.metadata.updatedAt = nowIso();
            await updateSite(cleanFirestoreData(next));
            setMessages(["Site details updated successfully."]);
        }
        catch (err) {
            setMessages([
                err instanceof Error ? err.message : "Failed to update site.",
            ]);
        }
        finally {
            setSaving(false);
        }
    };
    if (loading) {
        return (_jsx(AppLayout, { title: "Loading site", children: _jsx(Card, { children: "Loading site..." }) }));
    }
    if (error) {
        return (_jsx(AppLayout, { title: "Error", children: _jsx(Card, { children: error }) }));
    }
    if (!siteFile) {
        return (_jsx(AppLayout, { title: "Not Found", children: _jsxs(Card, { children: [_jsx("p", { children: "Site not found." }), _jsx(SecondaryButton, { onClick: () => navigate("/"), children: "Back to Sites" })] }) }));
    }
    return (_jsx(AppLayout, { title: "Edit Site", subtitle: `${siteFile.site.name}`, children: _jsxs("div", { style: pageGridStyle, children: [_jsx(Card, { children: _jsx("div", { style: heroWrapStyle, children: _jsxs("div", { children: [_jsx("div", { style: eyebrowStyle, children: "SITE SETTINGS" }), _jsx("div", { style: heroTitleStyle, children: "Edit Site Details" }), _jsx("div", { style: heroSubStyle, children: "Update core site information, client details, and address." })] }) }) }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Basic Information" }), _jsxs("div", { style: formGrid, children: [_jsx(Field, { label: "Site Name", children: _jsx("input", { value: form.name, onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })), style: inputStyle }) }), _jsx(Field, { label: "Site Reference", children: _jsx("input", { value: form.siteCode, onChange: (e) => setForm((f) => ({ ...f, siteCode: e.target.value })), style: inputStyle }) }), _jsx(Field, { label: "Client Name", children: _jsx("input", { value: form.clientName, onChange: (e) => setForm((f) => ({ ...f, clientName: e.target.value })), style: inputStyle }) })] })] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Address" }), _jsxs("div", { style: formGrid, children: [_jsx(Field, { label: "Address Line", children: _jsx("input", { value: form.addressLine1, onChange: (e) => setForm((f) => ({ ...f, addressLine1: e.target.value })), style: inputStyle }) }), _jsx(Field, { label: "Town / City", children: _jsx("input", { value: form.city, onChange: (e) => setForm((f) => ({ ...f, city: e.target.value })), style: inputStyle }) }), _jsx(Field, { label: "County", children: _jsx("input", { value: form.county, onChange: (e) => setForm((f) => ({ ...f, county: e.target.value })), style: inputStyle }) }), _jsx(Field, { label: "Country", children: _jsx("input", { value: form.country, onChange: (e) => setForm((f) => ({ ...f, country: e.target.value })), style: inputStyle }) })] })] }), messages.length > 0 && (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Status" }), _jsx("div", { style: messageStyle, children: messages.map((m, i) => (_jsx("div", { children: m }, i))) })] })), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Actions" }), _jsxs("div", { style: actionGrid, children: [_jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/overview`), children: "Cancel" }), _jsx(PrimaryButton, { onClick: handleSave, disabled: saving, children: saving ? "Saving…" : "Save Changes" })] })] })] }) }));
}
/* STYLES */
const pageGridStyle = {
    display: "grid",
    gap: "14px",
};
const heroWrapStyle = {
    display: "flex",
};
const eyebrowStyle = {
    fontSize: "0.75rem",
    fontWeight: 800,
    color: "#6b7280",
};
const heroTitleStyle = {
    fontSize: "1.4rem",
    fontWeight: 800,
    marginTop: "4px",
};
const heroSubStyle = {
    fontSize: "0.9rem",
    color: "#6b7280",
    marginTop: "4px",
};
const formGrid = {
    display: "grid",
    gap: "12px",
};
const actionGrid = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const messageStyle = {
    color: "#166534",
    fontWeight: 600,
};
