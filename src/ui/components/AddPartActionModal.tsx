import { useMemo, useState } from "react";
import { useAuth } from "../../app/context/AuthContext";
import type { SiteFile, VisitRecord } from "../../core";
import { cleanFirestoreData } from "../../utils/cleanFirestoreData";
import { useStockItems } from "../../app/hooks/useStockItems";
import {
  CardTitle,
  Field,
  PrimaryButton,
  SecondaryButton,
  inputStyle,
  textareaStyle,
} from "./ui";
import type {
  InstalledPartRecord,
  PartActionRecord,
  PartActionType,
  PartDiscipline,
  PartSourceType,
} from "../../core/types/parts";
import {
  PART_ACTION_OPTIONS,
  PART_DISCIPLINE_OPTIONS,
  PART_SOURCE_OPTIONS,
} from "../../core/types/parts";

type SiteFileWithParts = SiteFile & {
  installedParts?: InstalledPartRecord[];
  partActions?: PartActionRecord[];
};

type Props = {
  siteFile: SiteFileWithParts;
  activeVisit?: VisitRecord;
  updateSite: (next: unknown) => Promise<void>;
  onClose: () => void;
  onSaved?: () => void;
};

function makeId(prefix = "id"): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function getEngineerNameFromUser(
  user: { displayName?: string | null; email?: string | null } | null
): string {
  if (!user) return "";
  if (user.displayName?.trim()) return user.displayName.trim();
  if (user.email?.trim()) return user.email.split("@")[0];
  return "";
}

export function AddPartActionModal({
  siteFile,
  activeVisit,
  updateSite,
  onClose,
  onSaved,
}: Props) {
  const { user } = useAuth();
  const { items, loading: loadingStockItems } = useStockItems();

  const [discipline, setDiscipline] = useState<PartDiscipline>(
    (activeVisit?.discipline as PartDiscipline) ?? "fire-alarm"
  );
  const [actionType, setActionType] = useState<PartActionType>("add");

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");

  const [title, setTitle] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [partCode, setPartCode] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState<string>("1");
  const [locationText, setLocationText] = useState("");
  const [linkedAssetReference, setLinkedAssetReference] = useState("");
  const [sourceType, setSourceType] = useState<PartSourceType>("van-stock");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [manualMode, setManualMode] = useState(false);

  const engineerName = useMemo(() => {
    return activeVisit?.engineerName || getEngineerNameFromUser(user);
  }, [activeVisit?.engineerName, user]);

  const linkedAsset = useMemo(() => {
    const ref = linkedAssetReference.trim().toLowerCase();
    if (!ref) return undefined;
    return siteFile.assets.find(
      (asset) => asset.reference?.trim().toLowerCase() === ref
    );
  }, [siteFile.assets, linkedAssetReference]);

  const stockCategories = useMemo(() => {
    return [
      ...new Set(
        items
          .map((item) => item.category)
          .filter((value): value is string => Boolean(value))
      ),
    ].sort();
  }, [items]);

  const stockSubcategories = useMemo(() => {
    return [
      ...new Set(
        items
          .filter((item) => item.category === selectedCategory)
          .map((item) => item.subcategory)
          .filter((value): value is string => Boolean(value))
      ),
    ].sort();
  }, [items, selectedCategory]);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (selectedCategory && item.category !== selectedCategory) return false;
        if (selectedSubcategory && item.subcategory !== selectedSubcategory) return false;
        return true;
      })
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [items, selectedCategory, selectedSubcategory]);

  const selectedStockItem = useMemo(() => {
    return items.find((item) => item.id === selectedItemId);
  }, [items, selectedItemId]);

  const visitLabel = activeVisit
    ? `${activeVisit.visitType}${
        activeVisit.serviceColumnKey
          ? ` • ${activeVisit.serviceColumnKey.toUpperCase()}`
          : ""
      }`
    : "No active visit";

  const handleSelectStockItem = (id: string) => {
    setSelectedItemId(id);

    const selected = items.find((item) => item.id === id);
    if (!selected) return;

    setTitle(selected.name || "");
    setManufacturer(selected.manufacturer || "");
    setPartCode(selected.code || "");
    setCategory(selected.category || "");
    setDiscipline((selected.category || "").toLowerCase().includes("access")
      ? "access-control"
      : (selected.category || "").toLowerCase().includes("fire")
        ? "fire-alarm"
        : (selected.category || "").toLowerCase().includes("intruder")
          ? "intruder-alarm"
          : (selected.category || "").toLowerCase().includes("cctv")
            ? "cctv"
            : discipline
    );
  };

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

    if (!manualMode && !selectedStockItem) {
      setMessages(["Please select a stock item, or use Manual Part."]);
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

      const next: SiteFileWithParts = JSON.parse(JSON.stringify(siteFile));
      next.partActions = next.partActions ?? [];
      next.installedParts = next.installedParts ?? [];

      const actionId = makeId("part-action");
      const now = nowIso();

      const action: PartActionRecord & {
        stockItemId?: string;
        subcategory?: string;
      } = {
        id: actionId,
        siteId: siteFile.site.id,
        visitId: activeVisit?.id ?? "no-active-visit",
        discipline,
        actionType,
        engineerName,
        engineerUserId: user?.uid,
        stockItemId: selectedStockItem?.id,
        title: cleanTitle,
        manufacturer: cleanManufacturer || undefined,
        partCode: cleanPartCode || undefined,
        category: selectedStockItem?.category || category || undefined,
        subcategory: selectedStockItem?.subcategory || selectedSubcategory || undefined,
        quantity: parsedQuantity,
        locationText: cleanLocation || undefined,
        linkedAssetId: linkedAsset?.id,
        linkedAssetReference: cleanLinkedRef || undefined,
        sourceType,
        note: cleanNote || undefined,
        createdAt: now,
      };

      next.partActions.unshift(action);

      next.metadata.updatedAt = now;

      await updateSite(cleanFirestoreData(next));

      onSaved?.();
      onClose();
    } catch (saveError) {
      setMessages([
        saveError instanceof Error
          ? saveError.message
          : "Failed to save part action.",
      ]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div>
            <div style={kickerStyle}>SITE PARTS</div>
            <CardTitle>Add Part Action</CardTitle>
            <div style={visitLabelStyle}>{visitLabel}</div>
          </div>

          <button type="button" onClick={onClose} style={closeButtonStyle}>
            ✕
          </button>
        </div>

        <div style={contentStyle}>
          <Field label="Action Type">
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as PartActionType)}
              style={inputStyle}
            >
              {PART_ACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Engineer">
            <input value={engineerName} disabled style={inputStyle} />
          </Field>

          <div style={manualToggleRowStyle}>
            <button
              type="button"
              onClick={() => setManualMode(false)}
              style={!manualMode ? toggleButtonActiveStyle : toggleButtonStyle}
            >
              Select From SeCoStock
            </button>

            <button
              type="button"
              onClick={() => setManualMode(true)}
              style={manualMode ? toggleButtonActiveStyle : toggleButtonStyle}
            >
              Manual Part
            </button>
          </div>

          {!manualMode ? (
            <>
              <Field label="Category">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedSubcategory("");
                    setSelectedItemId("");
                    setTitle("");
                    setManufacturer("");
                    setPartCode("");
                    setCategory(e.target.value);
                  }}
                  style={inputStyle}
                  disabled={loadingStockItems}
                >
                  <option value="">
                    {loadingStockItems ? "Loading stock..." : "Select category"}
                  </option>

                  {stockCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Subcategory">
                <select
                  value={selectedSubcategory}
                  onChange={(e) => {
                    setSelectedSubcategory(e.target.value);
                    setSelectedItemId("");
                    setTitle("");
                    setManufacturer("");
                    setPartCode("");
                  }}
                  style={inputStyle}
                  disabled={!selectedCategory}
                >
                  <option value="">Select subcategory</option>

                  {stockSubcategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Part">
                <select
                  value={selectedItemId}
                  onChange={(e) => handleSelectStockItem(e.target.value)}
                  style={inputStyle}
                  disabled={!selectedCategory}
                >
                  <option value="">Select part</option>

                  {filteredItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.code ? ` (${item.code})` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              {selectedStockItem ? (
                <div style={selectedStockBoxStyle}>
                  <strong>{selectedStockItem.name}</strong>
                  <span>{selectedStockItem.manufacturer || "No manufacturer"}</span>
                  <span>{selectedStockItem.code || "No code"}</span>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <Field label="Discipline">
                <select
                  value={discipline}
                  onChange={(e) => setDiscipline(e.target.value as PartDiscipline)}
                  style={inputStyle}
                >
                  {PART_DISCIPLINE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Part Name">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={inputStyle}
                  placeholder="Manual part name..."
                />
              </Field>

              <div style={twoColStyle}>
                <Field label="Manufacturer">
                  <input
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    style={inputStyle}
                    placeholder="Manufacturer"
                  />
                </Field>

                <Field label="Part Code">
                  <input
                    value={partCode}
                    onChange={(e) => setPartCode(e.target.value)}
                    style={inputStyle}
                    placeholder="Part code"
                  />
                </Field>
              </div>
            </>
          )}

          <Field label="Quantity">
            <div style={quantityWrapStyle}>
              <button
                type="button"
                onClick={() =>
                  setQuantity((prev) => String(Math.max(1, Number(prev || "1") - 1)))
                }
                style={qtyButtonStyle}
              >
                −
              </button>

              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                style={{ ...inputStyle, textAlign: "center" }}
              />

              <button
                type="button"
                onClick={() => setQuantity((prev) => String(Number(prev || "0") + 1))}
                style={qtyButtonStyle}
              >
                +
              </button>
            </div>

            <div style={quickQtyStyle}>
              {[1, 5, 10].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setQuantity(String(value))}
                  style={quickQtyButtonStyle}
                >
                  {value}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Source">
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as PartSourceType)}
              style={inputStyle}
            >
              {PART_SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <div style={twoColStyle}>
            <Field label="Location">
              <input
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                style={inputStyle}
                placeholder="Room / riser / corridor / cabinet..."
              />
            </Field>

            <Field label="Linked Asset Ref">
              <input
                value={linkedAssetReference}
                onChange={(e) => setLinkedAssetReference(e.target.value)}
                style={inputStyle}
                placeholder="L1-A11"
              />
            </Field>
          </div>

          <Field label="Note">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={textareaStyle}
              rows={4}
              placeholder="Optional note about where or why this part was used..."
            />
          </Field>

          {messages.length > 0 ? (
            <div style={messageBoxStyle}>
              {messages.map((message, index) => (
                <div key={`${message}-${index}`}>{message}</div>
              ))}
            </div>
          ) : null}
        </div>

        <div style={actionsStyle}>
          <SecondaryButton onClick={onClose} style={actionButtonStyle}>
            Cancel
          </SecondaryButton>

          <PrimaryButton
            onClick={handleSave}
            disabled={saving}
            style={actionButtonStyle}
          >
            {saving ? "Saving..." : "Save Part Action"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
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

const modalStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "760px",
  maxHeight: "90vh",
  overflow: "auto",
  borderRadius: "24px",
  background: "#ffffff",
  color: "#111827",
  boxShadow: "0 28px 60px rgba(2,6,23,0.32)",
  display: "grid",
  gap: "16px",
  padding: "20px",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: "12px",
};

const kickerStyle: React.CSSProperties = {
  fontSize: "0.74rem",
  fontWeight: 800,
  letterSpacing: "0.1em",
  color: "#475569",
  marginBottom: "6px",
};

const visitLabelStyle: React.CSSProperties = {
  marginTop: "6px",
  color: "#64748b",
  fontWeight: 700,
  fontSize: "0.9rem",
};

const closeButtonStyle: React.CSSProperties = {
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

const contentStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};

const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const manualToggleRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
};

const toggleButtonStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  borderRadius: "12px",
  padding: "11px 12px",
  fontWeight: 900,
  cursor: "pointer",
};

const toggleButtonActiveStyle: React.CSSProperties = {
  ...toggleButtonStyle,
  background: "#111827",
  border: "1px solid #111827",
  color: "#ffffff",
};

const selectedStockBoxStyle: React.CSSProperties = {
  display: "grid",
  gap: "4px",
  padding: "12px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#111827",
};

const quantityWrapStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "48px 1fr 48px",
  gap: "8px",
  alignItems: "center",
};

const qtyButtonStyle: React.CSSProperties = {
  height: "52px",
  borderRadius: "14px",
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#111827",
  cursor: "pointer",
  fontSize: "1.2rem",
  fontWeight: 800,
};

const quickQtyStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  marginTop: "8px",
};

const quickQtyButtonStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: "999px",
  border: "1px solid #d1d5db",
  background: "#f8fafc",
  color: "#111827",
  cursor: "pointer",
  fontSize: "0.82rem",
  fontWeight: 700,
};

const messageBoxStyle: React.CSSProperties = {
  display: "grid",
  gap: "6px",
  padding: "12px",
  borderRadius: "16px",
  background: "#fff7ed",
  border: "1px solid #fdba74",
  color: "#9a3412",
  fontWeight: 700,
};

const actionsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const actionButtonStyle: React.CSSProperties = {
  minHeight: "54px",
};