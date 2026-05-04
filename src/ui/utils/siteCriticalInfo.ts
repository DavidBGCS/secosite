// src/ui/utils/siteCriticalInfo.ts

export type SiteCriticalInfo = {
  generalNotes: string;
  panelLocation: string;
  arcAccountNumber: string;
  arcName: string;
  arcPhone: string;
  repeaterPanelLocations: string;
  psuLocations: string;
  expanderLocations: string;
  communicatorLocation: string;
  entryInstructions: string;
  outOfHoursAccess: string;
  keyLocation: string;
  isolationProcedure: string;
  resetProcedure: string;
  zoneChartLocation: string;
  asFittedDrawingLocation: string;
  specialRisks: string;
  knownFaultHistory: string;
  clientServiceNotes: string;
};

export const emptySiteCriticalInfo: SiteCriticalInfo = {
  generalNotes: "",
  panelLocation: "",
  arcAccountNumber: "",
  arcName: "",
  arcPhone: "",
  repeaterPanelLocations: "",
  psuLocations: "",
  expanderLocations: "",
  communicatorLocation: "",
  entryInstructions: "",
  outOfHoursAccess: "",
  keyLocation: "",
  isolationProcedure: "",
  resetProcedure: "",
  zoneChartLocation: "",
  asFittedDrawingLocation: "",
  specialRisks: "",
  knownFaultHistory: "",
  clientServiceNotes: "",
};

export function parseSiteCriticalInfo(raw?: string): SiteCriticalInfo {
  const text = raw ?? "";

  const getValue = (label: string) => {
    const regex = new RegExp(
      `${label}:\\s*([\\s\\S]*?)(?=\\n[A-Za-z][A-Za-z /&()-]+:\\s|$)`,
      "i"
    );
    const match = text.match(regex);
    return match?.[1]?.trim() ?? "";
  };

  return {
    generalNotes: getValue("General Notes") || text,
    panelLocation: getValue("Panel Location"),
    arcAccountNumber: getValue("ARC Account Number"),
    arcName: getValue("ARC Name"),
    arcPhone: getValue("ARC Phone"),
    repeaterPanelLocations: getValue("Repeater Panel Locations"),
    psuLocations: getValue("PSU Locations"),
    expanderLocations: getValue("Expander Locations"),
    communicatorLocation: getValue("Communicator Location"),
    entryInstructions: getValue("Entry Instructions"),
    outOfHoursAccess: getValue("Out Of Hours Access"),
    keyLocation: getValue("Key Location"),
    isolationProcedure: getValue("Isolation Procedure"),
    resetProcedure: getValue("Reset Procedure"),
    zoneChartLocation: getValue("Zone Chart Location"),
    asFittedDrawingLocation: getValue("As Fitted Drawing Location"),
    specialRisks: getValue("Special Risks"),
    knownFaultHistory: getValue("Known Fault History"),
    clientServiceNotes: getValue("Client Service Notes"),
  };
}

export function buildSiteCriticalInfoText(info: SiteCriticalInfo): string {
  const sections: Array<[string, string]> = [
    ["General Notes", info.generalNotes.trim()],
    ["Panel Location", info.panelLocation.trim()],
    ["ARC Account Number", info.arcAccountNumber.trim()],
    ["ARC Name", info.arcName.trim()],
    ["ARC Phone", info.arcPhone.trim()],
    ["Repeater Panel Locations", info.repeaterPanelLocations.trim()],
    ["PSU Locations", info.psuLocations.trim()],
    ["Expander Locations", info.expanderLocations.trim()],
    ["Communicator Location", info.communicatorLocation.trim()],
    ["Entry Instructions", info.entryInstructions.trim()],
    ["Out Of Hours Access", info.outOfHoursAccess.trim()],
    ["Key Location", info.keyLocation.trim()],
    ["Isolation Procedure", info.isolationProcedure.trim()],
    ["Reset Procedure", info.resetProcedure.trim()],
    ["Zone Chart Location", info.zoneChartLocation.trim()],
    ["As Fitted Drawing Location", info.asFittedDrawingLocation.trim()],
    ["Special Risks", info.specialRisks.trim()],
    ["Known Fault History", info.knownFaultHistory.trim()],
    ["Client Service Notes", info.clientServiceNotes.trim()],
  ];

  return sections
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n\n");
}