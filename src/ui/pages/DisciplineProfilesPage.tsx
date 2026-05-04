// src/ui/pages/DisciplineProfilesPage.tsx

import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DisciplineProfile, SiteFile } from "../../core";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
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

function makeId(prefix = "id"): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

type ProfileFormState = {
  discipline: DisciplineProfile["discipline"];
  systemId: string;
  panelMake: string;
  panelModel: string;
  systemType: string;
  zonesLoopsSummary: string;
  maintainedBy: string;
  serviceInterval: DisciplineProfile["serviceInterval"];
  visitsPerYear: string;
  notes: string;
};

const defaultForm: ProfileFormState = {
  discipline: "fire-alarm",
  systemId: "",
  panelMake: "",
  panelModel: "",
  systemType: "",
  zonesLoopsSummary: "",
  maintainedBy: "",
  serviceInterval: "quarterly",
  visitsPerYear: "4",
  notes: "",
};

export function DisciplineProfilesPage() {
  const navigate = useNavigate();
  const { siteFile, updateSite, loading, error } = useFirestoreSite();

  const [showForm, setShowForm] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormState>(defaultForm);
  const [messages, setMessages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <AppLayout title="Loading profiles">
        <Card>Loading profiles...</Card>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Profiles error">
        <Card>{error}</Card>
      </AppLayout>
    );
  }

  if (!siteFile) {
    return (
      <AppLayout title="Profiles not found">
        <Card>
          <p style={{ marginTop: 0 }}>The requested site could not be found.</p>
          <SecondaryButton onClick={() => navigate("/")}>Back to Sites</SecondaryButton>
        </Card>
      </AppLayout>
    );
  }

  const persistSiteFile = async (next: SiteFile) => {
    setSaving(true);
    try {
      await updateSite({
        ...next,
        metadata: {
          ...next.metadata,
          updatedAt: nowIso(),
        },
      });
    } finally {
      setSaving(false);
    }
  };

  const startNewProfile = () => {
    setEditingProfileId(null);
    setForm(defaultForm);
    setShowForm(true);
    setMessages([]);
  };

  const startEditProfile = (profile: DisciplineProfile) => {
    setEditingProfileId(profile.id);
    setForm({
      discipline: profile.discipline,
      systemId: profile.systemId ?? "",
      panelMake: profile.panelMake ?? "",
      panelModel: profile.panelModel ?? "",
      systemType: profile.systemType ?? "",
      zonesLoopsSummary: profile.zonesLoopsSummary ?? "",
      maintainedBy: profile.maintainedBy ?? "",
      serviceInterval: profile.serviceInterval,
      visitsPerYear: String(profile.visitsPerYear ?? 1),
      notes: profile.notes ?? "",
    });
    setShowForm(true);
    setMessages([]);
  };

  const handleSaveProfile = async (event: FormEvent) => {
    event.preventDefault();

    const visitsPerYear = Number(form.visitsPerYear);
    if (!Number.isFinite(visitsPerYear) || visitsPerYear <= 0) {
      setMessages(["Visits per year must be greater than zero."]);
      return;
    }

    try {
      const next: SiteFile = JSON.parse(JSON.stringify(siteFile));
      const now = nowIso();

      const existing = editingProfileId
        ? next.disciplineProfiles.find((item) => item.id === editingProfileId)
        : undefined;

      const profile: DisciplineProfile = {
        ...(existing ?? {
          id: makeId("discipline"),
          siteId: siteFile.site.id,
          createdAt: now,
        }),
        discipline: form.discipline,
        systemId: form.systemId || undefined,
        panelMake: form.panelMake.trim() || undefined,
        panelModel: form.panelModel.trim() || undefined,
        systemType: form.systemType.trim() || undefined,
        zonesLoopsSummary: form.zonesLoopsSummary.trim() || undefined,
        maintainedBy: form.maintainedBy.trim() || undefined,
        serviceInterval: form.serviceInterval,
        visitsPerYear,
        notes: form.notes.trim() || undefined,
        updatedAt: now,
      };

      if (editingProfileId) {
        next.disciplineProfiles = next.disciplineProfiles.map((item) =>
          item.id === editingProfileId ? profile : item
        );
      } else {
        next.disciplineProfiles.unshift(profile);
      }

      await persistSiteFile(next);
      setMessages([editingProfileId ? "Profile updated." : "Profile added."]);
      setShowForm(false);
      setEditingProfileId(null);
      setForm(defaultForm);
    } catch (saveError) {
      setMessages([
        saveError instanceof Error ? saveError.message : "Failed to save profile.",
      ]);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    const confirmed = window.confirm("Delete this discipline profile?");
    if (!confirmed) return;

    try {
      const next: SiteFile = JSON.parse(JSON.stringify(siteFile));
      next.disciplineProfiles = next.disciplineProfiles.filter((item) => item.id !== profileId);
      await persistSiteFile(next);
      setMessages(["Profile deleted."]);
    } catch (deleteError) {
      setMessages([
        deleteError instanceof Error ? deleteError.message : "Failed to delete profile.",
      ]);
    }
  };

  return (
    <AppLayout
      title="Systems / Profiles"
      subtitle={`${siteFile.site.name} • ${siteFile.disciplineProfiles.length} profiles`}
    >
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <PrimaryButton onClick={startNewProfile}>Add Profile</PrimaryButton>
          <SecondaryButton
            onClick={() => navigate(`/site/${siteFile.metadata.siteFileId}/overview`)}
          >
            Overview
          </SecondaryButton>
        </div>

        {saving ? <div style={{ color: "#6b7280", marginTop: "10px" }}>Saving...</div> : null}
      </Card>

      {messages.length > 0 && (
        <Card>
          <CardTitle>Messages</CardTitle>
          <div style={{ display: "grid", gap: "6px", color: "#1e3a8a" }}>
            {messages.map((message, index) => (
              <div key={`${message}-${index}`}>{message}</div>
            ))}
          </div>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardTitle>{editingProfileId ? "Edit Profile" : "Add Discipline Profile"}</CardTitle>

          <form onSubmit={handleSaveProfile}>
            <div style={twoColStyle}>
              <Field label="Discipline">
                <select
                  value={form.discipline}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      discipline: e.target.value as DisciplineProfile["discipline"],
                    }))
                  }
                  style={inputStyle}
                >
                  <option value="fire-alarm">Fire Alarm</option>
                  <option value="emergency-lighting">Emergency Lighting</option>
                  <option value="intruder-alarm">Intruder Alarm</option>
                  <option value="cctv">CCTV</option>
                  <option value="access-control">Access Control</option>
                  <option value="other">Other</option>
                </select>
              </Field>

              <Field label="Linked System">
                <select
                  value={form.systemId}
                  onChange={(e) => setForm((prev) => ({ ...prev, systemId: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">None</option>
                  {siteFile.systems.map((system) => (
                    <option key={system.id} value={system.id}>
                      {system.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div style={twoColStyle}>
              <Field label="Panel Make">
                <input
                  value={form.panelMake}
                  onChange={(e) => setForm((prev) => ({ ...prev, panelMake: e.target.value }))}
                  style={inputStyle}
                />
              </Field>

              <Field label="Panel Model">
                <input
                  value={form.panelModel}
                  onChange={(e) => setForm((prev) => ({ ...prev, panelModel: e.target.value }))}
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={twoColStyle}>
              <Field label="System Type">
                <input
                  value={form.systemType}
                  onChange={(e) => setForm((prev) => ({ ...prev, systemType: e.target.value }))}
                  style={inputStyle}
                  placeholder="Addressable, conventional, IP, etc."
                />
              </Field>

              <Field label="Maintained By">
                <input
                  value={form.maintainedBy}
                  onChange={(e) => setForm((prev) => ({ ...prev, maintainedBy: e.target.value }))}
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={twoColStyle}>
              <Field label="Service Interval">
                <select
                  value={form.serviceInterval}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      serviceInterval: e.target.value as DisciplineProfile["serviceInterval"],
                    }))
                  }
                  style={inputStyle}
                >
                  <option value="quarterly">Quarterly</option>
                  <option value="bi-yearly">Bi-Yearly</option>
                  <option value="annual">Annual</option>
                  <option value="custom">Custom</option>
                </select>
              </Field>

              <Field label="Visits Per Year">
                <input
                  type="number"
                  min="1"
                  value={form.visitsPerYear}
                  onChange={(e) => setForm((prev) => ({ ...prev, visitsPerYear: e.target.value }))}
                  style={inputStyle}
                />
              </Field>
            </div>

            <Field label="Zones / Loops Summary">
              <textarea
                value={form.zonesLoopsSummary}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, zonesLoopsSummary: e.target.value }))
                }
                rows={3}
                style={textareaStyle}
              />
            </Field>

            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={4}
                style={textareaStyle}
              />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <SecondaryButton
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingProfileId(null);
                  setForm(defaultForm);
                }}
                disabled={saving}
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={saving}>
                Save Profile
              </PrimaryButton>
            </div>
          </form>
        </Card>
      )}

      {siteFile.disciplineProfiles.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "#6b7280" }}>
            No profiles yet. Add a discipline profile to define the system and service regime.
          </p>
        </Card>
      ) : (
        siteFile.disciplineProfiles.map((profile) => {
          const linkedSystem = profile.systemId
            ? siteFile.systems.find((system) => system.id === profile.systemId)
            : undefined;

          return (
            <Card key={profile.id}>
              <CardTitle>{profile.discipline}</CardTitle>

              <div style={{ display: "grid", gap: "6px", color: "#374151", marginBottom: "12px" }}>
                <div><strong>Panel:</strong> {profile.panelMake ?? "—"} {profile.panelModel ?? ""}</div>
                <div><strong>System Type:</strong> {profile.systemType ?? "—"}</div>
                <div><strong>Linked System:</strong> {linkedSystem?.name ?? "—"}</div>
                <div><strong>Maintained By:</strong> {profile.maintainedBy ?? "—"}</div>
                <div><strong>Service Interval:</strong> {profile.serviceInterval}</div>
                <div><strong>Visits / Year:</strong> {profile.visitsPerYear}</div>
                {profile.zonesLoopsSummary ? (
                  <div><strong>Zones / Loops:</strong> {profile.zonesLoopsSummary}</div>
                ) : null}
                {profile.notes ? (
                  <div><strong>Notes:</strong> {profile.notes}</div>
                ) : null}
              </div>

              <div style={{ display: "grid", gap: "10px" }}>
                <SecondaryButton onClick={() => startEditProfile(profile)} disabled={saving}>
                  Edit
                </SecondaryButton>
                <SecondaryButton
                  style={{ border: "1px solid #ef4444", color: "#b91c1c" }}
                  onClick={() => handleDeleteProfile(profile.id)}
                  disabled={saving}
                >
                  Delete
                </SecondaryButton>
              </div>
            </Card>
          );
        })
      )}
    </AppLayout>
  );
}

const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};