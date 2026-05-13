// src/ui/pages/SitePartsPage.tsx

import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

import type { SiteFile, VisitRecord } from "../../core";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";

import { AppLayout } from "../layouts/AppLayout";
import {
  Card,
  CardTitle,
  Field,
  PrimaryButton,
  SecondaryButton,
  inputStyle,
} from "../components/ui";

import { AddPartActionModal } from "../components/AddPartActionModal";
import { PartsDashboard } from "../components/PartsDashboard";

import type {
  InstalledPartRecord,
  PartActionRecord,
  PartDiscipline,
} from "../../core/types/parts";
import { PART_DISCIPLINE_OPTIONS } from "../../core/types/parts";
import { formatIrishDateTime } from "../utils/dateTime";

type SiteFileWithParts = SiteFile & {
  installedParts?: InstalledPartRecord[];
  partActions?: PartActionRecord[];
};

type TotalsRow = {
  key: string;
  title: string;
  discipline: PartDiscipline;
  manufacturer?: string;
  partCode?: string;
  category?: string;
  locationText?: string;
  quantity: number;
};

const DISCIPLINE_LABELS: Record<PartDiscipline | "all", string> = {
  all: "All",
  "fire-alarm": "Fire Alarm",
  "intruder-alarm": "Intruder Alarm",
  cctv: "CCTV",
  "access-control": "Access Control",
  "emergency-lighting": "Emergency Lighting",
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

function getVisitDateLabel(visit: VisitRecord, fallbackIndex: number) {
  const rawDate =
    visit.startedAt ||
    visit.updatedAt ||
    visit.createdAt ||
    new Date().toISOString();

  const date = new Date(rawDate);

  if (Number.isNaN(date.getTime())) {
    return `Visit ${fallbackIndex + 1}`;
  }

  return `Visit ${fallbackIndex + 1} — ${date.toLocaleDateString("en-IE")}`;
}

function getVisitSortValue(visit: VisitRecord) {
  return visit.startedAt || visit.updatedAt || visit.createdAt || "";
}

function actionQuantityDelta(action: PartActionRecord) {
  if (action.actionType === "remove" || action.actionType === "return") {
    return -Math.abs(action.quantity ?? 0);
  }

  return Math.abs(action.quantity ?? 0);
}

function buildTotalKey(action: PartActionRecord) {
  return [
    action.discipline,
    action.title?.trim().toLowerCase(),
    action.manufacturer?.trim().toLowerCase() ?? "",
    action.partCode?.trim().toLowerCase() ?? "",
    action.category?.trim().toLowerCase() ?? "",
    action.locationText?.trim().toLowerCase() ?? "",
  ].join("|");
}

function actionMatchesSearch(action: PartActionRecord, search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return true;

  return [
    action.title,
    action.manufacturer,
    action.partCode,
    action.category,
    action.locationText,
    action.linkedAssetReference,
    action.discipline,
    action.note,
    action.engineerName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(q);
}

function actionMatchesDiscipline(
  action: PartActionRecord,
  selectedDiscipline: PartDiscipline | "all"
) {
  return selectedDiscipline === "all" || action.discipline === selectedDiscipline;
}

export function SitePartsPage() {
  const navigate = useNavigate();
  const { siteFile, updateSite, loading, error } = useFirestoreSite();

  const typedSiteFile = siteFile as SiteFileWithParts | undefined;

  const [search, setSearch] = useState("");
  const [selectedDiscipline, setSelectedDiscipline] =
    useState<PartDiscipline | "all">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string | undefined>();
  const [highlightVisitId, setHighlightVisitId] = useState<string | undefined>();
  const [message, setMessage] = useState<string>("");

  const visitRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const visits = useMemo(() => {
    if (!typedSiteFile?.visits) return [];

    return [...typedSiteFile.visits].sort((a, b) =>
      getVisitSortValue(a).localeCompare(getVisitSortValue(b))
    );
  }, [typedSiteFile?.visits]);

  const selectedVisit = useMemo(() => {
    if (!visits.length) return undefined;

    if (selectedVisitId) {
      const found = visits.find((visit) => visit.id === selectedVisitId);
      if (found) return found;
    }

    return visits[visits.length - 1];
  }, [selectedVisitId, visits]);

  const filteredActions = useMemo(() => {
    const actions = typedSiteFile?.partActions ?? [];

    return actions
      .filter((action) => actionMatchesDiscipline(action, selectedDiscipline))
      .filter((action) => actionMatchesSearch(action, search))
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [typedSiteFile?.partActions, selectedDiscipline, search]);

  const allActionsByVisitId = useMemo(() => {
    const map = new Map<string, PartActionRecord[]>();

    for (const action of typedSiteFile?.partActions ?? []) {
      const visitId = action.visitId || "no-active-visit";
      const existing = map.get(visitId) ?? [];
      existing.push(action);
      map.set(visitId, existing);
    }

    return map;
  }, [typedSiteFile?.partActions]);

  const actionsByVisitId = useMemo(() => {
    const map = new Map<string, PartActionRecord[]>();

    for (const action of filteredActions) {
      const visitId = action.visitId || "no-active-visit";
      const existing = map.get(visitId) ?? [];
      existing.push(action);
      map.set(visitId, existing);
    }

    return map;
  }, [filteredActions]);

  const hasEmptyLatestVisit = useMemo(() => {
    if (!visits.length) return false;
    const latestVisit = visits[visits.length - 1];
    return (allActionsByVisitId.get(latestVisit.id) ?? []).length === 0;
  }, [allActionsByVisitId, visits]);

  const totals = useMemo(() => {
    const totalsMap = new Map<string, TotalsRow>();

    for (const action of filteredActions) {
      const key = buildTotalKey(action);
      const existing = totalsMap.get(key);

      if (existing) {
        existing.quantity += actionQuantityDelta(action);
      } else {
        totalsMap.set(key, {
          key,
          title: action.title,
          discipline: action.discipline,
          manufacturer: action.manufacturer,
          partCode: action.partCode,
          category: action.category,
          locationText: action.locationText,
          quantity: actionQuantityDelta(action),
        });
      }
    }

    return [...totalsMap.values()]
      .filter((row) => row.quantity !== 0)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [filteredActions]);

  const totalInstalledQuantity = useMemo(() => {
    return totals.reduce((sum, row) => sum + Math.max(0, row.quantity), 0);
  }, [totals]);

  const handleAddVisit = async () => {
    if (!typedSiteFile) return;

    if (hasEmptyLatestVisit) {
      const latestVisit = visits[visits.length - 1];

      setSelectedVisitId(latestVisit.id);
      setHighlightVisitId(latestVisit.id);
      setMessage("You already have an empty visit. Add parts to it before creating another.");

      setTimeout(() => {
        visitRefs.current[latestVisit.id]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);

      setTimeout(() => setHighlightVisitId(undefined), 2500);
      return;
    }

    const now = nowIso();
    const nextVisitNumber = (typedSiteFile.visits?.length ?? 0) + 1;

    const newVisit = {
      id: makeId("visit"),
      visitType: `Visit ${nextVisitNumber}`,
      engineerName: "Site Team",
      status: "in-progress",
      startedAt: now,
      updatedAt: now,
      notes: "",
    } as unknown as VisitRecord;

    const next: SiteFileWithParts = {
      ...typedSiteFile,
      visits: [...(typedSiteFile.visits ?? []), newVisit],
      metadata: {
        ...typedSiteFile.metadata,
        updatedAt: now,
      },
    };

    await updateSite(next);

    setSelectedVisitId(newVisit.id);
    setHighlightVisitId(newVisit.id);
    setMessage(`Created Visit ${nextVisitNumber}. Add parts to this visit.`);

    setTimeout(() => {
      visitRefs.current[newVisit.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 300);

    setTimeout(() => setHighlightVisitId(undefined), 2500);
  };

  const handleDeleteVisit = async (visit: VisitRecord) => {
    if (!typedSiteFile) return;

    const visitActions = typedSiteFile.partActions?.filter(
      (action) => action.visitId === visit.id
    );

    const confirmed = window.confirm(
      visitActions?.length
        ? "Delete this visit?\n\nParts assigned to this visit will become unassigned."
        : "Delete this empty visit?"
    );

    if (!confirmed) return;

    const updatedActions = (typedSiteFile.partActions ?? []).map((action) =>
      action.visitId === visit.id ? { ...action, visitId: undefined } : action
    );

    const updatedVisits = (typedSiteFile.visits ?? []).filter(
      (existingVisit) => existingVisit.id !== visit.id
    );

    await updateSite({
      ...typedSiteFile,
      visits: updatedVisits,
      partActions: updatedActions,
      metadata: {
        ...typedSiteFile.metadata,
        updatedAt: nowIso(),
      },
    });

    if (selectedVisitId === visit.id) {
      setSelectedVisitId(updatedVisits[updatedVisits.length - 1]?.id);
    }

    setMessage("Visit deleted.");
  };

  const handleMoveLegacyToVisitOne = async () => {
    if (!typedSiteFile || !visits.length) return;

    const visitOne = visits[0];

    const updatedActions = (typedSiteFile.partActions ?? []).map((action) =>
      !action.visitId || action.visitId === "no-active-visit"
        ? { ...action, visitId: visitOne.id }
        : action
    );

    await updateSite({
      ...typedSiteFile,
      partActions: updatedActions,
      metadata: {
        ...typedSiteFile.metadata,
        updatedAt: nowIso(),
      },
    });

    setSelectedVisitId(visitOne.id);
    setHighlightVisitId(visitOne.id);
    setMessage("Legacy parts moved to Visit 1.");

    setTimeout(() => {
      visitRefs.current[visitOne.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 200);

    setTimeout(() => setHighlightVisitId(undefined), 2500);
  };

  const openAddPartForVisit = (visitId: string) => {
    setSelectedVisitId(visitId);
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <AppLayout title="Installed Parts">
        <Card>Loading site parts...</Card>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Parts error">
        <Card>{error}</Card>
      </AppLayout>
    );
  }

  if (!typedSiteFile) {
    return (
      <AppLayout title="Parts not found">
        <Card>
          <p style={{ marginTop: 0 }}>The requested site could not be found.</p>
          <SecondaryButton onClick={() => navigate("/")}>Back to Sites</SecondaryButton>
        </Card>
      </AppLayout>
    );
  }

  const unassignedActions = actionsByVisitId.get("no-active-visit") ?? [];

  return (
    <AppLayout
      title="Site Parts"
      subtitle={`${typedSiteFile.site.name} • ${
        typedSiteFile.site.siteCode ?? typedSiteFile.site.id
      }`}
      sessionStatus={{
        isVisitActive: !!selectedVisit,
        visitLabel: selectedVisit?.visitType,
        engineerName: selectedVisit?.engineerName,
        startedAt: selectedVisit?.startedAt,
        serviceColumnLabel: selectedVisit?.serviceColumnKey?.toUpperCase(),
      }}
    >
      <div style={pageGridStyle}>
        <Card>
          <div style={heroWrapStyle}>
            <div>
              <div style={eyebrowStyle}>SITE PARTS REGISTER</div>
              <div style={heroTitleStyle}>Visits & Automatic Totals</div>
              <div style={heroSubStyle}>
                Add parts into the correct visit. Totals are calculated automatically
                from all visit entries.
              </div>
            </div>

            <div style={heroActionStackStyle}>
              <div style={heroBadgeStyle}>{totalInstalledQuantity} Total Parts</div>

              <PrimaryButton onClick={handleAddVisit} style={heroButtonStyle}>
                + Add Visit
              </PrimaryButton>
            </div>
          </div>

          {message ? <div style={messageStyle}>{message}</div> : null}
        </Card>

        <PartsDashboard
          installedParts={typedSiteFile.installedParts ?? []}
          partActions={typedSiteFile.partActions ?? []}
          activeVisitId={selectedVisit?.id}
        />

        <Card>
          <CardTitle>Controls</CardTitle>

          <div style={controlsGridStyle}>
            <Field label="Search Parts">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={inputStyle}
                placeholder="Part, manufacturer, code, location, engineer..."
              />
            </Field>

            <Field label="Discipline">
              <div style={chipWrapStyle}>
                <Chip
                  label="All"
                  active={selectedDiscipline === "all"}
                  onClick={() => setSelectedDiscipline("all")}
                />
                {PART_DISCIPLINE_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    active={selectedDiscipline === option.value}
                    onClick={() => setSelectedDiscipline(option.value)}
                  />
                ))}
              </div>
            </Field>

            <div style={actionsRowStyle}>
              <PrimaryButton onClick={handleAddVisit}>Add Visit</PrimaryButton>

              {selectedVisit ? (
                <PrimaryButton onClick={() => openAddPartForVisit(selectedVisit.id)}>
                  Add Part to Current Visit
                </PrimaryButton>
              ) : null}

              <SecondaryButton
                onClick={() =>
                  navigate(`/site/${typedSiteFile.metadata.siteFileId}/overview`)
                }
              >
                Back to Overview
              </SecondaryButton>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Visits</CardTitle>

          {visits.length === 0 ? (
            <div style={emptyVisitStyle}>
              <p style={emptyTextStyle}>No visits have been created yet.</p>
              <PrimaryButton onClick={handleAddVisit}>Create Visit 1</PrimaryButton>
            </div>
          ) : (
            <div style={gridListStyle}>
              {visits.map((visit, index) => {
                const visitActions = actionsByVisitId.get(visit.id) ?? [];
                const visitTitle = getVisitDateLabel(visit, index);
                const isHighlighted = highlightVisitId === visit.id;
                const isSelected = selectedVisit?.id === visit.id;

                return (
                  <div
                    key={visit.id}
                    ref={(element) => {
                      visitRefs.current[visit.id] = element;
                    }}
                    style={{
                      ...visitCardStyle,
                      ...(isHighlighted ? visitCardHighlightStyle : {}),
                    }}
                  >
                    <div style={visitHeaderStyle}>
                      <div>
                        <div style={visitTitleStyle}>{visitTitle}</div>
                        <div style={visitMetaStyle}>
                          {visit.engineerName || "Site Team"} •{" "}
                          {visit.startedAt
                            ? formatIrishDateTime(visit.startedAt)
                            : "No start time"}
                        </div>

                        <div style={{ marginTop: "10px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVisitId(visit.id);
                              setMessage(`Selected ${visit.visitType}`);
                            }}
                            style={
                              isSelected
                                ? selectedVisitButtonActiveStyle
                                : selectedVisitButtonStyle
                            }
                          >
                            {isSelected ? "Selected Visit" : "Use This Visit"}
                          </button>
                        </div>
                      </div>

                      <div style={visitButtonStackStyle}>
                        <PrimaryButton onClick={() => openAddPartForVisit(visit.id)}>
                          + Add Part
                        </PrimaryButton>

                        <button
                          type="button"
                          onClick={() => handleDeleteVisit(visit)}
                          style={visitDeleteButtonStyle}
                        >
                          Delete Visit
                        </button>
                      </div>
                    </div>

                    {visitActions.length === 0 ? (
                      <p style={emptyTextStyle}>No parts added to this visit yet.</p>
                    ) : (
                      <div style={visitActionListStyle}>
                        {visitActions.map((action) => (
                          <div key={action.id} style={actionRowStyle}>
                            <div>
                              <div style={actionTitleStyle}>
                                {action.title} x{action.quantity}
                              </div>
                              <div style={actionMetaStyle}>
                                {DISCIPLINE_LABELS[action.discipline]} •{" "}
                                {action.engineerName || "Unknown engineer"} •{" "}
                                {action.createdAt
                                  ? formatIrishDateTime(action.createdAt)
                                  : "No time"}
                              </div>

                              <div style={actionDetailStyle}>
                                {action.locationText ? (
                                  <span>Location: {action.locationText}</span>
                                ) : null}
                                {action.manufacturer ? (
                                  <span>Manufacturer: {action.manufacturer}</span>
                                ) : null}
                                {action.partCode ? (
                                  <span>Code: {action.partCode}</span>
                                ) : null}
                                {action.note ? <span>Note: {action.note}</span> : null}
                              </div>
                            </div>

                            <span style={actionTypePillStyle}>{action.actionType}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {unassignedActions.length ? (
                <div style={visitCardStyle}>
                  <div style={visitHeaderStyle}>
                    <div>
                      <div style={visitTitleStyle}>Unassigned Parts</div>
                      <div style={visitMetaStyle}>
                        Parts added before visit tracking was enabled.
                      </div>
                    </div>

                    {visits.length ? (
                      <PrimaryButton onClick={handleMoveLegacyToVisitOne}>
                        Move Legacy Parts to Visit 1
                      </PrimaryButton>
                    ) : null}
                  </div>

                  <div style={visitActionListStyle}>
                    {unassignedActions.map((action) => (
                      <div key={action.id} style={actionRowStyle}>
                        <div>
                          <div style={actionTitleStyle}>
                            {action.title} x{action.quantity}
                          </div>
                          <div style={actionMetaStyle}>
                            {DISCIPLINE_LABELS[action.discipline]} •{" "}
                            {action.engineerName || "Unknown engineer"}
                          </div>
                        </div>

                        <span style={actionTypePillStyle}>{action.actionType}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Automatic Totals</CardTitle>

          {totals.length === 0 ? (
            <p style={emptyTextStyle}>No totals yet. Add parts to a visit first.</p>
          ) : (
            <div style={totalsListStyle}>
              {totals.map((row) => (
                <div key={row.key} style={totalRowStyle}>
                  <div>
                    <div style={totalTitleStyle}>{row.title}</div>
                    <div style={totalMetaStyle}>
                      {DISCIPLINE_LABELS[row.discipline]}
                      {row.manufacturer ? ` • ${row.manufacturer}` : ""}
                      {row.partCode ? ` • ${row.partCode}` : ""}
                      {row.locationText ? ` • ${row.locationText}` : ""}
                    </div>
                  </div>

                  <div style={totalQtyStyle}>x{row.quantity}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {showAddModal && selectedVisit ? (
        <AddPartActionModal
          siteFile={typedSiteFile}
          activeVisit={selectedVisit}
          updateSite={updateSite}
          onClose={() => setShowAddModal(false)}
          onSaved={() => setShowAddModal(false)}
        />
      ) : null}
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

const pageGridStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
};

const heroWrapStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
};

const heroActionStackStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
  minWidth: "150px",
  justifyItems: "end",
};

const heroButtonStyle: CSSProperties = {
  minHeight: "46px",
  borderRadius: "999px",
  padding: "0 18px",
};

const eyebrowStyle: CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 900,
  letterSpacing: "0.1em",
  color: "#6b7280",
  marginBottom: "6px",
};

const heroTitleStyle: CSSProperties = {
  fontSize: "1.45rem",
  fontWeight: 900,
  lineHeight: 1.1,
  color: "#111827",
  marginBottom: "6px",
};

const heroSubStyle: CSSProperties = {
  color: "#6b7280",
  fontSize: "0.95rem",
  lineHeight: 1.35,
  maxWidth: "700px",
};

const heroBadgeStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "8px 12px",
  background: "#eef2ff",
  color: "#3730a3",
  fontSize: "0.82rem",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const messageStyle: CSSProperties = {
  marginTop: "12px",
  borderRadius: "14px",
  padding: "10px 12px",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  fontWeight: 800,
};

const controlsGridStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const actionsRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "10px",
};

const chipWrapStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const chipStyle: CSSProperties = {
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
  borderRadius: "999px",
  padding: "10px 12px",
  fontSize: "0.88rem",
  cursor: "pointer",
};

const chipActiveStyle: CSSProperties = {
  ...chipStyle,
  background: "#111827",
  color: "#fff",
  border: "1px solid #111827",
};

const selectedVisitButtonStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  borderRadius: "10px",
  padding: "8px 12px",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: "0.82rem",
};

const selectedVisitButtonActiveStyle: CSSProperties = {
  ...selectedVisitButtonStyle,
  background: "#dcfce7",
  border: "1px solid #86efac",
  color: "#166534",
};

const gridListStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const emptyVisitStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const visitCardStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "14px",
  background: "#f8fafc",
  display: "grid",
  gap: "12px",
  transition: "box-shadow 0.2s ease, border-color 0.2s ease",
};

const visitCardHighlightStyle: CSSProperties = {
  border: "2px solid #2563eb",
  boxShadow: "0 0 0 5px rgba(37,99,235,0.16)",
};

const visitHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
};

const visitButtonStackStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
  minWidth: "140px",
};

const visitDeleteButtonStyle: CSSProperties = {
  border: "1px solid #fecaca",
  background: "#fee2e2",
  color: "#991b1b",
  borderRadius: "12px",
  padding: "9px 12px",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: "0.82rem",
};

const visitTitleStyle: CSSProperties = {
  fontSize: "1.05rem",
  fontWeight: 900,
  color: "#111827",
};

const visitMetaStyle: CSSProperties = {
  marginTop: "4px",
  color: "#64748b",
  fontWeight: 700,
  fontSize: "0.9rem",
};

const visitActionListStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const actionRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  padding: "12px",
  borderRadius: "14px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
};

const actionTitleStyle: CSSProperties = {
  fontWeight: 900,
  color: "#111827",
};

const actionMetaStyle: CSSProperties = {
  marginTop: "4px",
  color: "#64748b",
  fontSize: "0.86rem",
  fontWeight: 700,
};

const actionDetailStyle: CSSProperties = {
  marginTop: "6px",
  display: "grid",
  gap: "3px",
  color: "#475569",
  fontSize: "0.84rem",
};

const actionTypePillStyle: CSSProperties = {
  height: "fit-content",
  borderRadius: "999px",
  padding: "6px 10px",
  background: "#eef2ff",
  color: "#3730a3",
  fontSize: "0.75rem",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const totalsListStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const totalRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  background: "#ffffff",
};

const totalTitleStyle: CSSProperties = {
  fontWeight: 900,
  color: "#111827",
};

const totalMetaStyle: CSSProperties = {
  marginTop: "4px",
  color: "#64748b",
  fontSize: "0.86rem",
  fontWeight: 700,
};

const totalQtyStyle: CSSProperties = {
  fontWeight: 900,
  fontSize: "1.2rem",
  color: "#111827",
};

const emptyTextStyle: CSSProperties = {
  margin: 0,
  color: "#6b7280",
};