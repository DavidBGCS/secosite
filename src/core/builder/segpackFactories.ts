// src/core/builder/segpackFactories.ts

import type { ID, ISODateString } from "../types/base";
import type { SegpackManifest } from "../types/manifest";
import type { Site } from "../types/site";
import type {
  InstalledSystem,
  SystemDevice,
  SystemCircuit,
  SystemZone,
  SystemNetworkNode,
  SystemPowerSource,
} from "../types/system";
import type { FaultRecord, RemedialAction } from "../types/fault";
import type { PartRecord } from "../types/part";
import type { ReplacementRecord } from "../types/replacement";
import type { ComplianceRecord } from "../types/compliance";
import type { PhotoRecord } from "../types/photo";
import type { MarkupRecord } from "../types/markup";
import { createManifest } from "../packaging/manifestHelpers";

export type FactoryContext = {
  now?: Date | string;
  createdBy?: string;
  idPrefix?: string;
};

export type IdFactory = (prefix?: string) => ID;

function toIsoString(value?: Date | string): ISODateString {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function defaultIdFactory(prefix = "item"): ID {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${rand}`;
}

function withAuditDefaults<T extends Record<string, unknown>>(
  value: T,
  ctx?: FactoryContext
): T {
  return {
    ...value,
    createdAt: (value.createdAt as string | undefined) ?? toIsoString(ctx?.now),
    createdBy: (value.createdBy as string | undefined) ?? cleanString(ctx?.createdBy) ?? "system",
  };
}

function createEntityFactory(idFactory?: IdFactory) {
  const makeId = idFactory ?? defaultIdFactory;

  return {
    id(prefix?: string, explicitId?: string) {
      return cleanString(explicitId) ?? makeId(prefix);
    },
  };
}

export type FactoryOptions = {
  idFactory?: IdFactory;
};

export function createSegpackFactories(options: FactoryOptions = {}) {
  const entity = createEntityFactory(options.idFactory);

  function createSite(
    input: Partial<Site> & Pick<Site, "name">,
    ctx?: FactoryContext
  ): Site {
    const site: Site = withAuditDefaults(
      {
        id: entity.id("site", input.id),
        name: input.name,
        siteCode: input.siteCode,
        clientName: input.clientName,
        siteType: input.siteType,
        status: input.status ?? "active",
        address: input.address,
        coordinates: input.coordinates,
        buildingName: input.buildingName,
        campusName: input.campusName,
        buildingUse: input.buildingUse,
        contacts: input.contacts ?? [],
        access: input.access,
        buildings: input.buildings ?? [],
        areas: input.areas ?? [],
        externalRefs: input.externalRefs ?? [],
        serviceNotes: input.serviceNotes,
        hazards: input.hazards ?? [],
        responderInfo: input.responderInfo,
        description: input.description,
        notes: input.notes,
        tags: input.tags ?? [],
        meta: input.meta,
        updatedAt: input.updatedAt,
        updatedBy: input.updatedBy,
      },
      ctx
    );

    return site;
  }

  function createManifestRecord(
    input: {
      packageId?: string;
      createdBy?: string;
      schemaVersion?: string;
      title?: string;
      description?: string;
      sourceApp?: string;
      sourceAppVersion?: string;
      exportFormat?: SegpackManifest["exportFormat"];
      tags?: string[];
      createdAt?: string;
      updatedAt?: string;
    },
    ctx?: FactoryContext
  ): SegpackManifest {
    return {
      ...createManifest({
        packageId: cleanString(input.packageId) ?? entity.id("segpack"),
        createdBy: cleanString(input.createdBy) ?? cleanString(ctx?.createdBy) ?? "system",
        schemaVersion: input.schemaVersion,
        title: input.title,
        description: input.description,
        sourceApp: input.sourceApp,
        sourceAppVersion: input.sourceAppVersion,
        exportFormat: input.exportFormat,
        tags: input.tags,
        now: input.createdAt ?? ctx?.now,
      }),
      updatedAt: input.updatedAt,
    };
  }

  function createSystem(
    input: Partial<InstalledSystem> &
      Pick<InstalledSystem, "name" | "discipline">,
    ctx?: FactoryContext
  ): InstalledSystem {
    const system: InstalledSystem = withAuditDefaults(
      {
        id: entity.id("system", input.id),
        siteId: input.siteId,
        discipline: input.discipline,
        category: input.category,
        status: input.status ?? "active",
        lifecycle: input.lifecycle ?? "existing",
        systemCode: input.systemCode,
        systemRef: input.systemRef,
        name: input.name,
        buildingId: input.buildingId,
        areaIds: input.areaIds ?? [],
        manufacturer: input.manufacturer,
        platform: input.platform,
        model: input.model,
        firmwareVersion: input.firmwareVersion,
        panelCount: input.panelCount,
        deviceCount: input.deviceCount,
        zoneCount: input.zoneCount,
        networked: input.networked,
        monitored: input.monitored,
        standardRefs: input.standardRefs ?? [],
        clientSystemName: input.clientSystemName,
        maintainer: input.maintainer,
        health: input.health,
        devices: input.devices ?? [],
        circuits: input.circuits ?? [],
        zones: input.zones ?? [],
        networkNodes: input.networkNodes ?? [],
        powerSources: input.powerSources ?? [],
        externalRefs: input.externalRefs ?? [],
        description: input.description,
        notes: input.notes,
        tags: input.tags ?? [],
        meta: input.meta,
        updatedAt: input.updatedAt,
        updatedBy: input.updatedBy,
      },
      ctx
    );

    return system;
  }

  function createSystemDevice(
    input: Partial<SystemDevice> & Pick<SystemDevice, "systemId">,
    ctx?: FactoryContext
  ): SystemDevice {
    return withAuditDefaults(
      {
        id: entity.id("device", input.id),
        systemId: input.systemId,
        name: input.name,
        deviceType: input.deviceType ?? "other",
        status: input.status ?? "normal",
        criticality: input.criticality ?? "unknown",
        identifier: input.identifier,
        addressing: input.addressing,
        location: input.location,
        circuitId: input.circuitId,
        zoneId: input.zoneId,
        parentDeviceId: input.parentDeviceId,
        powered: input.powered,
        monitored: input.monitored,
        commissioned: input.commissioned,
        installDate: input.installDate,
        lastServiceDate: input.lastServiceDate,
        externalRefs: input.externalRefs ?? [],
        description: input.description,
        notes: input.notes,
        tags: input.tags ?? [],
        meta: input.meta,
        updatedAt: input.updatedAt,
        updatedBy: input.updatedBy,
      },
      ctx
    );
  }

  function createSystemCircuit(
    input: Partial<SystemCircuit> & Pick<SystemCircuit, "systemId">,
    ctx?: FactoryContext
  ): SystemCircuit {
    return withAuditDefaults(
      {
        id: entity.id("circuit", input.id),
        systemId: input.systemId,
        name: input.name,
        type: input.type ?? "other",
        reference: input.reference,
        sourceDeviceId: input.sourceDeviceId,
        destinationDeviceId: input.destinationDeviceId,
        cableType: input.cableType,
        coreCount: input.coreCount,
        lengthM: input.lengthM,
        monitored: input.monitored,
        description: input.description,
        notes: input.notes,
        tags: input.tags ?? [],
        meta: input.meta,
        updatedAt: input.updatedAt,
        updatedBy: input.updatedBy,
      },
      ctx
    );
  }

  function createSystemZone(
    input: Partial<SystemZone> & Pick<SystemZone, "systemId">,
    ctx?: FactoryContext
  ): SystemZone {
    return withAuditDefaults(
      {
        id: entity.id("zone", input.id),
        systemId: input.systemId,
        name: input.name,
        zoneNumber: input.zoneNumber,
        zoneType: input.zoneType,
        buildingId: input.buildingId,
        areaId: input.areaId,
        level: input.level,
        coverageText: input.coverageText,
        description: input.description,
        notes: input.notes,
        tags: input.tags ?? [],
        meta: input.meta,
        updatedAt: input.updatedAt,
        updatedBy: input.updatedBy,
      },
      ctx
    );
  }

  function createSystemNetworkNode(
    input: Partial<SystemNetworkNode> & Pick<SystemNetworkNode, "systemId">,
    ctx?: FactoryContext
  ): SystemNetworkNode {
    return withAuditDefaults(
      {
        id: entity.id("node", input.id),
        systemId: input.systemId,
        name: input.name,
        nodeType: input.nodeType ?? "other",
        ipAddress: input.ipAddress,
        macAddress: input.macAddress,
        vlan: input.vlan,
        uplinkNodeId: input.uplinkNodeId,
        locationText: input.locationText,
        description: input.description,
        notes: input.notes,
        tags: input.tags ?? [],
        meta: input.meta,
        updatedAt: input.updatedAt,
        updatedBy: input.updatedBy,
      },
      ctx
    );
  }

  function createSystemPowerSource(
    input: Partial<SystemPowerSource> & Pick<SystemPowerSource, "systemId">,
    ctx?: FactoryContext
  ): SystemPowerSource {
    return withAuditDefaults(
      {
        id: entity.id("power", input.id),
        systemId: input.systemId,
        name: input.name,
        powerType: input.powerType ?? "unknown",
        voltage: input.voltage,
        currentA: input.currentA,
        batteryAh: input.batteryAh,
        standbyHours: input.standbyHours,
        alarmHours: input.alarmHours,
        monitored: input.monitored,
        sourceDeviceId: input.sourceDeviceId,
        description: input.description,
        notes: input.notes,
        tags: input.tags ?? [],
        meta: input.meta,
        updatedAt: input.updatedAt,
        updatedBy: input.updatedBy,
      },
      ctx
    );
  }

  function createFault(
    input: Partial<FaultRecord> & Pick<FaultRecord, "title">,
    ctx?: FactoryContext
  ): FaultRecord {
    const fault: FaultRecord = withAuditDefaults(
      {
        id: entity.id("fault", input.id),
        siteId: input.siteId,
        systemId: input.systemId,
        subsystemId: input.subsystemId,
        deviceId: input.deviceId,
        circuitId: input.circuitId,
        zoneId: input.zoneId,
        title: input.title,
        category: input.category ?? "fault",
        source: input.source ?? "engineer-observed",
        status: input.status ?? "open",
        severity: input.severity ?? "medium",
        priority: input.priority ?? "p3",
        impact: input.impact ?? "unknown",
        verificationStatus: input.verificationStatus ?? "observed",
        location: input.location,
        symptom: input.symptom,
        rootCause: input.rootCause,
        effect: input.effect,
        firstObservedAt: input.firstObservedAt ?? toIsoString(ctx?.now),
        lastObservedAt: input.lastObservedAt,
        resolvedAt: input.resolvedAt,
        clientVisible: input.clientVisible,
        engineerActionRequired: input.engineerActionRequired ?? "yes",
        monitoringReported: input.monitoringReported,
        falseAlarmRisk: input.falseAlarmRisk,
        repeatIssue: input.repeatIssue,
        photoIds: input.photoIds ?? [],
        markupIds: input.markupIds ?? [],
        partIds: input.partIds ?? [],
        replacementIds: input.replacementIds ?? [],
        recommendedActions: input.recommendedActions ?? [],
        testResults: input.testResults ?? [],
        panelReference: input.panelReference,
        eventReference: input.eventReference,
        standardRefs: input.standardRefs ?? [],
        description: input.description,
        notes: input.notes,
        tags: input.tags ?? [],
        meta: input.meta,
        updatedAt: input.updatedAt,
        updatedBy: input.updatedBy,
      },
      ctx
    );

    return fault;
  }

  function createRemedialAction(
    input: Partial<RemedialAction> & Pick<RemedialAction, "faultId" | "title">,
    ctx?: FactoryContext
  ): RemedialAction {
    return withAuditDefaults(
      {
        id: entity.id("action", input.id),
        faultId: input.faultId,
        title: input.title,
        status: input.status ?? "recommended",
        priority: input.priority ?? "p3",
        description: input.description,
        requiresParts: input.requiresParts,
        partIds: input.partIds ?? [],
        replacementIds: input.replacementIds ?? [],
        labourEstimateHours: input.labourEstimateHours,
        targetDate: input.targetDate,
        completedAt: input.completedAt,
        completedBy: input.completedBy,
        outcome: input.outcome,
        verificationNotes: input.verificationNotes,
        name: input.name,
        notes: input.notes,
        tags: input.tags ?? [],
        meta: input.meta,
        updatedAt: input.updatedAt,
        updatedBy: input.updatedBy,
      },
      ctx
    );
  }

  function createPart(
    input: Partial<PartRecord> & Pick<PartRecord, "name">,
    ctx?: FactoryContext
  ): PartRecord {
    return withAuditDefaults(
      {
        id: entity.id("part", input.id),
        name: input.name,
        category: input.category ?? "other",
        condition: input.condition ?? "new",
        criticality: input.criticality ?? "unknown",
        identity: input.identity,
        descriptionShort: input.descriptionShort,
        stock: input.stock,
        lifecycle: input.lifecycle,
        compatibleWith: input.compatibleWith ?? [],
        suppliers: input.suppliers ?? [],
        externalRefs: input.externalRefs ?? [],
        datasheetUrl: input.datasheetUrl,
        imageUrl: input.imageUrl,
        description: input.description,
        notes: input.notes,
        tags: input.tags ?? [],
        meta: input.meta,
        updatedAt: input.updatedAt,
        updatedBy: input.updatedBy,
      },
      ctx
    );
  }

  function createReplacement(
    input: Partial<ReplacementRecord>,
    ctx?: FactoryContext
  ): ReplacementRecord {
    return withAuditDefaults(
      {
        id: entity.id("replacement", input.id),
        faultId: input.faultId,
        systemId: input.systemId,
        deviceId: input.deviceId,
        circuitId: input.circuitId,
        zoneId: input.zoneId,
        partId: input.partId,
        quantity: input.quantity ?? 1,
        title: input.title,
        reason: input.reason ?? "faulty-device",
        status: input.status ?? "planned",
        removed: input.removed,
        installed: input.installed,
        verification: input.verification,
        issuedAt: input.issuedAt,
        fittedAt: input.fittedAt,
        fittedBy: input.fittedBy,
        locationText: input.locationText,
        reference: input.reference,
        name: input.name,
        description: input.description,
        notes: input.notes,
        tags: input.tags ?? [],
        meta: input.meta,
        updatedAt: input.updatedAt,
        updatedBy: input.updatedBy,
      },
      ctx
    );
  }

  function createCompliance(
    input: Partial<ComplianceRecord> &
      Pick<ComplianceRecord, "title" | "subject">,
    ctx?: FactoryContext
  ): ComplianceRecord {
    return withAuditDefaults(
      {
        id: entity.id("compliance", input.id),
        subject: input.subject,
        category: input.category ?? "other",
        status: input.status ?? "unknown",
        result: input.result ?? "unknown",
        severity: input.severity ?? "unknown",
        riskLevel: input.riskLevel ?? "unknown",
        title: input.title,
        summary: input.summary,
        finding: input.finding,
        implication: input.implication,
        reference: input.reference,
        additionalRefs: input.additionalRefs ?? [],
        evidence: input.evidence ?? [],
        recommendation: input.recommendation,
        verified: input.verified,
        verifiedAt: input.verifiedAt,
        verifiedBy: input.verifiedBy,
        photoIds: input.photoIds ?? [],
        markupIds: input.markupIds ?? [],
        faultIds: input.faultIds ?? [],
        dueDate: input.dueDate,
        closedAt: input.closedAt,
        closedBy: input.closedBy,
        description: input.description,
        notes: input.notes,
        tags: input.tags ?? [],
        meta: input.meta,
        updatedAt: input.updatedAt,
        updatedBy: input.updatedBy,
      },
      ctx
    );
  }

  function createPhoto(
    input: Partial<PhotoRecord>,
    ctx?: FactoryContext
  ): PhotoRecord {
    return withAuditDefaults(
      {
        id: entity.id("photo", input.id),
        title: input.title,
        name: input.name,
        category: input.category ?? "other",
        fileName: input.fileName,
        uri: input.uri,
        mimeType: input.mimeType ?? "image/jpeg",
        sizeBytes: input.sizeBytes,
        checksum: input.checksum,
        capture: {
          source: input.capture?.source ?? "upload",
          capturedAt: input.capture?.capturedAt ?? toIsoString(ctx?.now),
          capturedBy: input.capture?.capturedBy ?? cleanString(ctx?.createdBy),
          deviceName: input.capture?.deviceName,
          geo: input.capture?.geo,
        },
        dimensions: input.dimensions,
        context: input.context,
        focus: input.focus,
        refs: input.refs,
        subjects: input.subjects ?? [],
        externalRefs: input.externalRefs ?? [],
        checksumSha256: input.checksumSha256,
        archived: input.archived ?? "no",
        redacted: input.redacted ?? "no",
        description: input.description,
        notes: input.notes,
        tags: input.tags ?? [],
        meta: input.meta,
        updatedAt: input.updatedAt,
        updatedBy: input.updatedBy,
      },
      ctx
    );
  }

  function createMarkup(
    input: Partial<MarkupRecord> & Pick<MarkupRecord, "shape">,
    ctx?: FactoryContext
  ): MarkupRecord {
    return withAuditDefaults(
      {
        id: entity.id("markup", input.id),
        shape: input.shape,
        geometry: input.geometry,
        style: input.style,
        text: input.text,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        severity: input.severity ?? "unknown",
        measurement: input.measurement,
        refs: input.refs,
        visible: input.visible ?? "yes",
        locked: input.locked ?? "no",
        name: input.name,
        description: input.description,
        notes: input.notes,
        tags: input.tags ?? [],
        meta: input.meta,
        updatedAt: input.updatedAt,
        updatedBy: input.updatedBy,
      },
      ctx
    );
  }

  return {
    createManifest: createManifestRecord,
    createSite,
    createSystem,
    createSystemDevice,
    createSystemCircuit,
    createSystemZone,
    createSystemNetworkNode,
    createSystemPowerSource,
    createFault,
    createRemedialAction,
    createPart,
    createReplacement,
    createCompliance,
    createPhoto,
    createMarkup,
  };
}

export function createDefaultFactories(options: FactoryOptions = {}) {
  return createSegpackFactories(options);
}