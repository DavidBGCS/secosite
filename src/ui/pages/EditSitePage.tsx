import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SiteFile } from "../../core";
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

function nowIso() {
  return new Date().toISOString();
}

export function EditSitePage() {
  const navigate = useNavigate();
  const { siteFile, updateSite, loading, error } = useFirestoreSite();

  const [form, setForm] = useState({
    name: "",
    siteCode: "",
    clientName: "",
    addressLine1: "",
    city: "",
    county: "",
    country: "Ireland",
  });

  const [messages, setMessages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!siteFile) return;

    setForm({
      name: siteFile.site.name || "",
      siteCode: siteFile.site.siteCode || "",
      clientName: siteFile.site.clientName || "",
      addressLine1:
        typeof siteFile.site.address === "object"
          ? siteFile.site.address?.line1 || ""
          : "",
      city:
        typeof siteFile.site.address === "object"
          ? siteFile.site.address?.city || ""
          : "",
      county:
        typeof siteFile.site.address === "object"
          ? siteFile.site.address?.county || ""
          : "",
      country:
        typeof siteFile.site.address === "object"
          ? siteFile.site.address?.country || "Ireland"
          : "Ireland",
    });
  }, [siteFile]);

  const handleSave = async () => {
    if (!siteFile) return;

    if (!form.name.trim()) {
      setMessages(["Site name is required."]);
      return;
    }

    try {
      setSaving(true);

      const next: SiteFile = JSON.parse(JSON.stringify(siteFile));

      next.site.name = form.name.trim();
      next.site.siteCode = form.siteCode.trim() || undefined;
      next.site.clientName = form.clientName.trim() || undefined;

      next.site.address = {
        line1: form.addressLine1,
        city: form.city,
        county: form.county,
        country: form.country,
      };

      next.site.updatedAt = nowIso();
      next.metadata.updatedAt = nowIso();

      await updateSite(cleanFirestoreData(next));

      setMessages(["Site details updated successfully."]);
    } catch (err) {
      setMessages([
        err instanceof Error ? err.message : "Failed to update site.",
      ]);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Loading site">
        <Card>Loading site...</Card>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Error">
        <Card>{error}</Card>
      </AppLayout>
    );
  }

  if (!siteFile) {
    return (
      <AppLayout title="Not Found">
        <Card>
          <p>Site not found.</p>
          <SecondaryButton onClick={() => navigate("/")}>
            Back to Sites
          </SecondaryButton>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Edit Site"
      subtitle={`${siteFile.site.name}`}
    >
      <div style={pageGridStyle}>
        <Card>
          <div style={heroWrapStyle}>
            <div>
              <div style={eyebrowStyle}>SITE SETTINGS</div>
              <div style={heroTitleStyle}>Edit Site Details</div>
              <div style={heroSubStyle}>
                Update core site information, client details, and address.
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Basic Information</CardTitle>

          <div style={formGrid}>
            <Field label="Site Name">
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                style={inputStyle}
              />
            </Field>

            <Field label="Site Reference">
              <input
                value={form.siteCode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, siteCode: e.target.value }))
                }
                style={inputStyle}
              />
            </Field>

            <Field label="Client Name">
              <input
                value={form.clientName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, clientName: e.target.value }))
                }
                style={inputStyle}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle>Address</CardTitle>

          <div style={formGrid}>
            <Field label="Address Line">
              <input
                value={form.addressLine1}
                onChange={(e) =>
                  setForm((f) => ({ ...f, addressLine1: e.target.value }))
                }
                style={inputStyle}
              />
            </Field>

            <Field label="Town / City">
              <input
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({ ...f, city: e.target.value }))
                }
                style={inputStyle}
              />
            </Field>

            <Field label="County">
              <input
                value={form.county}
                onChange={(e) =>
                  setForm((f) => ({ ...f, county: e.target.value }))
                }
                style={inputStyle}
              />
            </Field>

            <Field label="Country">
              <input
                value={form.country}
                onChange={(e) =>
                  setForm((f) => ({ ...f, country: e.target.value }))
                }
                style={inputStyle}
              />
            </Field>
          </div>
        </Card>

        {messages.length > 0 && (
          <Card>
            <CardTitle>Status</CardTitle>
            <div style={messageStyle}>
              {messages.map((m, i) => (
                <div key={i}>{m}</div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <CardTitle>Actions</CardTitle>

          <div style={actionGrid}>
            <SecondaryButton
              onClick={() =>
                navigate(`/site/${siteFile.metadata.siteFileId}/overview`)
              }
            >
              Cancel
            </SecondaryButton>

            <PrimaryButton onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </PrimaryButton>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

/* STYLES */

const pageGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
};

const heroWrapStyle: React.CSSProperties = {
  display: "flex",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 800,
  color: "#6b7280",
};

const heroTitleStyle: React.CSSProperties = {
  fontSize: "1.4rem",
  fontWeight: 800,
  marginTop: "4px",
};

const heroSubStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  color: "#6b7280",
  marginTop: "4px",
};

const formGrid: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};

const actionGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const messageStyle: React.CSSProperties = {
  color: "#166534",
  fontWeight: 600,
};