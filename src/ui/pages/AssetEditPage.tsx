import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { AssetCategory, AssetRecord, SiteFile } from "../../core";
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
} from "../components/ui";

const CATEGORY_OPTIONS: Array<{ value: AssetCategory; label: string }> = [
  { value: "detector", label: "Detector" },
  { value: "optical-detector", label: "Optical Detector" },
  { value: "heat-detector", label: "Heat Detector" },
  { value: "multisensor", label: "Multisensor" },
  { value: "beam", label: "Beam" },
  { value: "aspirating", label: "Aspirating" },
  { value: "mcp", label: "MCP" },
  { value: "sounder", label: "Sounder" },
  { value: "sounder-beacon", label: "Sounder / Beacon" },
  { value: "interface", label: "Interface" },
  { value: "io", label: "I/O" },
  { value: "panel", label: "Panel" },
  { value: "repeater", label: "Repeater" },
  { value: "psu", label: "PSU" },
  { value: "void", label: "Void" },
  { value: "attic", label: "Attic" },
  { value: "atex", label: "ATEX" },
  { value: "other", label: "Other" },
];

function nowIso() {
  return new Date().toISOString();
}

type AssetFormState = {
  reference: string;
  loop: string;
  address: string;
  zone: string;
  assetType: string;
  category: AssetCategory;
  description: string;
  locationText: string;
  tagsText: string;
  active: boolean;
  serviceTrackable: boolean;
  countsTowardAutoDetectionPercentage: boolean;
};

export function AssetEditPage() {
  const navigate = useNavigate();
  const { assetId } = useParams<{ assetId: string }>();
  const { siteFile, updateSite, loading, error } = useFirestoreSite();

  const asset = useMemo(() => {
    if (!siteFile || !assetId) return undefined;
    return siteFile.assets.find((item) => item.id === assetId);
  }, [siteFile, assetId]);

  const [form, setForm] = useState<AssetFormState>({
    reference: "",
    loop: "",
    address: "",
    zone: "",
    assetType: "",
    category: "other",
    description: "",
    locationText: "",
    tagsText: "",
    active: true,
    serviceTrackable: true,
    countsTowardAutoDetectionPercentage: false,
  });

  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    if (!asset) return;

    setForm({
      reference: asset.reference ?? "",
      loop: asset.loop ?? "",
      address: asset.address ?? "",
      zone: asset.zone ?? "",
      assetType: asset.assetType ?? "",
      category: asset.category ?? "other",
      description: asset.description ?? "",
      locationText: asset.locationText ?? "",
      tagsText: (asset.tags ?? []).join(", "),
      active: asset.active ?? true,
      serviceTrackable: asset.serviceTrackable ?? true,
      countsTowardAutoDetectionPercentage:
        asset.countsTowardAutoDetectionPercentage ?? false,
    });
  }, [asset]);

  const handleSave = async () => {
    if (!siteFile || !asset) return;

    if (!form.reference.trim()) {
      setMessages(["Reference is required."]);
      return;
    }

    if (!form.assetType.trim()) {
      setMessages(["Asset type is required."]);
      return;
    }

    try {
      const next: SiteFile = JSON.parse(JSON.stringify(siteFile));
      const target = next.assets.find((item) => item.id === asset.id);

      if (!target) {
        throw new Error("Asset not found.");
      }

      target.reference = form.reference.trim();
      target.loop = form.loop.trim() || undefined;
      target.address = form.address.trim() || undefined;
      target.zone = form.zone.trim() || undefined;
      target.assetType = form.assetType.trim();
      target.category = form.category;
      target.description = form.description.trim() || undefined;
      target.locationText = form.locationText.trim() || undefined;
      target.tags = form.tagsText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      target.active = form.active;
      target.serviceTrackable = form.serviceTrackable;
      target.countsTowardAutoDetectionPercentage =
        form.countsTowardAutoDetectionPercentage;
      target.updatedAt = nowIso();

      next.metadata.updatedAt = nowIso();

      setSaving(true);
      setMessages([]);

      try {
        await updateSite(cleanFirestoreData(next));
      } finally {
        setSaving(false);
      }

      setMessages(["Asset updated successfully."]);
    } catch (saveError) {
      setMessages([
        saveError instanceof Error ? saveError.message : "Failed to save asset.",
      ]);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Loading asset">
        <Card>Loading asset...</Card>
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

  if (!siteFile || !asset) {
    return (
      <AppLayout title="Asset not found">
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
      title="Edit Asset"
      subtitle={`${asset.reference} • ${siteFile.site.name}`}
    >
      <div style={pageGridStyle}>
        <Card>
          <div style={heroWrapStyle}>
            <div>
              <div style={eyebrowStyle}>ASSET EDITOR</div>
              <div style={heroTitleStyle}>{asset.reference}</div>
              <div style={heroSubStyle}>
                Correct device details, update categorisation, and manage service settings.
              </div>
            </div>

            <div style={heroBadgeWrapStyle}>
              <span
                style={{
                  ...statusPillStyle,
                  background: form.active ? "#dcfce7" : "#f3f4f6",
                  color: form.active ? "#166534" : "#374151",
                }}
              >
                {form.active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Core Details</CardTitle>

          <div style={formGridStyle}>
            <Field label="Reference">
              <input
                value={form.reference}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, reference: e.target.value }))
                }
                style={inputStyle}
                placeholder="L1-A01"
              />
            </Field>

            <div style={twoColStyle}>
              <Field label="Loop">
                <input
                  value={form.loop}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, loop: e.target.value }))
                  }
                  style={inputStyle}
                />
              </Field>

              <Field label="Address">
                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={twoColStyle}>
              <Field label="Zone">
                <input
                  value={form.zone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, zone: e.target.value }))
                  }
                  style={inputStyle}
                />
              </Field>

              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      category: e.target.value as AssetCategory,
                    }))
                  }
                  style={inputStyle}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Asset Type">
              <input
                value={form.assetType}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, assetType: e.target.value }))
                }
                style={inputStyle}
                placeholder="Optical Detector"
              />
            </Field>

            <Field label="Location">
              <input
                value={form.locationText}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, locationText: e.target.value }))
                }
                style={inputStyle}
                placeholder="Entry Lobby / Basement / Riser..."
              />
            </Field>

            <Field label="Description">
              <input
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                style={inputStyle}
                placeholder="Description"
              />
            </Field>

            <Field label="Tags">
              <input
                value={form.tagsText}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, tagsText: e.target.value }))
                }
                style={inputStyle}
                placeholder="void, attic, mcp"
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle>Service & Status</CardTitle>

          <div style={toggleGridStyle}>
            <ToggleRow
              label="Active Device"
              description="Inactive devices remain in the register but are treated as no longer live."
              checked={form.active}
              onChange={(value) => setForm((prev) => ({ ...prev, active: value }))}
            />

            <ToggleRow
              label="Service Trackable"
              description="Include this device in service workflows."
              checked={form.serviceTrackable}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, serviceTrackable: value }))
              }
            />

            <ToggleRow
              label="Counts Toward Detection Percentage"
              description="Use for automatic detector percentage calculations."
              checked={form.countsTowardAutoDetectionPercentage}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  countsTowardAutoDetectionPercentage: value,
                }))
              }
            />
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
          <CardTitle>Actions</CardTitle>
          <div style={actionGridStyle}>
            <SecondaryButton
              onClick={() =>
                navigate(`/site/${siteFile.metadata.siteFileId}/assets/${asset.id}/history`)
              }
            >
              View History
            </SecondaryButton>

            <SecondaryButton
              onClick={() => navigate(`/site/${siteFile.metadata.siteFileId}/assets`)}
            >
              Back to Assets
            </SecondaryButton>

            <PrimaryButton onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Asset"}
            </PrimaryButton>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div style={toggleRowStyle}>
      <div>
        <div style={toggleLabelStyle}>{label}</div>
        <div style={toggleDescriptionStyle}>{description}</div>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={checked ? toggleButtonOnStyle : toggleButtonOffStyle}
      >
        <span style={checked ? toggleKnobOnStyle : toggleKnobOffStyle} />
      </button>
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
  maxWidth: "700px",
};

const heroBadgeWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
};

const statusPillStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "0.76rem",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};

const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const toggleGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};

const toggleRowStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  background: "#f8fafc",
  padding: "14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
};

const toggleLabelStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#111827",
};

const toggleDescriptionStyle: React.CSSProperties = {
  marginTop: "4px",
  color: "#6b7280",
  fontSize: "0.9rem",
  lineHeight: 1.4,
};

const toggleButtonOnStyle: React.CSSProperties = {
  width: "56px",
  height: "32px",
  borderRadius: "999px",
  border: "none",
  background: "#16a34a",
  position: "relative",
  cursor: "pointer",
  flexShrink: 0,
};

const toggleButtonOffStyle: React.CSSProperties = {
  ...toggleButtonOnStyle,
  background: "#cbd5e1",
};

const toggleKnobOnStyle: React.CSSProperties = {
  position: "absolute",
  top: "4px",
  left: "28px",
  width: "24px",
  height: "24px",
  borderRadius: "999px",
  background: "#ffffff",
  boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
};

const toggleKnobOffStyle: React.CSSProperties = {
  ...toggleKnobOnStyle,
  left: "4px",
};

const messageListStyle: React.CSSProperties = {
  display: "grid",
  gap: "6px",
  color: "#92400e",
  fontWeight: 700,
};

const actionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "10px",
};