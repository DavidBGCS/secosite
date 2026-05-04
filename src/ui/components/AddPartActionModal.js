import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useAuth } from "../../app/context/AuthContext";
import { cleanFirestoreData } from "../../utils/cleanFirestoreData";
import { CardTitle, Field, PrimaryButton, SecondaryButton, inputStyle, textareaStyle, } from "./ui";
import { PART_ACTION_OPTIONS, PART_CATEGORY_OPTIONS, PART_DISCIPLINE_OPTIONS, PART_SOURCE_OPTIONS, } from "../../core/types/parts";
function makeId(prefix = "id") {
    if (globalThis.crypto?.randomUUID) {
        return `${prefix}-${globalThis.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function nowIso() {
    return new Date().toISOString();
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
function buildInstalledPartKey(input) {
    return [
        input.discipline.trim().toLowerCase(),
        input.title.trim().toLowerCase(),
        (input.manufacturer ?? "").trim().toLowerCase(),
        (input.partCode ?? "").trim().toLowerCase(),
        (input.locationText ?? "").trim().toLowerCase(),
        (input.linkedAssetReference ?? "").trim().toLowerCase(),
    ].join("|");
}
export function AddPartActionModal({ siteFile, activeVisit, updateSite, onClose, onSaved, }) {
    const { user } = useAuth();
    const [discipline, setDiscipline] = useState(activeVisit?.discipline ?? "fire-alarm");
    const [actionType, setActionType] = useState("add");
    const [title, setTitle] = useState("");
    const [manufacturer, setManufacturer] = useState("");
    const [partCode, setPartCode] = useState("");
    const [category, setCategory] = useState("");
    const [quantity, setQuantity] = useState("1");
    const [locationText, setLocationText] = useState("");
    const [linkedAssetReference, setLinkedAssetReference] = useState("");
    const [sourceType, setSourceType] = useState("van-stock");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [messages, setMessages] = useState([]);
    const engineerName = useMemo(() => {
        return activeVisit?.engineerName || getEngineerNameFromUser(user);
    }, [activeVisit?.engineerName, user]);
    const linkedAsset = useMemo(() => {
        const ref = linkedAssetReference.trim().toLowerCase();
        if (!ref)
            return undefined;
        return siteFile.assets.find((asset) => asset.reference?.trim().toLowerCase() === ref);
    }, [siteFile.assets, linkedAssetReference]);
    const categoryOptions = useMemo(() => {
        return PART_CATEGORY_OPTIONS[discipline] ?? ["other"];
    }, [discipline]);
    const handleSave = async () => {
        const cleanTitle = title.trim();
        const cleanManufacturer = manufacturer.trim();
        const cleanPartCode = partCode.trim();
        const cleanLocation = locationText.trim();
        const cleanLinkedRef = linkedAssetReference.trim();
        const cleanNote = note.trim();
        const parsedQuantity = Number(quantity);
        if (!engineerName) {
            setMessages(["Engineer name could not be determined from login."]);
            return;
        }
        if (!cleanTitle) {
            setMessages(["Part name is required."]);
            return;
        }
        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
            setMessages(["Quantity must be greater than zero."]);
            return;
        }
        try {
            setSaving(true);
            setMessages([]);
            const next = JSON.parse(JSON.stringify(siteFile));
            next.installedParts = next.installedParts ?? [];
            next.partActions = next.partActions ?? [];
            const actionId = makeId("part-action");
            const now = nowIso();
            const action = {
                id: actionId,
                siteId: siteFile.site.id,
                visitId: activeVisit?.id,
                discipline,
                actionType,
                engineerName,
                engineerUserId: user?.uid,
                title: cleanTitle,
                manufacturer: cleanManufacturer || undefined,
                partCode: cleanPartCode || undefined,
                category: category || undefined,
                quantity: parsedQuantity,
                locationText: cleanLocation || undefined,
                linkedAssetId: linkedAsset?.id,
                linkedAssetReference: cleanLinkedRef || undefined,
                sourceType,
                note: cleanNote || undefined,
                createdAt: now,
            };
            next.partActions.unshift(action);
            const installedKey = buildInstalledPartKey({
                discipline,
                title: cleanTitle,
                manufacturer: cleanManufacturer,
                partCode: cleanPartCode,
                locationText: cleanLocation,
                linkedAssetReference: cleanLinkedRef,
            });
            const existingInstalled = next.installedParts.find((item) => {
                const itemKey = buildInstalledPartKey({
                    discipline: item.discipline,
                    title: item.title,
                    manufacturer: item.manufacturer,
                    partCode: item.partCode,
                    locationText: item.locationText,
                    linkedAssetReference: item.linkedAssetReference,
                });
                return itemKey === installedKey;
            });
            const delta = actionType === "remove" || actionType === "return"
                ? -parsedQuantity
                : parsedQuantity;
            if (existingInstalled) {
                existingInstalled.quantity = Math.max(0, existingInstalled.quantity + delta);
                existingInstalled.status =
                    actionType === "temporary-add"
                        ? "temporary"
                        : existingInstalled.quantity <= 0
                            ? "removed"
                            : "installed";
                existingInstalled.notes = cleanNote || existingInstalled.notes;
                existingInstalled.lastActionId = actionId;
                existingInstalled.updatedAt = now;
            }
            else {
                const initialQuantity = Math.max(0, delta);
                next.installedParts.unshift({
                    id: makeId("installed-part"),
                    siteId: siteFile.site.id,
                    discipline,
                    title: cleanTitle,
                    manufacturer: cleanManufacturer || undefined,
                    partCode: cleanPartCode || undefined,
                    category: category || undefined,
                    quantity: initialQuantity,
                    locationText: cleanLocation || undefined,
                    linkedAssetId: linkedAsset?.id,
                    linkedAssetReference: cleanLinkedRef || undefined,
                    status: actionType === "temporary-add"
                        ? "temporary"
                        : initialQuantity <= 0
                            ? "removed"
                            : "installed",
                    notes: cleanNote || undefined,
                    createdAt: now,
                    updatedAt: now,
                    lastActionId: actionId,
                });
            }
            next.metadata.updatedAt = now;
            await updateSite(cleanFirestoreData(next));
            onSaved?.();
            onClose();
        }
        catch (saveError) {
            setMessages([
                saveError instanceof Error
                    ? saveError.message
                    : "Failed to save part action.",
            ]);
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx("div", { style: overlayStyle, children: _jsxs("div", { style: modalStyle, children: [_jsxs("div", { style: headerStyle, children: [_jsxs("div", { children: [_jsx("div", { style: kickerStyle, children: "SITE PARTS" }), _jsx(CardTitle, { children: "Add Part Action" })] }), _jsx("button", { type: "button", onClick: onClose, style: closeButtonStyle, children: "\u2715" })] }), _jsxs("div", { style: contentStyle, children: [_jsx(Field, { label: "Discipline", children: _jsx("select", { value: discipline, onChange: (e) => {
                                    setDiscipline(e.target.value);
                                    setCategory("");
                                }, style: inputStyle, children: PART_DISCIPLINE_OPTIONS.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) }) }), _jsx(Field, { label: "Action Type", children: _jsx("select", { value: actionType, onChange: (e) => setActionType(e.target.value), style: inputStyle, children: PART_ACTION_OPTIONS.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) }) }), _jsx(Field, { label: "Engineer", children: _jsx("input", { value: engineerName, disabled: true, style: inputStyle }) }), _jsxs("div", { style: twoColStyle, children: [_jsx(Field, { label: "Part Name", children: _jsx("input", { value: title, onChange: (e) => setTitle(e.target.value), style: inputStyle, placeholder: "Optical Detector / PIR / Camera / Reader..." }) }), _jsxs(Field, { label: "Quantity", children: [_jsxs("div", { style: quantityWrapStyle, children: [_jsx("button", { type: "button", onClick: () => setQuantity((prev) => String(Math.max(1, Number(prev || "1") - 1))), style: qtyButtonStyle, children: "\u2212" }), _jsx("input", { value: quantity, onChange: (e) => setQuantity(e.target.value.replace(/[^\d]/g, "")), inputMode: "numeric", style: { ...inputStyle, textAlign: "center" } }), _jsx("button", { type: "button", onClick: () => setQuantity((prev) => String(Number(prev || "0") + 1)), style: qtyButtonStyle, children: "+" })] }), _jsx("div", { style: quickQtyStyle, children: [1, 5, 10].map((value) => (_jsx("button", { type: "button", onClick: () => setQuantity(String(value)), style: quickQtyButtonStyle, children: value }, value))) })] })] }), _jsxs("div", { style: twoColStyle, children: [_jsx(Field, { label: "Category", children: _jsxs("select", { value: category, onChange: (e) => setCategory(e.target.value), style: inputStyle, children: [_jsx("option", { value: "", children: "Select category" }), categoryOptions.map((option) => (_jsx("option", { value: option, children: option }, option)))] }) }), _jsx(Field, { label: "Source", children: _jsx("select", { value: sourceType, onChange: (e) => setSourceType(e.target.value), style: inputStyle, children: PART_SOURCE_OPTIONS.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) }) })] }), _jsxs("div", { style: twoColStyle, children: [_jsx(Field, { label: "Manufacturer", children: _jsx("input", { value: manufacturer, onChange: (e) => setManufacturer(e.target.value), style: inputStyle, placeholder: "Manufacturer" }) }), _jsx(Field, { label: "Part Code", children: _jsx("input", { value: partCode, onChange: (e) => setPartCode(e.target.value), style: inputStyle, placeholder: "Part code" }) })] }), _jsxs("div", { style: twoColStyle, children: [_jsx(Field, { label: "Location", children: _jsx("input", { value: locationText, onChange: (e) => setLocationText(e.target.value), style: inputStyle, placeholder: "Room / riser / corridor / cabinet..." }) }), _jsx(Field, { label: "Linked Asset Ref", children: _jsx("input", { value: linkedAssetReference, onChange: (e) => setLinkedAssetReference(e.target.value), style: inputStyle, placeholder: "L1-A11" }) })] }), _jsx(Field, { label: "Note", children: _jsx("textarea", { value: note, onChange: (e) => setNote(e.target.value), style: textareaStyle, rows: 4, placeholder: "Optional note about where or why this part was used..." }) }), messages.length > 0 ? (_jsx("div", { style: messageBoxStyle, children: messages.map((message, index) => (_jsx("div", { children: message }, `${message}-${index}`))) })) : null] }), _jsxs("div", { style: actionsStyle, children: [_jsx(SecondaryButton, { onClick: onClose, style: actionButtonStyle, children: "Cancel" }), _jsx(PrimaryButton, { onClick: handleSave, disabled: saving, style: actionButtonStyle, children: saving ? "Saving..." : "Save Part Action" })] })] }) }));
}
const overlayStyle = {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    background: "rgba(2,6,23,0.66)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
};
const modalStyle = {
    width: "100%",
    maxWidth: "760px",
    maxHeight: "90vh",
    overflow: "auto",
    borderRadius: "24px",
    background: "#ffffff",
    boxShadow: "0 28px 60px rgba(2,6,23,0.32)",
    display: "grid",
    gap: "16px",
    padding: "20px",
};
const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: "12px",
};
const kickerStyle = {
    fontSize: "0.74rem",
    fontWeight: 800,
    letterSpacing: "0.1em",
    color: "#475569",
    marginBottom: "6px",
};
const closeButtonStyle = {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontSize: "1rem",
    flexShrink: 0,
};
const contentStyle = {
    display: "grid",
    gap: "12px",
};
const twoColStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const quantityWrapStyle = {
    display: "grid",
    gridTemplateColumns: "48px 1fr 48px",
    gap: "8px",
    alignItems: "center",
};
const qtyButtonStyle = {
    height: "52px",
    borderRadius: "14px",
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontSize: "1.2rem",
    fontWeight: 800,
};
const quickQtyStyle = {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
};
const quickQtyButtonStyle = {
    padding: "6px 10px",
    borderRadius: "999px",
    border: "1px solid #d1d5db",
    background: "#f8fafc",
    color: "#111827",
    cursor: "pointer",
    fontSize: "0.82rem",
    fontWeight: 700,
};
const messageBoxStyle = {
    display: "grid",
    gap: "6px",
    padding: "12px",
    borderRadius: "16px",
    background: "#fff7ed",
    border: "1px solid #fdba74",
    color: "#9a3412",
    fontWeight: 700,
};
const actionsStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const actionButtonStyle = {
    minHeight: "54px",
};
