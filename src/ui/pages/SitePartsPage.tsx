// src/ui/pages/SitePartsPage.tsx

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

import type { SiteFile } from "../../core";
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

const DISCIPLINE_LABELS: Record<PartDiscipline | "all", string> = {
  all: "All",
  "fire-alarm": "Fire Alarm",
  "intruder-alarm": "Intruder Alarm",
  cctv: "CCTV",
  "access-control": "Access Control",
  "emergency-lighting": "Emergency Lighting",
};

function sortInstalledParts(parts: InstalledPartRecord[]) {
  return [...parts].sort((a, b) => {
    const aTitle = `${a.discipline} ${a.title} ${a.locationText ?? ""}`.toLowerCase();
    const bTitle = `${b.discipline} ${b.title} ${b.locationText ?? ""}`.toLowerCase();
    return aTitle.localeCompare(bTitle);
  });
}

export function SitePartsPage() {
  const navigate = useNavigate();
  const { siteFile, updateSite, loading, error } = useFirestoreSite();

  const typedSiteFile = siteFile as SiteFileWithParts | undefined;

  const [search, setSearch] = useState("");
  const [selectedDiscipline, setSelectedDiscipline] =
    useState<PartDiscipline | "all">("all");
  const [showAddModal, setShowAddModal] = useState(false);

  const activeVisit = useMemo(() => {
    if (!siteFile) return undefined;

    return [...siteFile.visits]
      .filter((visit) => visit.status === "draft" || visit.status === "in-progress")
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))[0];
  }, [siteFile]);

  const installedParts = useMemo(() => {
    if (!typedSiteFile) return [];

    const raw = typedSiteFile.installedParts ?? [];
    const q = search.trim().toLowerCase();

    return sortInstalledParts(
      raw.filter((part) => {
        const disciplineMatch =
          selectedDiscipline === "all" || part.discipline === selectedDiscipline;

        const searchMatch =
          !q ||
          [
            part.title,
            part.manufacturer,
            part.partCode,
            part.category,
            part.locationText,
            part.linkedAssetReference,
            part.discipline,
            part.notes,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q);

        return disciplineMatch && searchMatch;
      })
    );
  }, [typedSiteFile, search, selectedDiscipline]);

  const totalInstalledQuantity = useMemo(() => {
    return (typedSiteFile?.installedParts ?? []).reduce(
      (sum, part) => sum + (part.quantity ?? 0),
      0
    );
  }, [typedSiteFile]);

  const handleEditPart = async (part: InstalledPartRecord) => {
    if (!typedSiteFile) return;

    const newTitle = window.prompt("Part name:", part.title ?? "");
    if (newTitle === null) return;

    const newQtyInput = window.prompt("Quantity:", String(part.quantity ?? 1));
    if (newQtyInput === null) return;

    const newQty = Number(newQtyInput);

    if (!Number.isFinite(newQty) || newQty < 0) {
      window.alert("Please enter a valid quantity.");
      return;
    }

    const newLocation = window.prompt("Location:", part.locationText ?? "");
    if (newLocation === null) return;

    const newNotes = window.prompt("Notes:", part.notes ?? "");
    if (newNotes === null) return;

    const updatedParts = (typedSiteFile.installedParts ?? []).map((existingPart) =>
      existingPart.id === part.id
        ? {
            ...existingPart,
            title: newTitle.trim(),
            quantity: newQty,
            locationText: newLocation.trim(),
            notes: newNotes.trim(),
            updatedAt: new Date().toISOString(),
          }
        : existingPart
    );

    await updateSite({
      ...typedSiteFile,
      installedParts: updatedParts,
    });
  };

  const handleDeletePart = async (part: InstalledPartRecord) => {
    if (!typedSiteFile) return;

    const confirmed = window.confirm(
      `Delete this part?\n\n${part.title} x${part.quantity}`
    );

    if (!confirmed) return;

    const updatedParts = (typedSiteFile.installedParts ?? []).filter(
      (existingPart) => existingPart.id !== part.id
    );

    await updateSite({
      ...typedSiteFile,
      installedParts: updatedParts,
    });
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

  return (
    <AppLayout
      title="Installed Parts"
      subtitle={`${typedSiteFile.site.name} • ${
        typedSiteFile.site.siteCode ?? typedSiteFile.site.id
      }`}
      sessionStatus={{
        isVisitActive: !!activeVisit,
        visitLabel: activeVisit?.visitType,
        engineerName: activeVisit?.engineerName,
        startedAt: activeVisit?.startedAt,
        serviceColumnLabel: activeVisit?.serviceColumnKey?.toUpperCase(),
      }}
    >
      <div style={pageGridStyle}>
        <Card>
          <div style={heroWrapStyle}>
            <div>
              <div style={eyebrowStyle}>SITE PARTS REGISTER</div>
              <div style={heroTitleStyle}>Installed Parts & Activity</div>
              <div style={heroSubStyle}>
                Record fitted parts across fire, intruder, CCTV, access, and emergency
                lighting without engineers overwriting each other.
              </div>
            </div>

            <div style={heroActionStackStyle}>
              <div style={heroBadgeStyle}>{totalInstalledQuantity} Parts Installed</div>

              <PrimaryButton
                onClick={() => setShowAddModal(true)}
                style={heroButtonStyle}
              >
                + Add Part
              </PrimaryButton>
            </div>
          </div>
        </Card>

        <PartsDashboard
          installedParts={typedSiteFile.installedParts ?? []}
          partActions={typedSiteFile.partActions ?? []}
          activeVisitId={activeVisit?.id}
        />

        {activeVisit ? (
          <Card>
            <CardTitle>Live Visit Link</CardTitle>
            <div style={liveVisitBannerStyle}>
              <div>
                <div style={liveVisitTitleStyle}>
                  {activeVisit.visitType}
                  {activeVisit.serviceColumnKey
                    ? ` • ${activeVisit.serviceColumnKey.toUpperCase()}`
                    : ""}
                </div>
                <div style={liveVisitMetaStyle}>
                  {activeVisit.engineerName || "No engineer"} •{" "}
                  {activeVisit.startedAt
                    ? formatIrishDateTime(activeVisit.startedAt)
                    : "No start time"}
                </div>
              </div>

              <SecondaryButton
                onClick={() =>
                  navigate(
                    `/site/${typedSiteFile.metadata.siteFileId}/visit/${activeVisit.id}`,
                    { state: { visit: activeVisit } }
                  )
                }
              >
                Open Live Visit
              </SecondaryButton>
            </div>
          </Card>
        ) : null}

        <Card>
          <CardTitle>Controls</CardTitle>

          <div style={controlsGridStyle}>
            <Field label="Search Parts">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={inputStyle}
                placeholder="Part, manufacturer, code, location, asset ref..."
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
              <PrimaryButton onClick={() => setShowAddModal(true)}>
                Add Part Action
              </PrimaryButton>

              <SecondaryButton
                onClick={() =>
                  navigate(`/site/${typedSiteFile.metadata.siteFileId}/parts/history`)
                }
              >
                View History
              </SecondaryButton>

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
          <CardTitle>Installed Parts Register</CardTitle>

          {installedParts.length === 0 ? (
            <p style={emptyTextStyle}>No installed parts recorded yet.</p>
          ) : (
            <div style={gridListStyle}>
              {installedParts.map((part) => (
                <div key={part.id} style={itemCardStyle}>
                  <div style={itemTopStyle}>
                    <div>
                      <div style={itemTitleStyle}>{part.title}</div>
                      <div style={itemMetaStyle}>
                        {DISCIPLINE_LABELS[part.discipline]} • Qty {part.quantity}
                      </div>
                    </div>

                    <span
                      style={{
                        ...pillStyle,
                        background:
                          part.status === "installed"
                            ? "#dcfce7"
                            : part.status === "temporary"
                              ? "#fef3c7"
                              : "#f3f4f6",
                        color:
                          part.status === "installed"
                            ? "#166534"
                            : part.status === "temporary"
                              ? "#92400e"
                              : "#374151",
                      }}
                    >
                      {part.status}
                    </span>
                  </div>

                  <div style={detailGridStyle}>
                    <div>
                      <strong>Manufacturer:</strong> {part.manufacturer ?? "—"}
                    </div>
                    <div>
                      <strong>Part Code:</strong> {part.partCode ?? "—"}
                    </div>
                    <div>
                      <strong>Category:</strong> {part.category ?? "—"}
                    </div>
                    <div>
                      <strong>Asset Ref:</strong> {part.linkedAssetReference ?? "—"}
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <strong>Location:</strong> {part.locationText ?? "—"}
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <strong>Notes:</strong> {part.notes ?? "—"}
                    </div>
                  </div>

                  <div style={partButtonRowStyle}>
                    <SecondaryButton onClick={() => handleEditPart(part)}>
                      Edit
                    </SecondaryButton>

                    <button
                      type="button"
                      onClick={() => handleDeletePart(part)}
                      style={deleteButtonStyle}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {showAddModal ? (
        <AddPartActionModal
          siteFile={typedSiteFile}
          activeVisit={activeVisit}
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

const liveVisitBannerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "14px",
  borderRadius: "18px",
  background: "linear-gradient(180deg, #ecfdf5 0%, #dcfce7 100%)",
  border: "1px solid #86efac",
};

const liveVisitTitleStyle: CSSProperties = {
  fontWeight: 900,
  color: "#166534",
  fontSize: "1rem",
};

const liveVisitMetaStyle: CSSProperties = {
  marginTop: "4px",
  color: "#15803d",
  fontSize: "0.92rem",
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

const gridListStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const itemCardStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "14px",
  background: "#f8fafc",
  display: "grid",
  gap: "12px",
};

const itemTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: "10px",
};

const itemTitleStyle: CSSProperties = {
  fontSize: "1rem",
  fontWeight: 900,
  color: "#111827",
};

const itemMetaStyle: CSSProperties = {
  marginTop: "4px",
  color: "#6b7280",
  fontWeight: 700,
  fontSize: "0.92rem",
};

const detailGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px 12px",
  color: "#374151",
  fontSize: "0.92rem",
};

const partButtonRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  justifyContent: "flex-end",
  borderTop: "1px solid #e5e7eb",
  paddingTop: "10px",
};

const deleteButtonStyle: CSSProperties = {
  border: "1px solid #fecaca",
  background: "#fee2e2",
  color: "#991b1b",
  borderRadius: "12px",
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const pillStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "0.76rem",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const emptyTextStyle: CSSProperties = {
  margin: 0,
  color: "#6b7280",
};