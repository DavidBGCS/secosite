import { useMemo, useState } from "react";

import { useAuth } from "../../app/context/AuthContext";
import type { SiteFile, VisitRecord } from "../../core";
import { cleanFirestoreData } from "../../utils/cleanFirestoreData";
import {
  useStockItems,
  type StockItem,
} from "../../app/hooks/useStockItems";

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
  PART_CATEGORY_OPTIONS,
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

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function getEngineerNameFromUser(
  user: {
    displayName?: string | null;
    email?: string | null;
  } | null
): string {
  if (!user) return "";

  if (user.displayName?.trim()) {
    return user.displayName.trim();
  }

  if (user.email?.trim()) {
    return user.email.split("@")[0];
  }

  return "";
}

function normaliseCategory(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function getSuggestedSiteCategory(
  item: StockItem,
  discipline: PartDiscipline
) {
  const allowed =
    PART_CATEGORY_OPTIONS[discipline] ?? ["other"];

  const candidates = [
    normaliseCategory(item.subcategory),
    normaliseCategory(item.category),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (allowed.includes(candidate)) {
      return candidate;
    }
  }

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

  const {
    items,
    loading: stockLoading,
  } = useStockItems();

  const [discipline, setDiscipline] =
    useState<PartDiscipline>(
      (activeVisit?.discipline as PartDiscipline) ??
        "fire-alarm"
    );

  const [actionType, setActionType] =
    useState<PartActionType>("add");

  const [title, setTitle] = useState("");
  const [manufacturer, setManufacturer] =
    useState("");
  const [partCode, setPartCode] = useState("");
  const [category, setCategory] = useState("");

  const [quantity, setQuantity] = useState("1");

  const [locationText, setLocationText] =
    useState("");

  const [
    linkedAssetReference,
    setLinkedAssetReference,
  ] = useState("");

  const [sourceType, setSourceType] =
    useState<PartSourceType>("van-stock");

  const [note, setNote] = useState("");

  const [saving, setSaving] = useState(false);

  const [messages, setMessages] =
    useState<string[]>([]);

  const [catalogueSearch, setCatalogueSearch] =
    useState("");

  const [selectedItemId, setSelectedItemId] =
    useState("");

  const [manualEntry, setManualEntry] =
    useState(false);

  const selectedStockItem = useMemo(() => {
    if (!selectedItemId) return undefined;

    return items.find(
      (item) => item.id === selectedItemId
    );
  }, [items, selectedItemId]);

  const engineerName = useMemo(() => {
    return (
      getEngineerNameFromUser(user) ||
      activeVisit?.engineerName ||
      "Site Team"
    );
  }, [user, activeVisit?.engineerName]);

  const linkedAsset = useMemo(() => {
    const ref =
      linkedAssetReference.trim().toLowerCase();

    if (!ref) return undefined;

    return siteFile.assets.find(
      (asset) =>
        asset.reference?.trim().toLowerCase() ===
        ref
    );
  }, [siteFile.assets, linkedAssetReference]);

  const categoryOptions = useMemo(() => {
    return (
      PART_CATEGORY_OPTIONS[discipline] ??
      ["other"]
    );
  }, [discipline]);

  const filteredCatalogueItems = useMemo(() => {
    const q =
      catalogueSearch.trim().toLowerCase();

    if (!q) {
      return items.slice(0, 100);
    }

    return items
      .filter((item) => {
        const text = [
          item.name,
          item.manufacturer,
          item.code,
          item.category,
          item.subcategory,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(q);
      })
      .slice(0, 100);
  }, [items, catalogueSearch]);

  const visitLabel = activeVisit
    ? `${activeVisit.visitType}${
        activeVisit.serviceColumnKey
          ? ` • ${activeVisit.serviceColumnKey.toUpperCase()}`
          : ""
      }`
    : "No active visit";

  const clearPartFields = () => {
    setTitle("");
    setManufacturer("");
    setPartCode("");
    setCategory("");
  };

  const handleSelectCatalogueItem = (
    itemId: string
  ) => {
    setSelectedItemId(itemId);

    const selected = items.find(
      (item) => item.id === itemId
    );

    if (!selected) {
      clearPartFields();
      return;
    }

    setManualEntry(false);

    setTitle(selected.name || "");

    setManufacturer(
      selected.manufacturer || ""
    );

    setPartCode(selected.code || "");

    setCategory(
      getSuggestedSiteCategory(
        selected,
        discipline
      )
    );
  };

  const handleManualEntry = () => {
    setManualEntry(true);
    setSelectedItemId("");
    setCatalogueSearch("");
    clearPartFields();
    setMessages([]);
  };

  const handleReturnToCatalogue = () => {
    setManualEntry(false);
    setSelectedItemId("");
    clearPartFields();
    setMessages([]);
  };

  const handleDisciplineChange = (
    nextDiscipline: PartDiscipline
  ) => {
    setDiscipline(nextDiscipline);
    setCategory("");

    if (selectedStockItem) {
      setCategory(
        getSuggestedSiteCategory(
          selectedStockItem,
          nextDiscipline
        )
      );
    }
  };

  const handleSave = async () => {
    const cleanTitle = title.trim();

    const cleanManufacturer =
      manufacturer.trim();

    const cleanPartCode = partCode.trim();

    const cleanLocation =
      locationText.trim();

    const cleanLinkedRef =
      linkedAssetReference.trim();

    const cleanNote = note.trim();

    const parsedQuantity = Number(quantity);

    if (!engineerName) {
      setMessages([
        "Engineer name could not be determined.",
      ]);

      return;
    }

    if (!cleanTitle) {
      setMessages([
        manualEntry
          ? "Part name is required."
          : "Select a catalogue item or choose Part Not Listed.",
      ]);

      return;
    }

    if (
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      setMessages([
        "Quantity must be greater than zero.",
      ]);

      return;
    }

    try {
      setSaving(true);
      setMessages([]);

      const next: SiteFileWithParts =
        JSON.parse(JSON.stringify(siteFile));

      next.partActions =
        next.partActions ?? [];

      const actionId =
        makeId("part-action");

      const now = nowIso();

      const action: PartActionRecord = {
        id: actionId,

        siteId: siteFile.site.id,

        visitId:
          activeVisit?.id ??
          "no-active-visit",

        discipline,
        actionType,

        engineerName,
        engineerUserId: user?.uid,

        catalogueItemId:
          selectedItemId || undefined,

        catalogueSource:
          selectedItemId
            ? "secostock"
            : "manual",

        title: cleanTitle,

        manufacturer:
          cleanManufacturer || undefined,

        partCode:
          cleanPartCode || undefined,

        category:
          category || undefined,

        quantity: parsedQuantity,

        locationText:
          cleanLocation || undefined,

        linkedAssetId:
          linkedAsset?.id,

        linkedAssetReference:
          cleanLinkedRef || undefined,

        sourceType,

        note:
          cleanNote || undefined,

        createdAt: now,
      };

      next.partActions.unshift(action);

      next.metadata.updatedAt = now;

      await updateSite(
        cleanFirestoreData(next)
      );

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

  const usingCatalogue =
    !manualEntry;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div>
            <div style={kickerStyle}>
              SITE PARTS
            </div>

            <CardTitle>
              Add Part Action
            </CardTitle>

            <div style={visitLabelStyle}>
              {visitLabel}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={closeButtonStyle}
          >
            ✕
          </button>
        </div>

        <div style={contentStyle}>
          <Field label="Discipline">
            <select
              value={discipline}
              onChange={(e) =>
                handleDisciplineChange(
                  e.target
                    .value as PartDiscipline
                )
              }
              style={inputStyle}
            >
              {PART_DISCIPLINE_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>
          </Field>

          <Field label="Action">
            <select
              value={actionType}
              onChange={(e) =>
                setActionType(
                  e.target
                    .value as PartActionType
                )
              }
              style={inputStyle}
            >
              {PART_ACTION_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>
          </Field>

          <Field label="Engineer">
            <input
              value={engineerName}
              disabled
              style={inputStyle}
            />
          </Field>

          {usingCatalogue ? (
            <div style={catalogueBoxStyle}>
              <div style={catalogueHeaderStyle}>
                <div>
                  <div
                    style={
                      catalogueTitleStyle
                    }
                  >
                    Select Part
                  </div>

                  <div
                    style={
                      catalogueSubStyle
                    }
                  >
                    Search the SeCoStock
                    catalogue by part name,
                    manufacturer or part code.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleManualEntry}
                  style={textButtonStyle}
                >
                  Part Not Listed
                </button>
              </div>

              <input
                value={catalogueSearch}
                onChange={(e) =>
                  setCatalogueSearch(
                    e.target.value
                  )
                }
                style={inputStyle}
                placeholder="Search EMS, HKC, Deedlock, part number..."
              />

              <select
                value={selectedItemId}
                onChange={(e) =>
                  handleSelectCatalogueItem(
                    e.target.value
                  )
                }
                style={{
                  ...inputStyle,
                  marginTop: "10px",
                }}
                disabled={stockLoading}
              >
                <option value="">
                  {stockLoading
                    ? "Loading catalogue..."
                    : "Select catalogue item"}
                </option>

                {filteredCatalogueItems.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {[
                        item.manufacturer,
                        item.name,
                        item.code
                          ? `(${item.code})`
                          : undefined,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </option>
                  )
                )}
              </select>

              {selectedStockItem ? (
                <div style={selectedPartStyle}>
                  <div
                    style={
                      selectedPartNameStyle
                    }
                  >
                    {selectedStockItem.name}
                  </div>

                  <div
                    style={
                      selectedPartMetaStyle
                    }
                  >
                    {selectedStockItem.manufacturer ||
                      "Unknown manufacturer"}

                    {selectedStockItem.code
                      ? ` • ${selectedStockItem.code}`
                      : ""}

                    {selectedStockItem.category
                      ? ` • ${selectedStockItem.category}`
                      : ""}

                    {selectedStockItem.subcategory
                      ? ` / ${selectedStockItem.subcategory}`
                      : ""}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div style={manualBoxStyle}>
              <div style={catalogueHeaderStyle}>
                <div>
                  <div
                    style={
                      catalogueTitleStyle
                    }
                  >
                    Manual Part Entry
                  </div>

                  <div
                    style={
                      catalogueSubStyle
                    }
                  >
                    Use this only when the
                    part does not exist in the
                    SeCoStock catalogue.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    handleReturnToCatalogue
                  }
                  style={textButtonStyle}
                >
                  Use Catalogue
                </button>
              </div>
            </div>
          )}

          <div style={twoColStyle}>
            <Field label="Part Name">
              <input
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                style={inputStyle}
                readOnly={
                  usingCatalogue &&
                  !!selectedItemId
                }
                placeholder={
                  usingCatalogue
                    ? "Select a catalogue item"
                    : "Enter part name"
                }
              />
            </Field>

            <Field label="Quantity">
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={twoColStyle}>
            <Field label="Manufacturer">
              <input
                value={manufacturer}
                onChange={(e) =>
                  setManufacturer(
                    e.target.value
                  )
                }
                style={inputStyle}
                readOnly={
                  usingCatalogue &&
                  !!selectedItemId
                }
              />
            </Field>

            <Field label="Part Code">
              <input
                value={partCode}
                onChange={(e) =>
                  setPartCode(
                    e.target.value
                  )
                }
                style={inputStyle}
                readOnly={
                  usingCatalogue &&
                  !!selectedItemId
                }
              />
            </Field>
          </div>

          <div style={twoColStyle}>
            <Field label="Site Category">
              <select
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="">
                  Select category
                </option>

                {categoryOptions.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field label="Source">
              <select
                value={sourceType}
                onChange={(e) =>
                  setSourceType(
                    e.target
                      .value as PartSourceType
                  )
                }
                style={inputStyle}
              >
                {PART_SOURCE_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </Field>
          </div>

          <Field label="Location">
            <input
              value={locationText}
              onChange={(e) =>
                setLocationText(
                  e.target.value
                )
              }
              style={inputStyle}
              placeholder="e.g. Main entrance, first floor corridor..."
            />
          </Field>

          <Field label="Linked Asset Ref">
            <input
              value={linkedAssetReference}
              onChange={(e) =>
                setLinkedAssetReference(
                  e.target.value
                )
              }
              style={inputStyle}
              placeholder="Optional asset reference"
            />
          </Field>

          <Field label="Note">
            <textarea
              value={note}
              onChange={(e) =>
                setNote(e.target.value)
              }
              style={textareaStyle}
              rows={4}
              placeholder="Optional note"
            />
          </Field>

          {messages.length > 0 ? (
            <div style={messageBoxStyle}>
              {messages.map(
                (message, index) => (
                  <div
                    key={`${message}-${index}`}
                  >
                    {message}
                  </div>
                )
              )}
            </div>
          ) : null}
        </div>

        <div style={actionsStyle}>
          <SecondaryButton
            onClick={onClose}
            style={actionButtonStyle}
          >
            Cancel
          </SecondaryButton>

          <PrimaryButton
            onClick={handleSave}
            disabled={saving}
            style={actionButtonStyle}
          >
            {saving
              ? "Saving..."
              : "Save Part"}
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
  boxShadow:
    "0 28px 60px rgba(2,6,23,0.32)",
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
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "10px",
};

const catalogueBoxStyle: React.CSSProperties = {
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  borderRadius: "18px",
  padding: "14px",
};

const manualBoxStyle: React.CSSProperties = {
  border: "1px solid #fed7aa",
  background: "#fff7ed",
  borderRadius: "18px",
  padding: "14px",
};

const catalogueHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "12px",
};

const catalogueTitleStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#0f172a",
};

const catalogueSubStyle: React.CSSProperties = {
  marginTop: "4px",
  color: "#64748b",
  fontSize: "0.86rem",
  lineHeight: 1.4,
};

const textButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#2563eb",
  padding: 0,
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const selectedPartStyle: React.CSSProperties = {
  marginTop: "10px",
  borderRadius: "14px",
  padding: "12px",
  background: "#ffffff",
  border: "1px solid #bfdbfe",
};

const selectedPartNameStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#111827",
};

const selectedPartMetaStyle: React.CSSProperties = {
  marginTop: "4px",
  color: "#64748b",
  fontSize: "0.84rem",
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