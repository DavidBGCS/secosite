import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AssetCategory, AssetRecord, SiteFile } from "../../core";
import {
  filterAssets,
  getAvailableAssetCategories,
  importAssetRows,
  parseBulkAddText,
  parseCsvText,
  parsePastedTable,
} from "../../core";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { cleanFirestoreData } from "../../utils/cleanFirestoreData";
import { AppLayout } from "../layouts/AppLayout";
import {
  Card,
  CardTitle,
  Field,
  PrimaryButton,
  SecondaryButton,
  inputStyle,
  textareaStyle,
} from "../components/ui";

type ImportMode = "manual" | "bulk" | "paste" | "csv";

const CATEGORY_LABELS: Record<string, string> = {
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

function sortAssets(assets: AssetRecord[]): AssetRecord[] {
  return [...assets].sort((a, b) => {
    const refA = a.reference?.toLowerCase() ?? "";
    const refB = b.reference?.toLowerCase() ?? "";
    return refA.localeCompare(refB);
  });
}

function nowIso() {
  return new Date().toISOString();
}

function escapeCsv(value: unknown): string {
  const stringValue = String(value ?? "");
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
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
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | "all">("all");

  const [importMode, setImportMode] = useState<ImportMode>("manual");
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

  const [messages, setMessages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const availableCategories = useMemo(() => {
    if (!siteFile) return [];
    return getAvailableAssetCategories(siteFile);
  }, [siteFile]);

  const filteredAssets = useMemo(() => {
    if (!siteFile) return [];
    return sortAssets(
      filterAssets(siteFile.assets, {
        category: selectedCategory === "all" ? undefined : selectedCategory,
        search,
        activeOnly: false,
        serviceTrackableOnly: false,
      })
    );
  }, [siteFile, selectedCategory, search]);

  const persistSiteFile = async (next: SiteFile) => {
    setSaving(true);
    try {
      await updateSite(
        cleanFirestoreData({
          ...next,
          metadata: {
            ...next.metadata,
            updatedAt: nowIso(),
          },
        })
      );
    } finally {
      setSaving(false);
    }
  };

  const handleManualAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!siteFile) return;

    try {
      const result = importAssetRows(
        [
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
        ],
        {
          siteId: siteFile.site.id,
          discipline: "fire-alarm",
          source: "manual",
        }
      );

      if (result.errors.length > 0) {
        setMessages(result.errors);
        return;
      }

      const next: SiteFile = JSON.parse(JSON.stringify(siteFile));
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
    } catch (saveError) {
      setMessages([
        saveError instanceof Error ? saveError.message : "Failed to add device.",
      ]);
    }
  };

  const handleBulkImport = async () => {
    if (!siteFile) return;

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

      const next: SiteFile = JSON.parse(JSON.stringify(siteFile));
      next.assets.push(...result.assets);

      await persistSiteFile(next);
      setMessages(
        result.warnings.length ? result.warnings : [`Imported ${result.assets.length} assets.`]
      );
      setBulkText("");
    } catch (saveError) {
      setMessages([
        saveError instanceof Error ? saveError.message : "Failed to import bulk text.",
      ]);
    }
  };

  const handlePasteImport = async () => {
    if (!siteFile) return;

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

      const next: SiteFile = JSON.parse(JSON.stringify(siteFile));
      next.assets.push(...result.assets);

      await persistSiteFile(next);
      setMessages(
        result.warnings.length ? result.warnings : [`Imported ${result.assets.length} assets.`]
      );
      setPasteText("");
    } catch (saveError) {
      setMessages([
        saveError instanceof Error ? saveError.message : "Failed to import pasted table.",
      ]);
    }
  };

  const handleCsvImport = async () => {
    if (!siteFile) return;

    try {
      const result = parseCsvText(
        csvText,
        {
          reference: csvReferenceHeader,
          loop: csvLoopHeader,
          address: csvAddressHeader,
          zone: csvZoneHeader,
          assetType: csvTypeHeader,
          description: csvDescriptionHeader,
          locationText: csvLocationHeader,
          tags: csvTagsHeader,
        },
        {
          siteId: siteFile.site.id,
          discipline: "fire-alarm",
          source: "csv-import",
        }
      );

      if (result.errors.length > 0) {
        setMessages(result.errors);
        return;
      }

      const next: SiteFile = JSON.parse(JSON.stringify(siteFile));
      next.assets.push(...result.assets);

      await persistSiteFile(next);
      setMessages(
        result.warnings.length ? result.warnings : [`Imported ${result.assets.length} assets.`]
      );
      setCsvText("");
    } catch (saveError) {
      setMessages([
        saveError instanceof Error ? saveError.message : "Failed to import CSV text.",
      ]);
    }
  };

  const handleExportCsv = () => {
    if (!siteFile) return;

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
      ...rows.map((row) =>
        headers.map((header) => escapeCsv(row[header as keyof typeof row])).join(",")
      ),
    ].join("\n");

    const safeSiteName = (siteFile.site.name || "site")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_");

    downloadTextFile(
      `${safeSiteName}_assets.csv`,
      csv,
      "text/csv;charset=utf-8;"
    );

    setMessages([`Exported ${rows.length} asset${rows.length === 1 ? "" : "s"} to CSV.`]);
  };

  if (loading) {
    return (
      <AppLayout title="Loading assets">
        <Card>Loading asset register...</Card>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Asset error">
        <Card>{error}</Card>
      </AppLayout>
    );
  }

  if (!siteFile) {
    return (
      <AppLayout title="Assets not found">
        <Card>
          <p style={{ marginTop: 0 }}>The requested site could not be found.</p>
          <SecondaryButton onClick={() => navigate("/")}>Back to Sites</SecondaryButton>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Assets"
      subtitle={`${siteFile.site.name} • ${siteFile.site.siteCode ?? siteFile.site.id}`}
    >
      <div style={pageGridStyle}>
        <Card>
          <div style={heroWrapStyle}>
            <div>
              <div style={eyebrowStyle}>ASSET REGISTER</div>
              <div style={heroTitleStyle}>Site Devices</div>
              <div style={heroSubStyle}>
                Add, import, review and manage all devices on this site. Service interaction is
                handled separately in the Service section.
              </div>
            </div>

            <div style={heroBadgeStyle}>{siteFile.assets.length} Devices</div>
          </div>
        </Card>

        <Card>
          <CardTitle>Controls</CardTitle>

          <div style={{ display: "grid", gap: "12px" }}>
            <Field label="Search Assets">
              <input
                type="text"
                placeholder="Ref, type, loop, address, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <div style={controlsActionRowStyle}>
              <PrimaryButton onClick={() => setShowImportPanel((v) => !v)}>
                {showImportPanel ? "Hide Add / Import" : "Add / Import"}
              </PrimaryButton>

              <SecondaryButton onClick={handleExportCsv}>
                Export CSV
              </SecondaryButton>

              <SecondaryButton
                onClick={() => navigate(`/site/${siteFile.metadata.siteFileId}/service`)}
              >
                Go to Service
              </SecondaryButton>

              <SecondaryButton
                onClick={() => navigate(`/site/${siteFile.metadata.siteFileId}/overview`)}
              >
                Back to Overview
              </SecondaryButton>
            </div>

            {saving ? <div style={savingTextStyle}>Saving…</div> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>Categories</CardTitle>
          <div style={chipWrapStyle}>
            <Chip
              label="All"
              active={selectedCategory === "all"}
              onClick={() => setSelectedCategory("all")}
            />
            {availableCategories.map((category) => (
              <Chip
                key={category}
                label={CATEGORY_LABELS[category] ?? category}
                active={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
              />
            ))}
          </div>
        </Card>

        {showImportPanel && (
          <Card>
            <CardTitle>Add / Import Devices</CardTitle>

            <div style={importModeGridStyle}>
              <ModeButton active={importMode === "manual"} onClick={() => setImportMode("manual")}>
                Manual
              </ModeButton>
              <ModeButton active={importMode === "bulk"} onClick={() => setImportMode("bulk")}>
                Bulk Add
              </ModeButton>
              <ModeButton active={importMode === "paste"} onClick={() => setImportMode("paste")}>
                Paste Table
              </ModeButton>
              <ModeButton active={importMode === "csv"} onClick={() => setImportMode("csv")}>
                CSV Text
              </ModeButton>
            </div>

            {importMode === "manual" && (
              <form onSubmit={handleManualAdd} style={{ display: "grid", gap: "12px" }}>
                <Field label="Reference">
                  <input
                    value={manualReference}
                    onChange={(e) => setManualReference(e.target.value)}
                    style={inputStyle}
                    placeholder="L1-A01"
                  />
                </Field>

                <div style={twoColStyle}>
                  <Field label="Loop">
                    <input
                      value={manualLoop}
                      onChange={(e) => setManualLoop(e.target.value)}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Address">
                    <input
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      style={inputStyle}
                    />
                  </Field>
                </div>

                <div style={twoColStyle}>
                  <Field label="Zone">
                    <input
                      value={manualZone}
                      onChange={(e) => setManualZone(e.target.value)}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Asset Type">
                    <input
                      value={manualType}
                      onChange={(e) => setManualType(e.target.value)}
                      style={inputStyle}
                      placeholder="Optical Detector"
                      required
                    />
                  </Field>
                </div>

                <Field label="Description">
                  <input
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                    style={inputStyle}
                    placeholder="Device description"
                  />
                </Field>

                <Field label="Location">
                  <input
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    style={inputStyle}
                    placeholder="Entry lobby / basement / riser..."
                  />
                </Field>

                <Field label="Tags">
                  <input
                    value={manualTags}
                    onChange={(e) => setManualTags(e.target.value)}
                    style={inputStyle}
                    placeholder="void, attic, mcp"
                  />
                </Field>

                <PrimaryButton type="submit" disabled={saving}>
                  Add Device
                </PrimaryButton>
              </form>
            )}

            {importMode === "bulk" && (
              <div style={{ display: "grid", gap: "12px" }}>
                <Field label="Bulk Add Text">
                  <textarea
                    rows={8}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    style={textareaStyle}
                    placeholder={`Loop 1 A11 Optical Detector - Corridor
Loop 1 A12 Optical Detector - Office 1
Loop 1 A13 MCP - Final Exit`}
                  />
                </Field>

                <PrimaryButton onClick={handleBulkImport} disabled={saving}>
                  Import Bulk Text
                </PrimaryButton>
              </div>
            )}

            {importMode === "paste" && (
              <div style={{ display: "grid", gap: "12px" }}>
                <Field label="Paste Panel Table">
                  <textarea
                    rows={8}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    style={textareaStyle}
                    placeholder={`L1-A11    Optical Detector    Corridor    Zone 1`}
                  />
                </Field>

                <PrimaryButton onClick={handlePasteImport} disabled={saving}>
                  Import Pasted Table
                </PrimaryButton>
              </div>
            )}

            {importMode === "csv" && (
              <div style={{ display: "grid", gap: "12px" }}>
                <Field label="CSV Header Mapping">
                  <div style={csvHeaderGridStyle}>
                    <input
                      value={csvReferenceHeader}
                      onChange={(e) => setCsvReferenceHeader(e.target.value)}
                      style={inputStyle}
                      placeholder="reference"
                    />
                    <input
                      value={csvLoopHeader}
                      onChange={(e) => setCsvLoopHeader(e.target.value)}
                      style={inputStyle}
                      placeholder="loop"
                    />
                    <input
                      value={csvAddressHeader}
                      onChange={(e) => setCsvAddressHeader(e.target.value)}
                      style={inputStyle}
                      placeholder="address"
                    />
                    <input
                      value={csvZoneHeader}
                      onChange={(e) => setCsvZoneHeader(e.target.value)}
                      style={inputStyle}
                      placeholder="zone"
                    />
                    <input
                      value={csvTypeHeader}
                      onChange={(e) => setCsvTypeHeader(e.target.value)}
                      style={inputStyle}
                      placeholder="assetType"
                    />
                    <input
                      value={csvDescriptionHeader}
                      onChange={(e) => setCsvDescriptionHeader(e.target.value)}
                      style={inputStyle}
                      placeholder="description"
                    />
                    <input
                      value={csvLocationHeader}
                      onChange={(e) => setCsvLocationHeader(e.target.value)}
                      style={inputStyle}
                      placeholder="locationText"
                    />
                    <input
                      value={csvTagsHeader}
                      onChange={(e) => setCsvTagsHeader(e.target.value)}
                      style={inputStyle}
                      placeholder="tags"
                    />
                  </div>
                </Field>

                <Field label="CSV Text">
                  <textarea
                    rows={10}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    style={textareaStyle}
                    placeholder={`reference,loop,address,zone,assetType,description,locationText,tags
L1-A11,1,11,1,Optical Detector,Corridor detector,Corridor,detector`}
                  />
                </Field>

                <PrimaryButton onClick={handleCsvImport} disabled={saving}>
                  Import CSV Text
                </PrimaryButton>
              </div>
            )}
          </Card>
        )}

        {messages.length > 0 && (
          <Card>
            <CardTitle>Messages</CardTitle>
            <div style={messageListStyle}>
              {messages.map((message, index) => (
                <div key={`${message}-${index}`}>{message}</div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <CardTitle>Asset Register</CardTitle>

          {filteredAssets.length === 0 ? (
            <p style={emptyTextStyle}>No assets match the current filters.</p>
          ) : (
            <div style={assetGridStyle}>
              {filteredAssets.map((asset) => (
                <div key={asset.id} style={assetCardStyle}>
                  <div style={assetTopRowStyle}>
                    <div>
                      <div style={assetRefStyle}>{asset.reference}</div>
                      <div style={assetTypeStyle}>{asset.assetType}</div>
                    </div>

                    <div style={assetStatusWrapStyle}>
                      <span
                        style={{
                          ...statusPillStyle,
                          background: asset.active ? "#dcfce7" : "#f3f4f6",
                          color: asset.active ? "#166534" : "#374151",
                        }}
                      >
                        {asset.active ? "Active" : "Inactive"}
                      </span>

                      <span
                        style={{
                          ...statusPillStyle,
                          background: asset.serviceTrackable ? "#dbeafe" : "#f3f4f6",
                          color: asset.serviceTrackable ? "#1d4ed8" : "#374151",
                        }}
                      >
                        {asset.serviceTrackable ? "Trackable" : "Non-trackable"}
                      </span>
                    </div>
                  </div>

                  <div style={assetMetaGridStyle}>
                    <div>
                      <strong>Loop:</strong> {asset.loop ?? "—"}
                    </div>
                    <div>
                      <strong>Address:</strong> {asset.address ?? "—"}
                    </div>
                    <div>
                      <strong>Zone:</strong> {asset.zone ?? "—"}
                    </div>
                    <div>
                      <strong>Category:</strong> {asset.category ?? "—"}
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <strong>Location:</strong> {asset.locationText ?? "—"}
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <strong>Description:</strong> {asset.description ?? "—"}
                    </div>
                  </div>

                  {(asset.tags ?? []).length > 0 && (
                    <div style={chipWrapStyle}>
                      {asset.tags.map((tag) => (
                        <span key={tag} style={tagPillStyle}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={assetFooterStyle}>
                    <div style={assetFooterMetaStyle}>
                      Source: {asset.source ?? "—"}
                    </div>

                    <div style={assetActionGridStyle}>
                      <SecondaryButton
                        onClick={() =>
                          navigate(`/site/${siteFile.metadata.siteFileId}/assets/${asset.id}/edit`)
                        }
                      >
                        Edit
                      </SecondaryButton>

                      <SecondaryButton
                        onClick={() =>
                          navigate(`/site/${siteFile.metadata.siteFileId}/assets/${asset.id}/history`)
                        }
                      >
                        History
                      </SecondaryButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={active ? chipActiveStyle : chipStyle}>
      {label}
    </button>
  );
}

function ModeButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={active ? chipActiveStyle : chipStyle}>
      {children}
    </button>
  );
}

const pageGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
};

const heroWrapStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: "12px",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 800,
  letterSpacing: "0.08em",
  color: "#6b7280",
  marginBottom: "6px",
};

const heroTitleStyle: React.CSSProperties = {
  fontSize: "1.45rem",
  fontWeight: 800,
  lineHeight: 1.1,
  color: "#111827",
  marginBottom: "6px",
};

const heroSubStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "0.95rem",
  lineHeight: 1.45,
  maxWidth: "700px",
};

const heroBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "8px 12px",
  background: "#eef2ff",
  color: "#3730a3",
  fontSize: "0.82rem",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const controlsActionRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const savingTextStyle: React.CSSProperties = {
  color: "#6b7280",
  fontWeight: 700,
};

const chipWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const chipStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
  borderRadius: "999px",
  padding: "10px 12px",
  fontSize: "0.88rem",
  cursor: "pointer",
};

const chipActiveStyle: React.CSSProperties = {
  ...chipStyle,
  background: "#111827",
  color: "#fff",
  border: "1px solid #111827",
};

const importModeGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "8px",
  marginBottom: "14px",
};

const csvHeaderGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const messageListStyle: React.CSSProperties = {
  display: "grid",
  gap: "6px",
  color: "#92400e",
  fontWeight: 700,
};

const assetGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};

const assetCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "14px",
  background: "#f8fafc",
  display: "grid",
  gap: "12px",
};

const assetTopRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: "10px",
};

const assetRefStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 800,
  color: "#111827",
};

const assetTypeStyle: React.CSSProperties = {
  marginTop: "4px",
  color: "#374151",
  fontWeight: 700,
};

const assetStatusWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  justifyContent: "end",
};

const statusPillStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "0.76rem",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const assetMetaGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px 12px",
  color: "#374151",
  fontSize: "0.92rem",
};

const tagPillStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#e0e7ff",
  color: "#3730a3",
  fontSize: "0.8rem",
};

const assetFooterStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
};

const assetFooterMetaStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "0.9rem",
};

const assetActionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
};

const emptyTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
};