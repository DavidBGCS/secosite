import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AssetCategory, AssetRecord, SiteFile } from "../../core";
import {
  filterAssets,
  getAutomaticDetectorProgress,
  getAvailableAssetCategories,
  getColumnSummary,
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

function nowIso() {
  return new Date().toISOString();
}

function sortAssets(assets: AssetRecord[]): AssetRecord[] {
  return [...assets].sort((a, b) => {
    const refA = a.reference?.toLowerCase() ?? "";
    const refB = b.reference?.toLowerCase() ?? "";
    return refA.localeCompare(refB);
  });
}

function getLatestVisit(siteFile: SiteFile) {
  return [...siteFile.visits].sort((a, b) =>
    (b.completedAt ?? b.startedAt ?? "").localeCompare(a.completedAt ?? a.startedAt ?? "")
  )[0];
}

function getActiveVisit(siteFile: SiteFile) {
  return [...siteFile.visits]
    .filter((visit) => visit.status === "draft" || visit.status === "in-progress")
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))[0];
}

export function ServicePage() {
  const navigate = useNavigate();
  const { siteFile, updateSite, loading, error } = useFirestoreSite();

  const [search, setSearch] = useState("");
  const [selectedColumnKey, setSelectedColumnKey] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | "all">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const latestVisit = useMemo(() => {
    if (!siteFile) return undefined;
    return getLatestVisit(siteFile);
  }, [siteFile]);

  const activeVisit = useMemo(() => {
    if (!siteFile) return undefined;
    return getActiveVisit(siteFile);
  }, [siteFile]);

  const hasActiveVisit = !!activeVisit;

  const activeColumnKey =
    selectedColumnKey ||
    activeVisit?.serviceColumnKey ||
    siteFile?.serviceLayout.columns[0]?.key ||
    "";

  useEffect(() => {
    if (activeVisit?.serviceColumnKey) {
      setSelectedColumnKey(activeVisit.serviceColumnKey);
    }
  }, [activeVisit?.serviceColumnKey]);

  const activeColumn = useMemo(() => {
    if (!siteFile || !activeColumnKey) return undefined;
    return siteFile.serviceLayout.columns.find((column) => column.key === activeColumnKey);
  }, [siteFile, activeColumnKey]);

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
        activeOnly: true,
        serviceTrackableOnly: true,
      })
    );
  }, [siteFile, selectedCategory, search]);

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
            updatedAt: nowIso(),
          },
        })
      );
    } finally {
      setSaving(false);
    }
  };

  const getTickForAsset = (asset: AssetRecord) =>
    asset.serviceTicks?.find((tick) => tick.columnKey === activeColumnKey);

  const handleToggleTested = async (assetId: string) => {
    if (!siteFile || !activeColumnKey || !activeVisit) return;

    try {
      const next: SiteFile = JSON.parse(JSON.stringify(siteFile));
      const asset = next.assets.find((item) => item.id === assetId);
      if (!asset) return;

      const tick = asset.serviceTicks?.find((item) => item.columnKey === activeColumnKey);
      const isTicked = tick?.ticked ?? false;

      if (isTicked) {
        untickAssetForService(next, assetId, activeColumnKey);
      } else {
        tickAssetForService(next, assetId, activeColumnKey, {
          testedAt: nowIso(),
          visitId: activeVisit.id,
          jobRef: activeVisit.id,
          testedBy: activeVisit.engineerName || undefined,
        });
      }

      await persistSiteFile(next);
      setMessages([isTicked ? "Device marked not tested." : "Device marked tested."]);
    } catch (saveError) {
      setMessages([
        saveError instanceof Error ? saveError.message : "Failed to update service entry.",
      ]);
    }
  };

  const handleToggleLock = async (assetId: string) => {
    if (!siteFile || !activeColumnKey || !activeVisit) return;

    try {
      const next: SiteFile = JSON.parse(JSON.stringify(siteFile));
      const asset = next.assets.find((item) => item.id === assetId);
      if (!asset) return;

      const tick = asset.serviceTicks?.find((item) => item.columnKey === activeColumnKey);
      const isLocked = tick?.locked ?? false;

      if (isLocked) {
        unlockAssetServiceTick(next, assetId, activeColumnKey);
      } else {
        lockAssetServiceTick(next, assetId, activeColumnKey);
      }

      await persistSiteFile(next);
      setMessages([isLocked ? "Entry unlocked." : "Entry locked."]);
    } catch (saveError) {
      setMessages([
        saveError instanceof Error ? saveError.message : "Failed to update lock state.",
      ]);
    }
  };

  const handleSaveNote = async (assetId: string) => {
    if (!siteFile || !activeColumnKey || !activeVisit) return;

    try {
      const noteValue = (noteDrafts[assetId] ?? "").trim();
      const next: SiteFile = JSON.parse(JSON.stringify(siteFile));
      const asset = next.assets.find((item) => item.id === assetId);
      if (!asset) return;

      let tick = asset.serviceTicks?.find((item) => item.columnKey === activeColumnKey);

      if (!tick) {
        tickAssetForService(next, assetId, activeColumnKey, {
          visitId: activeVisit.id,
          jobRef: activeVisit.id,
          testedBy: activeVisit.engineerName ?? undefined,
        });
        tick = asset.serviceTicks?.find((item) => item.columnKey === activeColumnKey);
        if (tick) {
          tick.ticked = false;
          tick.testedAt = undefined;
        }
      }

      if (!tick) {
        throw new Error("Could not create service entry for note.");
      }

      if (tick.locked) {
        throw new Error("This service entry is locked and the note cannot be changed.");
      }

      tick.note = noteValue || undefined;
      tick.visitId = activeVisit.id;
      tick.jobRef = activeVisit.id;
      tick.testedBy = activeVisit.engineerName ?? tick.testedBy;

      asset.updatedAt = nowIso();
      next.metadata.updatedAt = nowIso();

      await persistSiteFile(next);
      setMessages([noteValue ? "Device note saved." : "Device note cleared."]);
    } catch (saveError) {
      setMessages([
        saveError instanceof Error ? saveError.message : "Failed to save note.",
      ]);
    }
  };

  const toggleNoteExpanded = (assetId: string) => {
    setExpandedNotes((prev) => ({
      ...prev,
      [assetId]: !prev[assetId],
    }));
  };

  if (loading) {
    return (
      <AppLayout title="Loading service">
        <Card>Loading service page...</Card>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Service error">
        <Card>{error}</Card>
      </AppLayout>
    );
  }

  if (!siteFile) {
    return (
      <AppLayout title="Service not found">
        <Card>
          <p style={{ marginTop: 0 }}>The requested site could not be found.</p>
          <SecondaryButton onClick={() => navigate("/")}>Back to Sites</SecondaryButton>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Service"
      subtitle={`${siteFile.site.name} • ${siteFile.site.siteCode ?? siteFile.site.id}`}
      sessionStatus={{
        isVisitActive: hasActiveVisit,
        visitLabel: activeVisit?.visitType ?? latestVisit?.visitType,
        engineerName: activeVisit?.engineerName ?? latestVisit?.engineerName,
        startedAt: activeVisit?.startedAt,
        serviceColumnLabel:
          activeVisit?.serviceColumnKey?.toUpperCase() ?? activeColumnKey?.toUpperCase(),
      }}
    >
      <div style={pageGridStyle}>
        {progress ? (
          <div style={stickyProgressWrapStyle}>
            <div style={stickyProgressShellStyle}>
              <div style={stickyProgressTopStyle}>
                <div>
                  <div style={stickyEyebrowStyle}>ACTIVE SERVICE</div>
                  <div style={stickyTitleStyle}>
                    {activeColumn?.label ??
                      (activeColumnKey ? activeColumnKey.toUpperCase() : "No Column")}
                  </div>
                  <div style={stickyMetaStyle}>
                    {activeColumn?.serviceDate
                      ? formatIrishDate(activeColumn.serviceDate)
                      : "No service date"}
                    {activeVisit ? ` • ${activeVisit.engineerName || "No engineer"}` : ""}
                  </div>
                </div>

                <div style={stickyRightStyle}>
                  <div style={stickyPercentStyle}>{progress.percentage}%</div>
                  <div style={stickyCountStyle}>
                    {progress.testedCount} / {progress.eligibleTotal}
                  </div>
                </div>
              </div>

              <div style={stickyTrackStyle}>
                <div
                  style={{
                    ...stickyBarStyle,
                    width: `${Math.min(progress.percentage, 100)}%`,
                    background: progress.thresholdMet ? "#16a34a" : "#f59e0b",
                  }}
                />
              </div>

              <div style={stickyFooterStyle}>
                {progress.thresholdMet
                  ? "25% requirement met"
                  : `${progress.remainingToThreshold} more needed`}
                {columnSummary
                  ? ` • ${columnSummary.testedAssets}/${columnSummary.totalTrackableAssets} trackable assets`
                  : ""}
              </div>
            </div>
          </div>
        ) : null}

        {!hasActiveVisit ? (
          <Card>
            <CardTitle>No Active Visit</CardTitle>
            <div style={blockedPanelStyle}>
              <div style={blockedTitleStyle}>Service is in review-only mode.</div>
              <div style={blockedTextStyle}>
                You can review device history and status here, but you cannot test devices,
                save notes, or lock entries until a visit is started from Overview.
              </div>

              <div style={blockedActionGridStyle}>
                <PrimaryButton
                  onClick={() => navigate(`/site/${siteFile.metadata.siteFileId}/overview`)}
                >
                  Start Visit from Overview
                </PrimaryButton>

                <SecondaryButton
                  onClick={() => navigate(`/site/${siteFile.metadata.siteFileId}/assets`)}
                >
                  View Asset Register
                </SecondaryButton>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <CardTitle>Active Visit Session</CardTitle>
            <div style={activeVisitPanelStyle}>
              <div>
                <div style={activeVisitTitleStyle}>
                  {activeVisit.visitType} • {activeVisit.status}
                </div>
                <div style={activeVisitMetaStyle}>
                  {activeVisit.engineerName || "No engineer"} •{" "}
                  {activeVisit.startedAt ? formatIrishDateTime(activeVisit.startedAt) : "—"}
                  {activeVisit.serviceColumnKey
                    ? ` • ${activeVisit.serviceColumnKey.toUpperCase()}`
                    : ""}
                </div>
              </div>

              <SecondaryButton
                onClick={() =>
                  navigate(`/site/${siteFile.metadata.siteFileId}/visit/${activeVisit.id}`, {
                    state: { visit: activeVisit },
                  })
                }
              >
                Open Visit
              </SecondaryButton>
            </div>
          </Card>
        )}

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

            <Field label="Search Devices">
              <input
                type="text"
                placeholder="Ref, type, loop, address, zone, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <div style={controlsActionRowStyle}>
              <SecondaryButton onClick={() => setShowFilters((v) => !v)}>
                {showFilters ? "Hide Filters" : "Show Filters"}
              </SecondaryButton>

              <SecondaryButton
                onClick={() => navigate(`/site/${siteFile.metadata.siteFileId}/overview`)}
              >
                Back to Overview
              </SecondaryButton>
            </div>

            {showFilters ? (
              <div style={filterPanelStyle}>
                <div style={filterPanelTitleStyle}>Categories</div>
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
              </div>
            ) : null}

            {saving ? <div style={savingTextStyle}>Saving…</div> : null}
          </div>
        </Card>

        {messages.length > 0 ? (
          <Card>
            <CardTitle>Messages</CardTitle>
            <div style={messageListStyle}>
              {messages.map((message, index) => (
                <div key={`${message}-${index}`}>{message}</div>
              ))}
            </div>
          </Card>
        ) : null}

        <Card>
          <CardTitle>Devices for Service</CardTitle>

          {filteredAssets.length === 0 ? (
            <p style={emptyTextStyle}>No devices match the current filters.</p>
          ) : (
            <div style={deviceGridStyle}>
              {filteredAssets.map((asset) => {
                const tick = getTickForAsset(asset);
                const noteValue = noteDrafts[asset.id] ?? tick?.note ?? "";
                const noteExpanded = !!expandedNotes[asset.id];

                return (
                  <div key={asset.id} style={deviceCardStyle}>
                    <div style={deviceCompactTopStyle}>
                      <div style={{ minWidth: 0 }}>
                        <div style={deviceRefStyle}>{asset.reference}</div>
                        <div style={deviceTypeStyle}>{asset.assetType}</div>
                        <div style={deviceCompactMetaStyle}>
                          Loop {asset.loop ?? "—"} • Addr {asset.address ?? "—"} • Zone{" "}
                          {asset.zone ?? "—"}
                        </div>
                        <div style={deviceCompactMetaStyle}>
                          {asset.locationText ?? "No location"}
                        </div>
                      </div>

                      <div style={statusPillWrapStyle}>
                        <span
                          style={{
                            ...statusPillStyle,
                            background: tick?.ticked ? "#dcfce7" : "#f3f4f6",
                            color: tick?.ticked ? "#166534" : "#374151",
                          }}
                        >
                          {tick?.ticked ? "Tested" : "Not tested"}
                        </span>

                        <span
                          style={{
                            ...statusPillStyle,
                            background: tick?.locked ? "#e0e7ff" : "#fef3c7",
                            color: tick?.locked ? "#3730a3" : "#92400e",
                          }}
                        >
                          {tick?.locked ? "Locked" : "Unlocked"}
                        </span>
                      </div>
                    </div>

                    <div style={miniInfoRowStyle}>
                      <div style={miniInfoPillStyle}>
                        <strong>{activeColumn?.label ?? activeColumnKey.toUpperCase()}</strong>
                      </div>
                      <div style={miniInfoPillStyle}>
                        {tick?.testedAt ? formatIrishDateTime(tick.testedAt) : "No test time"}
                      </div>
                      {tick?.note ? <div style={miniInfoPillStyle}>Note saved</div> : null}
                    </div>

                    <div style={deviceActionGridStyle}>
                      <PrimaryButton
                        onClick={() => handleToggleTested(asset.id)}
                        disabled={saving || !activeColumnKey || !hasActiveVisit}
                        style={compactButtonStyle}
                      >
                        {tick?.ticked ? "Untest" : "Test"}
                      </PrimaryButton>

                      <SecondaryButton
                        onClick={() => toggleNoteExpanded(asset.id)}
                        disabled={saving}
                        style={compactButtonStyle}
                      >
                        {noteExpanded ? "Hide Note" : tick?.note ? "Edit Note" : "Add Note"}
                      </SecondaryButton>

                      <SecondaryButton
                        onClick={() => handleToggleLock(asset.id)}
                        disabled={saving || !activeColumnKey || !hasActiveVisit}
                        style={{
                          ...compactButtonStyle,
                          ...(tick?.locked ? unlockButtonStyle : {}),
                        }}
                      >
                        {tick?.locked ? "Unlock" : "Lock"}
                      </SecondaryButton>

                      <SecondaryButton
                        onClick={() =>
                          navigate(`/site/${siteFile.metadata.siteFileId}/assets/${asset.id}/history`)
                        }
                        disabled={saving}
                        style={compactButtonStyle}
                      >
                        History
                      </SecondaryButton>
                    </div>

                    {noteExpanded ? (
                      <div style={expandedNoteWrapStyle}>
                        <Field label="Engineer Note">
                          <textarea
                            rows={3}
                            value={noteValue}
                            onChange={(e) =>
                              setNoteDrafts((prev) => ({
                                ...prev,
                                [asset.id]: e.target.value,
                              }))
                            }
                            style={textareaStyle}
                            placeholder="Detector now inaccessible / recommend replacement / void not accessed / access restricted..."
                            disabled={tick?.locked || !hasActiveVisit}
                          />
                        </Field>

                        <div style={expandedNoteActionsStyle}>
                          <SecondaryButton
                            onClick={() => handleSaveNote(asset.id)}
                            disabled={saving || !activeColumnKey || !hasActiveVisit}
                          >
                            Save Note
                          </SecondaryButton>

                          <SecondaryButton
                            onClick={() =>
                              navigate(`/site/${siteFile.metadata.siteFileId}/assets`)
                            }
                            disabled={saving}
                          >
                            Asset Register
                          </SecondaryButton>
                        </div>

                        {!hasActiveVisit ? (
                          <div style={reviewOnlyHintStyle}>
                            Review only — start a visit from Overview to save changes.
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
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

const pageGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
};

const stickyProgressWrapStyle: React.CSSProperties = {
  position: "sticky",
  top: "86px",
  zIndex: 18,
};

const stickyProgressShellStyle: React.CSSProperties = {
  borderRadius: "20px",
  padding: "14px",
  background: "linear-gradient(135deg, #0f172a 0%, #172554 55%, #1e3a8a 100%)",
  color: "#f8fafc",
  boxShadow: "0 18px 28px rgba(15,23,42,0.18)",
};

const stickyProgressTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "start",
};

const stickyEyebrowStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 800,
  letterSpacing: "0.12em",
  color: "#93c5fd",
  marginBottom: "4px",
};

const stickyTitleStyle: React.CSSProperties = {
  fontSize: "1.06rem",
  fontWeight: 800,
  color: "#ffffff",
};

const stickyMetaStyle: React.CSSProperties = {
  marginTop: "4px",
  fontSize: "0.88rem",
  color: "#cbd5e1",
};

const stickyRightStyle: React.CSSProperties = {
  textAlign: "right",
};

const stickyPercentStyle: React.CSSProperties = {
  fontSize: "1.35rem",
  fontWeight: 800,
  lineHeight: 1,
};

const stickyCountStyle: React.CSSProperties = {
  marginTop: "6px",
  fontSize: "0.86rem",
  color: "#cbd5e1",
};

const stickyTrackStyle: React.CSSProperties = {
  height: "12px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.12)",
  overflow: "hidden",
  marginTop: "12px",
};

const stickyBarStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: "999px",
};

const stickyFooterStyle: React.CSSProperties = {
  marginTop: "10px",
  fontSize: "0.86rem",
  color: "#dbeafe",
  fontWeight: 700,
};

const blockedPanelStyle: React.CSSProperties = {
  borderRadius: "18px",
  padding: "16px",
  background: "linear-gradient(180deg, #fef2f2 0%, #fee2e2 100%)",
  border: "1px solid #fecaca",
};

const blockedTitleStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 800,
  color: "#7f1d1d",
};

const blockedTextStyle: React.CSSProperties = {
  marginTop: "6px",
  color: "#7c2d12",
  lineHeight: 1.5,
};

const blockedActionGridStyle: React.CSSProperties = {
  marginTop: "12px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const activeVisitPanelStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "14px",
  borderRadius: "18px",
  background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
  border: "1px solid #bfdbfe",
};

const activeVisitTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#1d4ed8",
};

const activeVisitMetaStyle: React.CSSProperties = {
  marginTop: "4px",
  color: "#475569",
  fontSize: "0.9rem",
};

const controlsActionRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const filterPanelStyle: React.CSSProperties = {
  borderRadius: "16px",
  padding: "14px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
};

const filterPanelTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#111827",
  marginBottom: "10px",
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

const messageListStyle: React.CSSProperties = {
  display: "grid",
  gap: "6px",
  color: "#92400e",
  fontWeight: 700,
};

const deviceGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
};

const deviceCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "12px",
  background: "#f8fafc",
  display: "grid",
  gap: "10px",
};

const deviceCompactTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: "10px",
};

const deviceRefStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 800,
  color: "#111827",
  lineHeight: 1.1,
};

const deviceTypeStyle: React.CSSProperties = {
  marginTop: "4px",
  color: "#374151",
  fontWeight: 700,
  lineHeight: 1.2,
};

const deviceCompactMetaStyle: React.CSSProperties = {
  marginTop: "4px",
  color: "#6b7280",
  fontSize: "0.86rem",
  lineHeight: 1.35,
};

const statusPillWrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  alignItems: "end",
  flexShrink: 0,
};

const statusPillStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "0.74rem",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const miniInfoRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
};

const miniInfoPillStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  color: "#475569",
  fontSize: "0.8rem",
};

const deviceActionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr",
  gap: "8px",
};

const compactButtonStyle: React.CSSProperties = {
  minHeight: "46px",
  fontSize: "0.88rem",
  padding: "10px 8px",
};

const unlockButtonStyle: React.CSSProperties = {
  border: "1px solid #4f46e5",
  color: "#3730a3",
};

const expandedNoteWrapStyle: React.CSSProperties = {
  borderTop: "1px solid #e5e7eb",
  paddingTop: "10px",
  display: "grid",
  gap: "10px",
};

const expandedNoteActionsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const reviewOnlyHintStyle: React.CSSProperties = {
  fontSize: "0.86rem",
  color: "#92400e",
  fontWeight: 700,
};

const emptyTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
};