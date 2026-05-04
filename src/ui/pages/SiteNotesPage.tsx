// src/ui/pages/SiteNotesPage.tsx

import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SiteFile } from "../../core";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { cleanFirestoreData } from "../../utils/cleanFirestoreData";
import {
  buildSiteCriticalInfoText,
  emptySiteCriticalInfo,
  parseSiteCriticalInfo,
  type SiteCriticalInfo,
} from "../utils/siteCriticalInfo";
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

export function SiteNotesPage() {
  const navigate = useNavigate();
  const { siteFile, updateSite, loading, error } = useFirestoreSite();

  const [form, setForm] = useState<SiteCriticalInfo>(emptySiteCriticalInfo);
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    if (!siteFile) return;
    setForm(parseSiteCriticalInfo(siteFile.site.notes));
  }, [siteFile]);

  const handleChange = (key: keyof SiteCriticalInfo, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!siteFile) return;

    const next: SiteFile = JSON.parse(JSON.stringify(siteFile));
    const notesText = buildSiteCriticalInfoText(form);
    const now = new Date().toISOString();

    next.site = {
      ...next.site,
      notes: notesText || undefined,
      updatedAt: now,
    };

    next.metadata = {
      ...next.metadata,
      updatedAt: now,
    };

    setSaving(true);
    setMessages([]);

    try {
      await updateSite(cleanFirestoreData(next));
      setMessages(["Site notes saved."]);
    } catch (saveError) {
      setMessages([
        saveError instanceof Error ? saveError.message : "Failed to save site notes.",
      ]);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Loading site notes">
        <Card>Loading site notes...</Card>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Site notes error">
        <Card>{error}</Card>
      </AppLayout>
    );
  }

  if (!siteFile) {
    return (
      <AppLayout title="Site notes not found">
        <Card>
          <p style={{ marginTop: 0 }}>The requested site could not be found.</p>
          <SecondaryButton onClick={() => navigate("/")}>Back to Sites</SecondaryButton>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Site Notes / Critical Info"
      subtitle={`${siteFile.site.name} • ${siteFile.site.siteCode ?? siteFile.site.id}`}
    >
      <Card>
        <CardTitle>Critical Site Info</CardTitle>

        <form onSubmit={handleSave}>
          <Field label="Panel Location">
            <input
              value={form.panelLocation}
              onChange={(e) => handleChange("panelLocation", e.target.value)}
              style={inputStyle}
              placeholder="Main panel location"
            />
          </Field>

          <div style={twoColStyle}>
            <Field label="ARC Account Number">
              <input
                value={form.arcAccountNumber}
                onChange={(e) => handleChange("arcAccountNumber", e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="ARC Name">
              <input
                value={form.arcName}
                onChange={(e) => handleChange("arcName", e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="ARC Phone">
            <input
              value={form.arcPhone}
              onChange={(e) => handleChange("arcPhone", e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Repeater Panel Locations">
            <textarea
              value={form.repeaterPanelLocations}
              onChange={(e) => handleChange("repeaterPanelLocations", e.target.value)}
              style={textareaStyle}
              rows={3}
            />
          </Field>

          <Field label="PSU Locations">
            <textarea
              value={form.psuLocations}
              onChange={(e) => handleChange("psuLocations", e.target.value)}
              style={textareaStyle}
              rows={3}
            />
          </Field>

          <Field label="Expander Locations">
            <textarea
              value={form.expanderLocations}
              onChange={(e) => handleChange("expanderLocations", e.target.value)}
              style={textareaStyle}
              rows={3}
            />
          </Field>

          <Field label="Communicator Location">
            <input
              value={form.communicatorLocation}
              onChange={(e) => handleChange("communicatorLocation", e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Entry Instructions">
            <textarea
              value={form.entryInstructions}
              onChange={(e) => handleChange("entryInstructions", e.target.value)}
              style={textareaStyle}
              rows={3}
            />
          </Field>

          <div style={twoColStyle}>
            <Field label="Out Of Hours Access">
              <textarea
                value={form.outOfHoursAccess}
                onChange={(e) => handleChange("outOfHoursAccess", e.target.value)}
                style={textareaStyle}
                rows={3}
              />
            </Field>

            <Field label="Key Location">
              <textarea
                value={form.keyLocation}
                onChange={(e) => handleChange("keyLocation", e.target.value)}
                style={textareaStyle}
                rows={3}
              />
            </Field>
          </div>

          <div style={twoColStyle}>
            <Field label="Isolation Procedure">
              <textarea
                value={form.isolationProcedure}
                onChange={(e) => handleChange("isolationProcedure", e.target.value)}
                style={textareaStyle}
                rows={3}
              />
            </Field>

            <Field label="Reset Procedure">
              <textarea
                value={form.resetProcedure}
                onChange={(e) => handleChange("resetProcedure", e.target.value)}
                style={textareaStyle}
                rows={3}
              />
            </Field>
          </div>

          <div style={twoColStyle}>
            <Field label="Zone Chart Location">
              <input
                value={form.zoneChartLocation}
                onChange={(e) => handleChange("zoneChartLocation", e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="As Fitted Drawing Location">
              <input
                value={form.asFittedDrawingLocation}
                onChange={(e) => handleChange("asFittedDrawingLocation", e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Special Risks">
            <textarea
              value={form.specialRisks}
              onChange={(e) => handleChange("specialRisks", e.target.value)}
              style={textareaStyle}
              rows={4}
            />
          </Field>

          <Field label="Known Fault History">
            <textarea
              value={form.knownFaultHistory}
              onChange={(e) => handleChange("knownFaultHistory", e.target.value)}
              style={textareaStyle}
              rows={4}
            />
          </Field>

          <Field label="Client Service Notes">
            <textarea
              value={form.clientServiceNotes}
              onChange={(e) => handleChange("clientServiceNotes", e.target.value)}
              style={textareaStyle}
              rows={4}
            />
          </Field>

          <Field label="General Notes">
            <textarea
              value={form.generalNotes}
              onChange={(e) => handleChange("generalNotes", e.target.value)}
              style={textareaStyle}
              rows={5}
            />
          </Field>

          <div style={buttonGridStyle}>
            <SecondaryButton
              type="button"
              onClick={() => navigate(`/site/${siteFile.metadata.siteFileId}/overview`)}
            >
              Back to Overview
            </SecondaryButton>

            <PrimaryButton type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Site Notes"}
            </PrimaryButton>
          </div>
        </form>
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
    </AppLayout>
  );
}

const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const buttonGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "14px",
};