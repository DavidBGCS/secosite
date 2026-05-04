// src/ui/pages/SitesListPage.tsx

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSiteFile } from "../../core";
import type { Site } from "../../core";
import { useSites } from "../../app/state/useSites";
import { AppLayout } from "../layouts/AppLayout";
import {
  Card,
  CardTitle,
  Field,
  PrimaryButton,
  SecondaryButton,
  inputStyle,
} from "../components/ui";
import { formatIrishDateTime } from "../utils/dateTime";

function getSiteSubtitle(siteFile: {
  site: {
    address?: string | { line1?: string; city?: string; county?: string; country?: string };
    clientName?: string;
  };
}) {
  const address = siteFile.site.address;

  if (typeof address === "string") {
    return address || siteFile.site.clientName || "No address";
  }

  const parts = [
    address?.line1,
    address?.city,
    address?.county,
    address?.country,
  ].filter(Boolean);

  if (parts.length > 0) return parts.join(", ");
  return siteFile.site.clientName || "No address";
}

export function SitesListPage() {
  const { sites, saveSite, deleteSite } = useSites();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const sortedSites = useMemo(() => {
    return [...sites].sort((a, b) =>
      (b.metadata.updatedAt ?? "").localeCompare(a.metadata.updatedAt ?? "")
    );
  }, [sites]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setMessages(["Site name is required."]);
      return;
    }

    try {
      setSaving(true);

      const now = new Date().toISOString();

      const site: Site = {
        id: `site-${Date.now()}`,
        name: name.trim(),
        siteCode: siteCode.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };

      const siteFile = createSiteFile(site);
      await saveSite(siteFile);

      setName("");
      setSiteCode("");
      setMessages([`Site "${site.name}" created.`]);

      navigate(`/site/${siteFile.metadata.siteFileId}/overview`);
    } catch (error) {
      setMessages([
        error instanceof Error ? error.message : "Failed to create site.",
      ]);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (siteFileId: string, siteName: string) => {
    const confirmed = window.confirm(
      `Delete site "${siteName}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteSite(siteFileId);
      setMessages([`Site "${siteName}" deleted.`]);
    } catch (error) {
      setMessages([
        error instanceof Error ? error.message : "Failed to delete site.",
      ]);
    }
  };

  return (
    <AppLayout title="Sites" subtitle="SeCo Site field records">
      <div style={pageGridStyle}>
        <Card>
          <div style={heroWrapStyle}>
            <div>
              <div style={eyebrowStyle}>SECOSITE</div>
              <div style={heroTitleStyle}>Site Records</div>
              <div style={heroSubStyle}>
                Create, open, and manage site files for visits, faults, assets,
                replacements, notes, and reports.
              </div>
            </div>

            <div style={heroBadgeStyle}>{sortedSites.length} Sites</div>
          </div>
        </Card>

        <Card>
          <CardTitle>Create New Site</CardTitle>

          <div style={{ display: "grid", gap: "12px" }}>
            <Field label="Site Name">
              <input
                placeholder="Enter site name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="Site Reference">
              <input
                placeholder="Optional site reference"
                value={siteCode}
                onChange={(e) => setSiteCode(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <PrimaryButton onClick={handleCreate} disabled={saving}>
              {saving ? "Creating…" : "Create Site"}
            </PrimaryButton>
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
          <CardTitle>Saved Sites</CardTitle>

          {sortedSites.length === 0 ? (
            <p style={emptyTextStyle}>No sites created yet.</p>
          ) : (
            <div style={siteGridStyle}>
              {sortedSites.map((siteFile) => (
                <div key={siteFile.metadata.siteFileId} style={siteCardStyle}>
                  <div style={siteCardTopStyle}>
                    <div style={{ minWidth: 0 }}>
                      <div style={siteNameStyle}>{siteFile.site.name}</div>
                      <div style={siteSubStyle}>
                        {siteFile.site.siteCode ?? "No reference"} •{" "}
                        {getSiteSubtitle(siteFile)}
                      </div>
                    </div>

                    <div style={siteStatsPillStyle}>
                      {siteFile.visits.length} visit
                      {siteFile.visits.length === 1 ? "" : "s"}
                    </div>
                  </div>

                  <div style={siteMetaGridStyle}>
                    <div>
                      <strong>Open faults:</strong> {siteFile.openFaults.length}
                    </div>
                    <div>
                      <strong>Assets:</strong> {siteFile.assets.length}
                    </div>
                    <div>
                      <strong>Updated:</strong>{" "}
                      {siteFile.metadata.updatedAt
                        ? formatIrishDateTime(siteFile.metadata.updatedAt)
                        : "—"}
                    </div>
                    <div>
                      <strong>Created:</strong>{" "}
                      {siteFile.site.createdAt
                        ? formatIrishDateTime(siteFile.site.createdAt)
                        : "—"}
                    </div>
                  </div>

                  <div style={siteActionGridStyle}>
                    <PrimaryButton
                      onClick={() =>
                        navigate(`/site/${siteFile.metadata.siteFileId}/overview`)
                      }
                    >
                      Open
                    </PrimaryButton>

                    <SecondaryButton
                      onClick={() =>
                        navigate(`/site/${siteFile.metadata.siteFileId}/edit`)
                      }
                    >
                      Edit
                    </SecondaryButton>

                    <SecondaryButton
                      onClick={() =>
                        handleDelete(siteFile.metadata.siteFileId, siteFile.site.name)
                      }
                      style={dangerButtonStyle}
                    >
                      Delete
                    </SecondaryButton>
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

const siteGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};

const siteCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "14px",
  background: "#ffffff",
  display: "grid",
  gap: "12px",
};

const siteCardTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: "10px",
};

const siteNameStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 800,
  color: "#111827",
  lineHeight: 1.2,
};

const siteSubStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "0.9rem",
  marginTop: "4px",
  lineHeight: 1.35,
};

const siteStatsPillStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "6px 10px",
  background: "#f3f4f6",
  color: "#374151",
  fontSize: "0.76rem",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const siteMetaGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px 12px",
  color: "#374151",
  fontSize: "0.92rem",
};

const siteActionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "10px",
};

const dangerButtonStyle: React.CSSProperties = {
  border: "1px solid #ef4444",
  color: "#b91c1c",
};