// src/core/types/system.ts

import type {
  EntityBase,
  ExternalReference,
  ID,
  PassFailNA,
  SeverityLevel,
  YesNoUnknown,
} from "./base";

export type SystemDiscipline =
  | "fire-alarm"
  | "intruder-alarm"
  | "cctv"
  | "access-control"
  | "intercom"
  | "network"
  | "emergency-lighting"
  | "gas-suppression"
  | "aspiration"
  | "disabled-refuge"
  | "public-address"
  | "other";

export type SystemCategory =
  | "life-safety"
  | "security"
  | "it"
  | "building-services"
  | "compliance"
  | "other";

export type SystemStatus =
  | "active"
  | "isolated"
  | "faulted"
  | "partially-operational"
  | "decommissioned"
  | "unknown";

export type SystemLifecycle =
  | "existing"
  | "new"
  | "upgrade"
  | "temporary"
  | "removed"
  | "unknown";

export type DeviceStatus =
  | "normal"
  | "fault"
  | "disabled"
  | "offline"
  | "removed"
  | "unknown";

export type DeviceType =
  | "panel"
  | "repeater"
  | "power-supply"
  | "detector"
  | "manual-call-point"
  | "sounder"
  | "sounder-beacon"
  | "interface"
  | "module"
  | "input"
  | "output"
  | "camera"
  | "nvr"
  | "dvr"
  | "encoder"
  | "reader"
  | "controller"
  | "door-contact"
  | "lock"
  | "break-glass"
  | "keypad"
  | "expander"
  | "psu"
  | "switch"
  | "router"
  | "server"
  | "battery"
  | "other";

export type CircuitType =
  | "loop"
  | "radial"
  | "zone"
  | "spur"
  | "network"
  | "rs485"
  | "ethernet"
  | "fiber"
  | "wireless"
  | "other";

export type PowerType =
  | "mains"
  | "battery"
  | "poe"
  | "24vdc"
  | "12vdc"
  | "230vac"
  | "unknown"
  | "other";

export type DeviceAddress = {
  loop?: string;
  address?: string;
  zone?: string;
  channel?: string;
  circuit?: string;
  node?: string;
  custom?: string;
};

export type DeviceLocation = {
  buildingId?: ID;
  areaId?: ID;
  level?: string;
  room?: string;
  locationText?: string;
};

export type DeviceIdentifier = {
  serialNumber?: string;
  assetTag?: string;
  reference?: string;
  model?: string;
  manufacturer?: string;
  firmwareVersion?: string;
  hardwareVersion?: string;
  macAddress?: string;
  ipAddress?: string;
};

export type SystemDevice = EntityBase & {
  id: ID;
  systemId: ID;
  deviceType?: DeviceType;
  status?: DeviceStatus;
  criticality?: SeverityLevel;

  identifier?: DeviceIdentifier;
  addressing?: DeviceAddress;
  location?: DeviceLocation;

  circuitId?: ID;
  zoneId?: ID;
  parentDeviceId?: ID;

  powered?: YesNoUnknown;
  monitored?: YesNoUnknown;
  commissioned?: YesNoUnknown;

  installDate?: string;
  lastServiceDate?: string;

  externalRefs?: ExternalReference[];
};

export type SystemCircuit = EntityBase & {
  id: ID;
  systemId: ID;
  type?: CircuitType;
  reference?: string;
  sourceDeviceId?: ID;
  destinationDeviceId?: ID;
  cableType?: string;
  coreCount?: number;
  lengthM?: number;
  monitored?: YesNoUnknown;
};

export type SystemZone = EntityBase & {
  id: ID;
  systemId: ID;
  zoneNumber?: string;
  zoneType?: string;
  buildingId?: ID;
  areaId?: ID;
  level?: string;
  coverageText?: string;
};

export type SystemNetworkNode = EntityBase & {
  id: ID;
  systemId: ID;
  nodeType?: "switch" | "router" | "controller" | "panel" | "server" | "gateway" | "other";
  ipAddress?: string;
  macAddress?: string;
  vlan?: string;
  uplinkNodeId?: ID;
  locationText?: string;
};

export type SystemPowerSource = EntityBase & {
  id: ID;
  systemId: ID;
  powerType?: PowerType;
  voltage?: number;
  currentA?: number;
  batteryAh?: number;
  standbyHours?: number;
  alarmHours?: number;
  monitored?: YesNoUnknown;
  sourceDeviceId?: ID;
};

export type SystemHealth = {
  overallStatus?: SystemStatus;
  serviceable?: YesNoUnknown;
  compliant?: PassFailNA;
  faultCount?: number;
  warningCount?: number;
  disabledCount?: number;
  offlineCount?: number;
  lastTestDate?: string;
  lastServiceDate?: string;
  nextServiceDue?: string;
};

export type InstalledSystem = EntityBase & {
  id: ID;
  siteId?: ID;

  discipline: SystemDiscipline;
  category?: SystemCategory;
  status?: SystemStatus;
  lifecycle?: SystemLifecycle;

  systemCode?: string;
  systemRef?: string;
  name: string;

  buildingId?: ID;
  areaIds?: ID[];

  manufacturer?: string;
  platform?: string;
  model?: string;
  firmwareVersion?: string;

  panelCount?: number;
  deviceCount?: number;
  zoneCount?: number;
  networked?: YesNoUnknown;
  monitored?: YesNoUnknown;

  standardRefs?: string[];
  clientSystemName?: string;
  maintainer?: string;

  health?: SystemHealth;

  devices?: SystemDevice[];
  circuits?: SystemCircuit[];
  zones?: SystemZone[];
  networkNodes?: SystemNetworkNode[];
  powerSources?: SystemPowerSource[];

  externalRefs?: ExternalReference[];
};

export type SystemSummary = Pick<
  InstalledSystem,
  | "id"
  | "siteId"
  | "discipline"
  | "category"
  | "status"
  | "systemCode"
  | "systemRef"
  | "name"
  | "manufacturer"
  | "model"
>;

export type SystemLookup = {
  systemId: ID;
  systemName?: string;
  systemCode?: string;
  discipline?: SystemDiscipline;
};