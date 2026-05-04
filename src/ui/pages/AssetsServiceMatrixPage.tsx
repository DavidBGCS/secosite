// src/ui/pages/AssetsServiceMatrixPage.tsx

import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AssetCategory, AssetRecord, SiteFile } from "../../core";
import {
  filterAssets,
  getAutomaticDetectorProgress,
  getAvailableAssetCategories,
  getAvailableAssetTags,
  getColumnSummary,
  importAssetRows,
  parseBulkAddText,
  parseCsvText,
  parsePastedTable,
} from "../../core";
import {
  lockAssetServiceTick,
  tickAssetForService,
  unlockAssetServiceTick,
  untickAssetForService,
} from "../../core/assets/serviceTicks";
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
import { formatIrishDate, formatIrishDateTime } from "../utils/dateTime";

type ImportMode = "manual" | "bulk" | "paste" | "csv";

type AssetServiceTickView = {
  columnKey: string;
  serviceDate?: string;
  ticked: boolean;
  testedAt?: string;
  visitId?: string;
  jobRef?: string;
  testedBy?: string;
  locked?: boolean;
  lockedAt?: string;
};

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

function getServiceTick(asset: AssetRecord, columnKey: string): AssetServiceTickView | undefined {
  return (asset.serviceTicks as AssetServiceTickView[] | undefined)?.find(
    (tick) => tick.columnKey === columnKey
  );
}

function getAssetStatusText(asset: AssetRecord, activeColumnKey: string): string {
  const tick = getServiceTick(asset, activeColumnKey);
  if (!tick) return "No record";
  if (tick.ticked && tick.locked) return "Tested & locked";
  if (tick.ticked) return "Tested";
  return "Untested";
}

function getAssetStatusColors(asset: AssetRecord, activeColumnKey: string): {
  background: string;
  color: string;
} {
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
  const [selectedColumnKey, setSelectedColumnKey] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | "all">("all");
  const [selectedTag, setSelectedTag] = useState<string>("");

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

  const activeColumnKey =
    selectedColumnKey || siteFile?.serviceLayout.columns[0]?.key || "";

  const activeColumn = useMemo(() => {
    if (!siteFile || !activeColumnKey) return undefined;
    return siteFile.serviceLayout.columns.find((column) => column.key === activeColumnKey);
  }, [siteFile, activeColumnKey]);

  const availableCategories = useMemo(() => {
    if (!siteFile) return [];
    return getAvailableAssetCategories(siteFile);
  }, [siteFile]);

  const availableTags = useMemo(() => {
    if (!siteFile) return [];
    return getAvailableAssetTags(siteFile);
  }, [siteFile]);

  const filteredAssets = useMemo(() => {
    if (!siteFile) return [];
    return sortAssets(
      filterAssets(siteFile.assets, {
        category: selectedCategory === "all" ? undefined : selectedCategory,
        tag: selectedTag || undefined,
        search,
        activeOnly: false,
        serviceTrackableOnly: false,
      })
    );
  }, [siteFile, selectedCategory, selectedTag, search]);

  const progress = useMemo(() => {
    if (!siteFile || !activeColumnKey) return undefined;
    return getAutomaticDetectorProgress(
      siteFile,
      activeColumnKey,
      {
        activeOnly: true,
        serviceTrackableOnly: true,
      },
      25
    );
  }, [siteFile, activeColumnKey]);

  const columnSummary = useMemo(() => {
    if (!siteFile || !activeColumnKey) return undefined;
    return getColumnSummary(siteFile, activeColumnKey, {
      activeOnly: true,
      serviceTrackableOnly: true,
    });
  }, [siteFile, activeColumnKey]);

  const persistSiteFile = async (next: SiteFile) => {
    setSaving(true);
    try {
      await updateSite(
        cleanFirestoreData({
          ...next,
          metadata: {
            ...next.metadata,
            updatedAt: new Date().toISOString(),
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

  const toggleTick = async (assetId: string, columnKey: string) => {
    if (!siteFile) return;

    try {
      const next: SiteFile = JSON.parse(JSON.stringify(siteFile));
      const asset = next.assets.find((a) => a.id === assetId);
      if (!asset) return;

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
      } else {
        tickAssetForService(next, assetId, columnKey, {
          testedBy: "Engineer",
          lockAfterTick: false,
        });
      }

      await persistSiteFile(next);
      setMessages([]);
    } catch (saveError) {
      setMessages([
        saveError instanceof Error ? saveError.message : "Failed to update service tick.",
      ]);
    }
  };

  const toggleLock = async (assetId: string, columnKey: string) => {
    if (!siteFile) return;

    try {
      const next: SiteFile = JSON.parse(JSON.stringify(siteFile));
      const asset = next.assets.find((a) => a.id === assetId);
      if (!asset) return;

      const tick = getServiceTick(asset, columnKey);
      const locked = tick?.locked ?? false;

      if (locked) {
        unlockAssetServiceTick(next, assetId, columnKey);
        setMessages(["Service entry unlocked."]);
      } else {
        lockAssetServiceTick(next, assetId, columnKey);
        setMessages(["Service entry locked."]);
      }

      await persistSiteFile(next);
    } catch (saveError) {
      setMessages([
        saveError instanceof Error ? saveError.message : "Failed to update lock state.",
      ]);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Loading assets">
        <Card>Loading assets...</Card>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Assets error">
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
      title="Assets / Service Matrix"
      subtitle={`${siteFile.site.name} • ${siteFile.site.siteCode ?? siteFile.site.id}`}
    >
      <div style={pageGridStyle}>
        <Card>
          <div style={heroWrapStyle}>
            <div>
              <div style={eyebrowStyle}>SERVICE MATRIX</div>
              <div style={heroTitleStyle}>Testing Sheet View</div>
              <div style={heroSubStyle}>
                Designed for fast on-site checking of what has been tested, when it
                was tested, and whether that entry is locked.
              </div>
            </div>

            <div style={heroBadgeStyle}>
              {activeColumn?.label ?? (activeColumnKey ? activeColumnKey.toUpperCase() : "No Column")}
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Controls</CardTitle>

          <div style={{ display: "grid", gap: "12px" }}>
            <Field label="Active Service Column">
              <select
                value={activeColumnKey}
                onChange={(e) => setSelectedColumnKey(e.target.value)}
                style={inputStyle}
              >
                {siteFile.serviceLayout.columns.map((column) => (
                  <option key={column.key} value={column.key}>
                    {column.label}
                    {column.serviceDate ? ` • ${formatIrishDate(column.serviceDate)}` : ""}
                  </option>
                ))}
              </select>
            </Field>

            {activeColumn ? (
              <div style={activeColumnCardStyle}>
                <div style={activeColumnTitleStyle}>
                  Active Column: {activeColumn.label}
                </div>
                <div style={activeColumnMetaStyle}>
                  {activeColumn.serviceDate
                    ? `Planned service date: ${formatIrishDate(activeColumn.serviceDate)}`
                    : "No service date recorded for this column"}
                </div>
              </div>
            ) : null}

            <Field label="Search Assets">
              <input
                type="text"
                placeholder="Ref, type, loop, address, location, tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <div style={twoColStyle}>
              <PrimaryButton onClick={() => setShowImportPanel((v) => !v)}>
                {showImportPanel ? "Hide Add / Import" : "Add / Import"}
              </PrimaryButton>

              <SecondaryButton
                onClick={() => navigate(`/site/${siteFile.metadata.siteFileId}/overview`)}
              >
                Back to Overview
              </SecondaryButton>
            </div>

            {saving ? <div style={savingTextStyle}>Saving…</div> : null}
          </div>
        </Card>

        {progress && (
          <Card>
            <CardTitle>Automatic Detector Progress</CardTitle>

            <div style={progressTopRowStyle}>
              <div>
                <div style={progressTitleStyle}>
                  {activeColumn?.label ?? activeColumnKey.toUpperCase()}
                </div>
                <div style={progressSubStyle}>
                  {activeColumn?.serviceDate
                    ? formatIrishDate(activeColumn.serviceDate)
                    : "No service date"}
                </div>
              </div>

              <div style={progressCountStyle}>
                {progress.testedCount} / {progress.eligibleTotal}
              </div>
            </div>

            <div style={progressTrackStyle}>
              <div
                style={{
                  ...progressBarStyle,
                  width: `${Math.min(progress.percentage, 100)}%`,
                  background: progress.thresholdMet ? "#16a34a" : "#f59e0b",
                }}
              />
            </div>

            <div style={progressFooterStyle}>
              {progress.percentage}% tested •{" "}
              {progress.thresholdMet
                ? "25% requirement met"
                : `${progress.remainingToThreshold} more needed`}
            </div>

            {columnSummary ? (
              <div style={progressSecondaryStyle}>
                {columnSummary.testedAssets} / {columnSummary.totalTrackableAssets} trackable assets ticked
              </div>
            ) : null}
          </Card>
        )}

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

        <Card>
          <CardTitle>Tags</CardTitle>
          <div style={chipWrapStyle}>
            <Chip
              label="All Tags"
              active={selectedTag === ""}
              onClick={() => setSelectedTag("")}
            />
            {availableTags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                active={selectedTag === tag}
                onClick={() => setSelectedTag(tag)}
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
              <form onSubmit={handleManualAdd}>
                <Field label="Reference">
                  <input
                    value={manualReference}
                    onChange={(e) => setManualReference(e.target.value)}
                    style={inputStyle}
                    placeholder="L1-A11"
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
                  />
                </Field>

                <Field label="Location">
                  <input
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Tags">
                  <input
                    value={manualTags}
                    onChange={(e) => setManualTags(e.target.value)}
                    style={inputStyle}
                    placeholder="void, atex, attic"
                  />
                </Field>

                <PrimaryButton type="submit" style={{ width: "100%" }} disabled={saving}>
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

                <PrimaryButton onClick={handleBulkImport} style={{ width: "100%" }} disabled={saving}>
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

                <PrimaryButton onClick={handlePasteImport} style={{ width: "100%" }} disabled={saving}>
                  Import Pasted Table
                </PrimaryButton>
              </div>
            )}

            {importMode === "csv" && (
              <div style={{ display: "grid", gap: "12px" }}>
                <Field label="CSV Headers Mapping">
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

                <PrimaryButton onClick={handleCsvImport} style={{ width: "100%" }} disabled={saving}>
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
          <CardTitle>Testing Sheet</CardTitle>

          {filteredAssets.length === 0 ? (
            <p style={emptyTextStyle}>No assets match the current filters.</p>
          ) : (
            <div style={sheetScrollWrapStyle}>
              <div style={sheetTableStyle}>
                <div style={sheetHeaderRowStyle}>
                  <div style={sheetRefHeaderStyle}>Ref</div>
                  <div style={sheetTypeHeaderStyle}>Type / Location</div>
                  {siteFile.serviceLayout.columns.map((column) => (
                    <div key={column.key} style={sheetColumnHeaderStyle}>
                      <div style={sheetColumnHeaderLabelStyle}>{column.label}</div>
                      <div style={sheetColumnHeaderDateStyle}>
                        {column.serviceDate ? formatIrishDate(column.serviceDate) : "—"}
                      </div>
                    </div>
                  ))}
                </div>

                {filteredAssets.map((asset) => (
                  <div key={asset.id} style={sheetAssetRowStyle}>
                    <div style={sheetRefCellStyle}>
                      <div style={sheetRefValueStyle}>{asset.reference ?? "—"}</div>
                    </div>

                    <div style={sheetTypeCellStyle}>
                      <div style={sheetTypeValueStyle}>{asset.assetType ?? "Unknown type"}</div>
                      <div style={sheetMetaValueStyle}>
                        Loop {asset.loop ?? "—"} • Address {asset.address ?? "—"} • Zone{" "}
                        {asset.zone ?? "—"}
                      </div>
                      <div style={sheetMetaValueStyle}>
                        {asset.locationText ?? asset.description ?? "No location / description"}
                      </div>
                      {(asset.tags ?? []).length > 0 ? (
                        <div style={assetTagsWrapStyle}>
                          {asset.tags.map((tag) => (
                            <span key={tag} style={tagPillStyle}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div
                        style={{
                          ...assetStatusPillStyle,
                          ...getAssetStatusColors(asset, activeColumnKey),
                        }}
                      >
                        {getAssetStatusText(asset, activeColumnKey)}
                      </div>
                    </div>

                    {siteFile.serviceLayout.columns.map((column) => {
                      const tick = getServiceTick(asset, column.key);
                      const ticked = tick?.ticked ?? false;
                      const locked = tick?.locked ?? false;
                      const testedAt = tick?.testedAt;
                      const testedBy = tick?.testedBy;
                      const jobRef = tick?.jobRef;

                      return (
                        <div key={column.key} style={sheetColumnCellWrapStyle}>
                          <div
                            style={{
                              ...sheetTickCellStyle,
                              background: ticked ? "#22c55e" : "#ffffff",
                              borderColor: ticked ? "#16a34a" : "#d1d5db",
                              boxShadow:
                                column.key === activeColumnKey
                                  ? "0 0 0 2px rgba(37,99,235,0.16)"
                                  : "none",
                            }}
                            onClick={() => toggleTick(asset.id, column.key)}
                          >
                            <button
                              type="button"
                              style={sheetLockButtonStyle}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLock(asset.id, column.key);
                              }}
                              aria-label={locked ? "Unlock service entry" : "Lock service entry"}
                              title={locked ? "Unlock service entry" : "Lock service entry"}
                            >
                              {locked ? "🔒" : "🔓"}
                            </button>

                            <div style={sheetTickMarkStyle}>{ticked ? "✓" : ""}</div>

                            <div style={sheetTickMetaStyle}>
                              {testedAt ? formatIrishDate(testedAt) : "—"}
                            </div>

                            <div style={sheetTickMetaStyle}>
                              {jobRef ? jobRef : ticked ? "Tested" : "Not tested"}
                            </div>

                            <div style={sheetTickMetaSubtleStyle}>
                              {testedBy ? testedBy : ""}
                            </div>

                            <div style={sheetTickMetaSubtleStyle}>
                              {locked && tick?.lockedAt
                                ? `Locked ${formatIrishDateTime(tick.lockedAt)}`
                                : locked
                                  ? "Locked"
                                  : ""}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
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

const activeColumnCardStyle: React.CSSProperties = {
  padding: "14px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  display: "grid",
  gap: "6px",
};

const activeColumnTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#111827",
};

const activeColumnMetaStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "0.92rem",
  lineHeight: 1.4,
};

const progressTopRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  marginBottom: "10px",
};

const progressTitleStyle: React.CSSProperties = {
  fontWeight: 700,
};

const progressSubStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "0.9rem",
  marginTop: "2px",
};

const progressCountStyle: React.CSSProperties = {
  fontWeight: 800,
  fontSize: "1rem",
};

const progressTrackStyle: React.CSSProperties = {
  height: "16px",
  borderRadius: "999px",
  background: "#e5e7eb",
  overflow: "hidden",
  marginBottom: "8px",
};

const progressBarStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: "999px",
};

const progressFooterStyle: React.CSSProperties = {
  color: "#6b7280",
  marginBottom: "6px",
};

const progressSecondaryStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "0.92rem",
};

const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
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

const savingTextStyle: React.CSSProperties = {
  color: "#6b7280",
  fontWeight: 700,
};

const messageListStyle: React.CSSProperties = {
  display: "grid",
  gap: "6px",
  color: "#92400e",
  fontWeight: 700,
};

const emptyTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
};

const sheetScrollWrapStyle: React.CSSProperties = {
  overflowX: "auto",
};

const sheetTableStyle: React.CSSProperties = {
  minWidth: "1100px",
  display: "grid",
  gap: "10px",
};

const sheetHeaderRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "120px 280px repeat(4, 110px)",
  gap: "10px",
  alignItems: "stretch",
};

const sheetAssetRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "120px 280px repeat(4, 110px)",
  gap: "10px",
  alignItems: "stretch",
};

const sheetRefHeaderStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  fontWeight: 800,
  color: "#111827",
};

const sheetTypeHeaderStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  fontWeight: 800,
  color: "#111827",
};

const sheetColumnHeaderStyle: React.CSSProperties = {
  padding: "10px 8px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  textAlign: "center",
};

const sheetColumnHeaderLabelStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#111827",
  marginBottom: "4px",
};

const sheetColumnHeaderDateStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  color: "#6b7280",
};

const sheetRefCellStyle: React.CSSProperties = {
  padding: "12px",
  borderRadius: "16px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  display: "flex",
  alignItems: "start",
};

const sheetRefValueStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#111827",
  fontSize: "0.98rem",
};

const sheetTypeCellStyle: React.CSSProperties = {
  padding: "12px",
  borderRadius: "16px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  display: "grid",
  gap: "6px",
};

const sheetTypeValueStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#111827",
};

const sheetMetaValueStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "0.84rem",
  lineHeight: 1.35,
};

const assetTagsWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  marginTop: "2px",
};

const tagPillStyle: React.CSSProperties = {
  padding: "5px 9px",
  borderRadius: "999px",
  background: "#e0e7ff",
  color: "#3730a3",
  fontSize: "0.76rem",
};

const assetStatusPillStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "0.76rem",
  fontWeight: 800,
  whiteSpace: "nowrap",
  width: "fit-content",
  marginTop: "4px",
};

const sheetColumnCellWrapStyle: React.CSSProperties = {
  display: "flex",
};

const sheetTickCellStyle: React.CSSProperties = {
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

const sheetLockButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: "6px",
  right: "6px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: "0.82rem",
  padding: 0,
};

const sheetTickMarkStyle: React.CSSProperties = {
  fontSize: "1.35rem",
  fontWeight: 900,
  lineHeight: 1,
};

const sheetTickMetaStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 700,
  textAlign: "center",
  lineHeight: 1.2,
};

const sheetTickMetaSubtleStyle: React.CSSProperties = {
  fontSize: "0.66rem",
  color: "#334155",
  textAlign: "center",
  lineHeight: 1.2,
};