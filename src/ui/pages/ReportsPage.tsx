// src/ui/pages/ReportsPage.tsx

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  exportSiteFileJson,
  getSiteFileDownloadName,
  openVisitPdfPrintWindow,
} from "../../core";
import { downloadVisitPdf } from "../../core/reports/downloadVisitPdf";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { cleanFirestoreData } from "../../utils/cleanFirestoreData";
import { AppLayout } from "../layouts/AppLayout";
import {
  Card,
  CardTitle,
  PrimaryButton,
  SecondaryButton,
} from "../components/ui";
import { formatIrishDate, formatIrishDateTime } from "../utils/dateTime";

function downloadFile(filename: string, data: string) {
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function statusBadgeStyle(status?: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "0.76rem",
    fontWeight: 800,
    whiteSpace: "nowrap",
  };

  switch ((status ?? "").toLowerCase()) {
    case "completed":
      return { ...base, background: "#dcfce7", color: "#166534" };
    case "in-progress":
      return { ...base, background: "#dbeafe", color: "#1d4ed8" };
    case "abandoned":
      return { ...base, background: "#fee2e2", color: "#b91c1c" };
    case "exported":
      return { ...base, background: "#ede9fe", color: "#6d28d9" };
    case "draft":
    default:
      return { ...base, background: "#f3f4f6", color: "#374151" };
  }
}

function getVisitTypeLabel(value?: string) {
  switch (value) {
    case "routine-service":
      return "Routine Service";
    case "fault-visit":
      return "Fault Visit";
    case "reactive-callout":
      return "Reactive Callout";
    case "commissioning":
      return "Commissioning";
    case "small-works":
      return "Small Works";
    case "inspection":
      return "Inspection";
    case "verification":
      return "Verification";
    case "other":
      return "Other";
    default:
      return value ?? "Visit";
  }
}

export function ReportsPage() {
  const navigate = useNavigate();
  const { siteFile, updateSite, loading, error } = useFirestoreSite();

  const [messages, setMessages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const sortedVisits = useMemo(() => {
    if (!siteFile) return [];
    return [...siteFile.visits].sort((a, b) =>
      (b.startedAt ?? "").localeCompare(a.startedAt ?? "")
    );
  }, [siteFile]);

  const reportStats = useMemo(() => {
    const total = sortedVisits.length;
    const drafts = sortedVisits.filter((visit) => visit.status === "draft").length;
    const completed = sortedVisits.filter((visit) => visit.status === "completed").length;
    const exported = sortedVisits.filter(
      (visit) => visit.status === "exported" || visit.exportPdfCreated === "yes"
    ).length;

    return { total, drafts, completed, exported };
  }, [sortedVisits]);

  if (loading) {
    return (
      <AppLayout title="Loading reports">
        <Card>Loading reports...</Card>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Reports error">
        <Card>{error}</Card>
      </AppLayout>
    );
  }

  if (!siteFile) {
    return (
      <AppLayout title="Reports not found">
        <Card>
          <p style={{ marginTop: 0 }}>The requested site could not be found.</p>
          <SecondaryButton onClick={() => navigate("/")}>Back to Sites</SecondaryButton>
        </Card>
      </AppLayout>
    );
  }

  const exportSite = () => {
    try {
      const data = exportSiteFileJson(siteFile);
      const name = getSiteFileDownloadName(siteFile);
      downloadFile(name, data);
      setMessages([`Site file exported as ${name}.`]);
    } catch (e) {
      setMessages([e instanceof Error ? e.message : "Failed to export site."]);
    }
  };

  const exportBackup = () => {
    try {
      const data = JSON.stringify(siteFile, null, 2);
      const safeName = (siteFile.site.name || "site")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "_");
      const name = `${safeName}_backup_${Date.now()}.json`;
      downloadFile(name, data);
      setMessages([`Backup exported as ${name}.`]);
    } catch (e) {
      setMessages([e instanceof Error ? e.message : "Failed to create backup."]);
    }
  };

  const generateVisitPdf = (visitId: string) => {
    try {
      openVisitPdfPrintWindow(siteFile, visitId);
      setMessages(["Print preview opened."]);
    } catch (e) {
      setMessages([e instanceof Error ? e.message : "Failed to generate print preview."]);
    }
  };

  const handleDownloadPdf = async (visitId: string) => {
    try {
      await downloadVisitPdf(siteFile, visitId);
      setMessages(["PDF download started."]);
    } catch (e) {
      setMessages([e instanceof Error ? e.message : "Failed to download PDF."]);
    }
  };

  const handleDeleteDraft = async (visitId: string) => {
    const visit = siteFile.visits.find((v) => v.id === visitId);
    if (!visit) return;

    if (visit.status !== "draft") {
      setMessages(["Only draft visits can be deleted from this screen."]);
      return;
    }

    const confirmed = window.confirm(
      `Delete draft visit "${getVisitTypeLabel(visit.visitType)}" for ${visit.engineerName || "unknown engineer"}?`
    );
    if (!confirmed) return;

    try {
      const next = JSON.parse(JSON.stringify(siteFile));
      next.visits = next.visits.filter((v: { id: string }) => v.id !== visitId);
      next.metadata.updatedAt = new Date().toISOString();

      setSaving(true);
      try {
        await updateSite(cleanFirestoreData(next));
      } finally {
        setSaving(false);
      }

      setMessages([`Draft visit deleted.`]);
    } catch (e) {
      setMessages([e instanceof Error ? e.message : "Failed to delete draft visit."]);
    }
  };

  return (
    <AppLayout
      title="Reports & Export"
      subtitle={`${siteFile.site.name} • ${siteFile.site.siteCode ?? siteFile.site.id}`}
    >
      <div style={pageGridStyle}>
        <Card>
          <div style={heroWrapStyle}>
            <div>
              <div style={eyebrowStyle}>REPORTING HUB</div>
              <div style={heroTitleStyle}>Visits, PDFs & Site Exports</div>
              <div style={heroSubStyle}>
                Review visit records, generate printable reports, download PDFs, and
                export the site file for backup or transfer.
              </div>
            </div>

            <div style={heroBadgeStyle}>{reportStats.total} Reports</div>
          </div>
        </Card>

        <Card>
          <CardTitle>Reporting Overview</CardTitle>
          <div style={statsGridStyle}>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Total Visits</div>
              <div style={statValueStyle}>{reportStats.total}</div>
            </div>

            <div style={statCardStyle}>
              <div style={statLabelStyle}>Drafts</div>
              <div style={statValueStyle}>{reportStats.drafts}</div>
            </div>

            <div style={statCardStyle}>
              <div style={statLabelStyle}>Completed</div>
              <div style={statValueStyle}>{reportStats.completed}</div>
            </div>

            <div style={statCardStyle}>
              <div style={statLabelStyle}>Exported</div>
              <div style={statValueStyle}>{reportStats.exported}</div>
            </div>
          </div>
        </Card>

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
          <CardTitle>Visit Reports</CardTitle>

          {sortedVisits.length === 0 ? (
            <p style={emptyTextStyle}>No visits recorded yet.</p>
          ) : (
            <div style={visitGridStyle}>
              {sortedVisits.map((visit) => {
                const isDraft = visit.status === "draft";
                const linkedFaults = visit.faultIds?.length ?? 0;
                const linkedReplacements = visit.replacementIds?.length ?? 0;
                const linkedPhotos = visit.photoIds?.length ?? 0;

                return (
                  <div key={visit.id} style={visitCardStyle}>
                    <div style={visitTopRowStyle}>
                      <div style={{ minWidth: 0 }}>
                        <div style={visitTitleStyle}>
                          {getVisitTypeLabel(visit.visitType)}
                        </div>
                        <div style={visitSubStyle}>
                          {visit.engineerName || "No engineer"} •{" "}
                          {visit.startedAt ? formatIrishDate(visit.startedAt) : "No date"}
                        </div>
                      </div>

                      <span style={statusBadgeStyle(visit.status)}>
                        {visit.status ?? "draft"}
                      </span>
                    </div>

                    <div style={visitMetaGridStyle}>
                      <div>
                        <strong>Started:</strong>{" "}
                        {visit.startedAt ? formatIrishDateTime(visit.startedAt) : "—"}
                      </div>
                      <div>
                        <strong>Completed:</strong>{" "}
                        {visit.completedAt ? formatIrishDateTime(visit.completedAt) : "—"}
                      </div>
                      <div>
                        <strong>Discipline:</strong> {visit.discipline ?? "—"}
                      </div>
                      <div>
                        <strong>System Status:</strong> {visit.systemStatus ?? "—"}
                      </div>
                      <div>
                        <strong>Service Column:</strong>{" "}
                        {visit.serviceColumnKey ? visit.serviceColumnKey.toUpperCase() : "—"}
                      </div>
                      <div>
                        <strong>Visit ID:</strong> {visit.id}
                      </div>
                    </div>

                    <div style={summaryPillsWrapStyle}>
                      <span style={summaryPillStyle}>Faults: {linkedFaults}</span>
                      <span style={summaryPillStyle}>Replacements: {linkedReplacements}</span>
                      <span style={summaryPillStyle}>Photos: {linkedPhotos}</span>
                    </div>

                    {(visit.workCarriedOut ||
                      visit.faultsFound ||
                      visit.actionsTaken ||
                      visit.recommendations) && (
                      <div style={visitNotePreviewStyle}>
                        {visit.workCarriedOut ? (
                          <div style={noteLineStyle}>
                            <strong>Work:</strong> {visit.workCarriedOut}
                          </div>
                        ) : null}
                        {visit.faultsFound ? (
                          <div style={noteLineStyle}>
                            <strong>Faults:</strong> {visit.faultsFound}
                          </div>
                        ) : null}
                        {visit.actionsTaken ? (
                          <div style={noteLineStyle}>
                            <strong>Actions:</strong> {visit.actionsTaken}
                          </div>
                        ) : null}
                        {visit.recommendations ? (
                          <div style={noteLineStyle}>
                            <strong>Recommendations:</strong> {visit.recommendations}
                          </div>
                        ) : null}
                      </div>
                    )}

                    <div style={visitActionsGridStyle}>
                      <SecondaryButton
                        onClick={() =>
                          navigate(`/site/${siteFile.metadata.siteFileId}/visit/${visit.id}`)
                        }
                        disabled={saving}
                      >
                        Edit Visit
                      </SecondaryButton>

                      <SecondaryButton
                        onClick={() => generateVisitPdf(visit.id)}
                        disabled={saving}
                      >
                        Print Preview
                      </SecondaryButton>

                      <PrimaryButton
                        onClick={() => handleDownloadPdf(visit.id)}
                        disabled={saving}
                      >
                        Download PDF
                      </PrimaryButton>

                      {isDraft ? (
                        <SecondaryButton
                          onClick={() => handleDeleteDraft(visit.id)}
                          disabled={saving}
                          style={dangerButtonStyle}
                        >
                          Delete Draft
                        </SecondaryButton>
                      ) : (
                        <SecondaryButton
                          onClick={() =>
                            navigate(`/site/${siteFile.metadata.siteFileId}/visit/${visit.id}`)
                          }
                          disabled={saving}
                        >
                          Review Record
                        </SecondaryButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Site Export</CardTitle>
          <div style={exportSectionStyle}>
            <div style={exportTextBlockStyle}>
              <div style={exportTitleStyle}>SeCo Site File</div>
              <div style={exportSubStyle}>
                Export this site as a structured file for sharing, migration, or restore.
              </div>
            </div>

            <PrimaryButton onClick={exportSite} disabled={saving}>
              Export Site File
            </PrimaryButton>
          </div>

          <div style={dividerStyle} />

          <div style={exportSectionStyle}>
            <div style={exportTextBlockStyle}>
              <div style={exportTitleStyle}>Raw JSON Backup</div>
              <div style={exportSubStyle}>
                Download a full JSON backup snapshot for safekeeping.
              </div>
            </div>

            <SecondaryButton onClick={exportBackup} disabled={saving}>
              Download Backup
            </SecondaryButton>
          </div>
        </Card>

        <Card>
          <CardTitle>Navigation</CardTitle>
          <div style={navActionGridStyle}>
            <SecondaryButton
              onClick={() => navigate(`/site/${siteFile.metadata.siteFileId}/overview`)}
            >
              Back to Overview
            </SecondaryButton>

            <PrimaryButton
              onClick={() => navigate(`/site/${siteFile.metadata.siteFileId}/visit/new`)}
            >
              Start New Visit
            </PrimaryButton>
          </div>
        </Card>
      </div>
    </AppLayout>
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

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
};

const statCardStyle: React.CSSProperties = {
  padding: "14px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
};

const statLabelStyle: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "#6b7280",
  fontWeight: 700,
  marginBottom: "6px",
};

const statValueStyle: React.CSSProperties = {
  fontSize: "1.2rem",
  color: "#111827",
  fontWeight: 800,
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

const visitGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};

const visitCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "14px",
  background: "#ffffff",
  display: "grid",
  gap: "12px",
};

const visitTopRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: "10px",
};

const visitTitleStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 800,
  color: "#111827",
  lineHeight: 1.2,
};

const visitSubStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "0.9rem",
  marginTop: "4px",
  lineHeight: 1.35,
};

const visitMetaGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px 12px",
  color: "#374151",
  fontSize: "0.92rem",
};

const summaryPillsWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const summaryPillStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#f3f4f6",
  color: "#374151",
  fontSize: "0.78rem",
  fontWeight: 700,
};

const visitNotePreviewStyle: React.CSSProperties = {
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  padding: "12px",
  display: "grid",
  gap: "6px",
};

const noteLineStyle: React.CSSProperties = {
  color: "#111827",
  lineHeight: 1.4,
  fontSize: "0.92rem",
};

const visitActionsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const dangerButtonStyle: React.CSSProperties = {
  border: "1px solid #ef4444",
  color: "#b91c1c",
};

const exportSectionStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
};

const exportTextBlockStyle: React.CSSProperties = {
  display: "grid",
  gap: "4px",
};

const exportTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#111827",
};

const exportSubStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "0.92rem",
  lineHeight: 1.4,
};

const dividerStyle: React.CSSProperties = {
  height: "1px",
  background: "#e5e7eb",
  margin: "14px 0",
};

const navActionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};