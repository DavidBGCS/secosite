import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { AssetRecord } from "../../core";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { AppLayout } from "../layouts/AppLayout";
import {
  Card,
  CardTitle,
  PrimaryButton,
  SecondaryButton,
} from "../components/ui";
import { formatIrishDate, formatIrishDateTime } from "../utils/dateTime";

type ServiceTickLike = {
  columnKey: string;
  ticked?: boolean;
  locked?: boolean;
  testedAt?: string;
  serviceDate?: string;
  testedBy?: string;
  visitId?: string;
  jobRef?: string;
  note?: string;
};

function safeLower(value: unknown): string {
  return String(value ?? "").toLowerCase().trim();
}

function assetMatchesReference(asset: AssetRecord, candidate: unknown): boolean {
  const assetRef = safeLower(asset.reference);
  const text = safeLower(candidate);
  if (!assetRef || !text) return false;
  return text === assetRef || text.includes(assetRef);
}

function getServiceStatusLabel(tick: ServiceTickLike): string {
  if (tick.ticked && tick.locked) return "Tested / Locked";
  if (tick.ticked) return "Tested";
  if (tick.locked) return "Locked";
  return "Created";
}

export function AssetHistoryPage() {
  const navigate = useNavigate();
  const { assetId } = useParams<{ assetId: string }>();
  const { siteFile, loading, error } = useFirestoreSite();

  const asset = useMemo(() => {
    if (!siteFile || !assetId) return undefined;
    return siteFile.assets.find((item) => item.id === assetId);
  }, [siteFile, assetId]);

  const serviceHistory = useMemo(() => {
    if (!asset) return [];

    const ticks = ((asset.serviceTicks ?? []) as ServiceTickLike[])
      .filter((tick) => tick.ticked || tick.note || tick.locked || tick.testedAt)
      .sort((a, b) => {
        const aDate = a.testedAt ?? a.serviceDate ?? "";
        const bDate = b.testedAt ?? b.serviceDate ?? "";
        return bDate.localeCompare(aDate);
      });

    return ticks;
  }, [asset]);

  const linkedFaults = useMemo(() => {
    if (!siteFile || !asset) return [];

    return [...siteFile.openFaults, ...siteFile.closedFaults].filter((fault: any) => {
      return (
        assetMatchesReference(asset, fault.deviceId) ||
        assetMatchesReference(asset, fault.reference) ||
        assetMatchesReference(asset, fault.assetReference) ||
        assetMatchesReference(asset, fault.title)
      );
    });
  }, [siteFile, asset]);

  const linkedReplacements = useMemo(() => {
    if (!siteFile || !asset) return [];

    return (siteFile.replacementHistory ?? []).filter((replacement: any) => {
      return (
        assetMatchesReference(asset, replacement.deviceId) ||
        assetMatchesReference(asset, replacement.reference) ||
        assetMatchesReference(asset, replacement.assetReference) ||
        safeLower(replacement.assetId) === safeLower(asset.id)
      );
    });
  }, [siteFile, asset]);

  const linkedVisits = useMemo(() => {
    if (!siteFile || !asset) return [];

    const visitIdsFromTicks = new Set(
      serviceHistory
        .map((tick) => tick.visitId)
        .filter(Boolean)
        .map((value) => String(value))
    );

    return siteFile.visits
      .filter((visit: any) => {
        if (visitIdsFromTicks.has(String(visit.id))) return true;

        const faultIds = new Set(linkedFaults.map((fault: any) => String(fault.id)));
        const replacementIds = new Set(linkedReplacements.map((r: any) => String(r.id)));

        const visitFaultIds = (visit.faultIds ?? []).map((id: unknown) => String(id));
        const visitReplacementIds = (visit.replacementIds ?? []).map((id: unknown) =>
          String(id)
        );

        return (
          visitFaultIds.some((id: string) => faultIds.has(id)) ||
          visitReplacementIds.some((id: string) => replacementIds.has(id))
        );
      })
      .sort((a: any, b: any) => {
        const aDate = a.completedAt ?? a.startedAt ?? "";
        const bDate = b.completedAt ?? b.startedAt ?? "";
        return bDate.localeCompare(aDate);
      });
  }, [siteFile, asset, serviceHistory, linkedFaults, linkedReplacements]);

  if (loading) {
    return (
      <AppLayout title="Loading asset history">
        <Card>Loading asset history...</Card>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Asset history error">
        <Card>{error}</Card>
      </AppLayout>
    );
  }

  if (!siteFile || !asset) {
    return (
      <AppLayout title="Asset history not found">
        <Card>
          <p style={{ marginTop: 0 }}>The requested asset could not be found.</p>
          <SecondaryButton
            onClick={() =>
              navigate(siteFile ? `/site/${siteFile.metadata.siteFileId}/assets` : "/")
            }
          >
            Back
          </SecondaryButton>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Asset History"
      subtitle={`${asset.reference} • ${siteFile.site.name}`}
    >
      <div style={pageGridStyle}>
        <Card>
          <div style={heroWrapStyle}>
            <div>
              <div style={eyebrowStyle}>ASSET HISTORY</div>
              <div style={heroTitleStyle}>{asset.reference}</div>
              <div style={heroSubStyle}>
                {asset.assetType} • {asset.locationText ?? "No location"}
              </div>
            </div>

            <div style={heroActionsStyle}>
              <SecondaryButton
                onClick={() =>
                  navigate(`/site/${siteFile.metadata.siteFileId}/assets/${asset.id}/edit`)
                }
              >
                Edit Asset
              </SecondaryButton>
            </div>
          </div>

          <div style={summaryGridStyle}>
            <SummaryPill label="Category" value={asset.category} />
            <SummaryPill label="Loop" value={asset.loop ?? "—"} />
            <SummaryPill label="Address" value={asset.address ?? "—"} />
            <SummaryPill label="Zone" value={asset.zone ?? "—"} />
            <SummaryPill label="Active" value={asset.active ? "Yes" : "No"} />
            <SummaryPill
              label="Trackable"
              value={asset.serviceTrackable ? "Yes" : "No"}
            />
          </div>
        </Card>

        <Card>
          <CardTitle>Service History</CardTitle>

          {serviceHistory.length === 0 ? (
            <p style={emptyTextStyle}>No service history recorded yet.</p>
          ) : (
            <div style={timelineGridStyle}>
              {serviceHistory.map((tick, index) => (
                <div key={`${tick.columnKey}-${tick.testedAt ?? tick.serviceDate ?? index}`} style={timelineCardStyle}>
                  <div style={timelineTopStyle}>
                    <div>
                      <div style={timelineTitleStyle}>
                        {tick.columnKey.toUpperCase()}
                      </div>
                      <div style={timelineMetaStyle}>
                        {tick.testedAt
                          ? formatIrishDateTime(tick.testedAt)
                          : tick.serviceDate
                            ? formatIrishDate(tick.serviceDate)
                            : "No date"}
                      </div>
                    </div>

                    <span style={statusPillStyle}>
                      {getServiceStatusLabel(tick)}
                    </span>
                  </div>

                  <div style={timelineInfoStyle}>
                    <div>
                      <strong>Engineer:</strong> {tick.testedBy ?? "—"}
                    </div>
                    <div>
                      <strong>Visit:</strong> {tick.visitId ?? tick.jobRef ?? "—"}
                    </div>
                    <div>
                      <strong>Locked:</strong> {tick.locked ? "Yes" : "No"}
                    </div>
                  </div>

                  {tick.note ? (
                    <div style={noteBoxStyle}>
                      <div style={noteLabelStyle}>Engineer Note</div>
                      <div style={noteTextStyle}>{tick.note}</div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Linked Faults</CardTitle>

          {linkedFaults.length === 0 ? (
            <p style={emptyTextStyle}>No linked faults found for this asset.</p>
          ) : (
            <div style={listGridStyle}>
              {linkedFaults.map((fault: any) => (
                <div key={fault.id} style={listCardStyle}>
                  <div style={listCardTopStyle}>
                    <div style={listCardTitleStyle}>{fault.title ?? "Fault"}</div>
                    <span style={smallPillStyle}>{fault.status ?? "open"}</span>
                  </div>

                  <div style={listMetaStyle}>
                    {fault.deviceId ?? fault.reference ?? "No ref"} •{" "}
                    {fault.location?.locationText ?? "No location"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Linked Replacements</CardTitle>

          {linkedReplacements.length === 0 ? (
            <p style={emptyTextStyle}>No linked replacements found for this asset.</p>
          ) : (
            <div style={listGridStyle}>
              {linkedReplacements.map((replacement: any) => (
                <div key={replacement.id} style={listCardStyle}>
                  <div style={listCardTopStyle}>
                    <div style={listCardTitleStyle}>
                      {replacement.title ?? replacement.partId ?? "Replacement"}
                    </div>
                    <span style={smallPillStyle}>
                      {replacement.status ?? "recorded"}
                    </span>
                  </div>

                  <div style={listMetaStyle}>
                    {replacement.partId ?? "No part"} •{" "}
                    {replacement.deviceId ?? replacement.reference ?? "No ref"}
                  </div>

                  {replacement.reason ? (
                    <div style={listNoteStyle}>{replacement.reason}</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Related Visits</CardTitle>

          {linkedVisits.length === 0 ? (
            <p style={emptyTextStyle}>No related visits linked to this asset yet.</p>
          ) : (
            <div style={listGridStyle}>
              {linkedVisits.map((visit: any) => (
                <div key={visit.id} style={listCardStyle}>
                  <div style={listCardTopStyle}>
                    <div style={listCardTitleStyle}>
                      {visit.visitType ?? "Visit"}
                    </div>
                    <span style={smallPillStyle}>{visit.status ?? "unknown"}</span>
                  </div>

                  <div style={listMetaStyle}>
                    {visit.engineerName ?? "No engineer"} •{" "}
                    {visit.completedAt
                      ? formatIrishDateTime(visit.completedAt)
                      : visit.startedAt
                        ? formatIrishDateTime(visit.startedAt)
                        : "No date"}
                  </div>

                  <div style={visitActionWrapStyle}>
                    <PrimaryButton
                      onClick={() =>
                        navigate(`/site/${siteFile.metadata.siteFileId}/visit/${visit.id}`, {
                          state: { visit },
                        })
                      }
                    >
                      Open Visit
                    </PrimaryButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Actions</CardTitle>
          <div style={actionGridStyle}>
            <SecondaryButton
              onClick={() =>
                navigate(`/site/${siteFile.metadata.siteFileId}/assets/${asset.id}/edit`)
              }
            >
              Edit Asset
            </SecondaryButton>

            <SecondaryButton
              onClick={() => navigate(`/site/${siteFile.metadata.siteFileId}/assets`)}
            >
              Back to Assets
            </SecondaryButton>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

function SummaryPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={summaryPillStyle}>
      <div style={summaryPillLabelStyle}>{label}</div>
      <div style={summaryPillValueStyle}>{value}</div>
    </div>
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
};

const heroActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "14px",
};

const summaryPillStyle: React.CSSProperties = {
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  padding: "12px",
};

const summaryPillLabelStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#64748b",
  marginBottom: "6px",
};

const summaryPillValueStyle: React.CSSProperties = {
  fontSize: "0.95rem",
  fontWeight: 700,
  color: "#111827",
};

const timelineGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
};

const timelineCardStyle: React.CSSProperties = {
  borderRadius: "18px",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  padding: "14px",
  display: "grid",
  gap: "10px",
};

const timelineTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: "10px",
};

const timelineTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#111827",
};

const timelineMetaStyle: React.CSSProperties = {
  marginTop: "4px",
  color: "#6b7280",
  fontSize: "0.9rem",
};

const statusPillStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "6px 10px",
  background: "#e0e7ff",
  color: "#3730a3",
  fontWeight: 800,
  fontSize: "0.76rem",
  whiteSpace: "nowrap",
};

const timelineInfoStyle: React.CSSProperties = {
  display: "grid",
  gap: "4px",
  color: "#475569",
  fontSize: "0.92rem",
};

const noteBoxStyle: React.CSSProperties = {
  borderRadius: "14px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  padding: "12px",
};

const noteLabelStyle: React.CSSProperties = {
  fontSize: "0.74rem",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#64748b",
  marginBottom: "6px",
};

const noteTextStyle: React.CSSProperties = {
  color: "#111827",
  lineHeight: 1.45,
};

const listGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
};

const listCardStyle: React.CSSProperties = {
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  padding: "14px",
  display: "grid",
  gap: "8px",
};

const listCardTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "start",
};

const listCardTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#111827",
};

const listMetaStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "0.92rem",
  lineHeight: 1.4,
};

const listNoteStyle: React.CSSProperties = {
  color: "#475569",
  fontSize: "0.92rem",
  lineHeight: 1.45,
};

const smallPillStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "5px 10px",
  background: "#e5e7eb",
  color: "#374151",
  fontWeight: 800,
  fontSize: "0.74rem",
  whiteSpace: "nowrap",
};

const visitActionWrapStyle: React.CSSProperties = {
  marginTop: "2px",
};

const actionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const emptyTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
};