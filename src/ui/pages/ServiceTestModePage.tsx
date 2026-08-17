import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

type TestResult = "PASS" | "FAIL" | "SKIP";

type FilterMode =
  | "ALL"
  | "MCP"
  | "DETECTORS"
  | "SOUNDERS"
  | "NOT_TESTED"
  | "FAILED"
  | "SKIPPED";

type TestAsset = {
  assetId: string;
  discipline: "fire" | "intruder";
  zone?: number;
  loop?: number;
  address?: number;
  type: string;
  location: string;
  voiceId: string;
};

type ResultLog = {
  assetId: string;
  result: TestResult;
  timestamp: string;
};

type SavedRoute = {
  name: string;
  assetIds: string[];
  createdAt: string;
};

type SavedTestSession = {
  masterAssets: TestAsset[];
  activeAssetIds: string[];
  results: ResultLog[];
  currentIndex: number;
  voiceEnabled: boolean;
  bluetoothEnabled: boolean;
  startingZone: number;
  importStatus: string;
  paused: boolean;
  filterMode: FilterMode;
  routes: SavedRoute[];
  activeRouteName: string;
  bt006ModeEnabled: boolean;
  savedAt: string;
};

const sampleAssets: TestAsset[] = [
  {
    assetId: "L1A13",
    discipline: "fire",
    zone: 1,
    loop: 1,
    address: 13,
    type: "Call Point",
    location: "Main Entrance Emergency Exit",
    voiceId: "Loop 1 Address 13, Call Point, Main Entrance Emergency Exit",
  },
];

const silentAudio =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

function getStorageKey(siteFileId?: string) {
  return `secosite:test-mode:${siteFileId || "demo"}`;
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseAdvancedZoneTxt(text: string, zoneNumber: number): TestAsset[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => cleanText(line))
    .filter(Boolean);

  const assets: TestAsset[] = [];

  for (const line of lines) {
    const match = line.match(/Loop\s*(\d+)\/(\d+)\.?\d*\s+(.+)/i);
    if (!match) continue;

    const loop = Number(match[1]);
    const address = Number(match[2]);
    const rest = cleanText(match[3]);

    const knownTypes = [
      "Optical Smoke",
      "Heat Detector",
      "Call Point",
      "Sounder Beacon",
      "Sounder",
      "Multi Sensor",
      "Multisensor",
      "Beam Detector",
      "Beam",
      "Input Output",
      "Input",
      "Output",
      "Interface",
      "Relay",
      "Monitor",
    ];

    const foundType =
      knownTypes.find((type) =>
        rest.toLowerCase().startsWith(type.toLowerCase())
      ) || rest.split(" ").slice(0, 2).join(" ");

    const location = cleanText(rest.replace(new RegExp(`^${foundType}`, "i"), ""));
    const assetId = `L${loop}A${address}`;

    assets.push({
      assetId,
      discipline: "fire",
      zone: zoneNumber,
      loop,
      address,
      type: foundType,
      location: location || "Location not set",
      voiceId: `Loop ${loop} Address ${address}, ${foundType}, ${
        location || "Location not set"
      }`,
    });
  }

  return assets.sort((a, b) => {
    if ((a.zone ?? 0) !== (b.zone ?? 0)) return (a.zone ?? 0) - (b.zone ?? 0);
    if ((a.loop ?? 0) !== (b.loop ?? 0)) return (a.loop ?? 0) - (b.loop ?? 0);
    return (a.address ?? 0) - (b.address ?? 0);
  });
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
}

function isDetector(asset: TestAsset) {
  const value = asset.type.toLowerCase();
  return (
    value.includes("smoke") ||
    value.includes("heat") ||
    value.includes("multi") ||
    value.includes("beam") ||
    value.includes("detector")
  );
}

function isMcp(asset: TestAsset) {
  const value = asset.type.toLowerCase();
  return value.includes("call point") || value.includes("mcp");
}

function isSounder(asset: TestAsset) {
  const value = asset.type.toLowerCase();
  return value.includes("sounder") || value.includes("beacon");
}

export function ServiceTestModePage() {
  const { siteFileId } = useParams();
  const btAudioRef = useRef<HTMLAudioElement | null>(null);

  const [masterAssets, setMasterAssets] = useState<TestAsset[]>(sampleAssets);
  const [activeAssetIds, setActiveAssetIds] = useState<string[]>(
    sampleAssets.map((asset) => asset.assetId)
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<ResultLog[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(true);
  const [bt006ModeEnabled, setBt006ModeEnabled] = useState(false);
  const [startingZone, setStartingZone] = useState(1);
  const [importStatus, setImportStatus] = useState("No zone files imported yet.");
  const [sessionStatus, setSessionStatus] = useState("");
  const [paused, setPaused] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("ALL");
  const [lastButtonEvent, setLastButtonEvent] = useState("No Bluetooth/media input yet.");
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [routeName, setRouteName] = useState("");
  const [activeRouteName, setActiveRouteName] = useState("Full Site");

  const storageKey = getStorageKey(siteFileId);

  const assetById = useMemo(() => {
    return new Map(masterAssets.map((asset) => [asset.assetId, asset]));
  }, [masterAssets]);

  const assets = useMemo(() => {
    return activeAssetIds
      .map((assetId) => assetById.get(assetId))
      .filter(Boolean) as TestAsset[];
  }, [activeAssetIds, assetById]);

  const currentAsset = assets[currentIndex];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;

      const saved = JSON.parse(raw) as SavedTestSession;

      if (Array.isArray(saved.masterAssets) && saved.masterAssets.length > 0) {
        setMasterAssets(saved.masterAssets);
        setActiveAssetIds(
          Array.isArray(saved.activeAssetIds) && saved.activeAssetIds.length > 0
            ? saved.activeAssetIds
            : saved.masterAssets.map((asset) => asset.assetId)
        );
        setResults(Array.isArray(saved.results) ? saved.results : []);
        setCurrentIndex(
          Math.min(
            Math.max(saved.currentIndex ?? 0, 0),
            Math.max((saved.activeAssetIds?.length ?? saved.masterAssets.length) - 1, 0)
          )
        );
        setVoiceEnabled(saved.voiceEnabled ?? true);
        setBluetoothEnabled(saved.bluetoothEnabled ?? true);
        setBt006ModeEnabled(saved.bt006ModeEnabled ?? false);
        setStartingZone(saved.startingZone ?? 1);
        setImportStatus(saved.importStatus || "Restored previous test session.");
        setPaused(saved.paused ?? false);
        setFilterMode(saved.filterMode ?? "ALL");
        setRoutes(Array.isArray(saved.routes) ? saved.routes : []);
        setActiveRouteName(saved.activeRouteName || "Full Site");
        setSessionStatus(
          saved.savedAt
            ? `Restored session saved ${new Date(saved.savedAt).toLocaleString()}`
            : "Restored previous test session."
        );
      }
    } catch {
      setSessionStatus("Could not restore previous session.");
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      const session: SavedTestSession = {
        masterAssets,
        activeAssetIds,
        results,
        currentIndex,
        voiceEnabled,
        bluetoothEnabled,
        bt006ModeEnabled,
        startingZone,
        importStatus,
        paused,
        filterMode,
        routes,
        activeRouteName,
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(storageKey, JSON.stringify(session));
    } catch {
      setSessionStatus("Could not save session locally.");
    }
  }, [
    masterAssets,
    activeAssetIds,
    results,
    currentIndex,
    voiceEnabled,
    bluetoothEnabled,
    bt006ModeEnabled,
    startingZone,
    importStatus,
    paused,
    filterMode,
    routes,
    activeRouteName,
    storageKey,
  ]);

  const resultMap = useMemo(() => {
    return new Map(results.map((result) => [result.assetId, result]));
  }, [results]);

  const testedAssetIds = useMemo(
    () => new Set(results.map((result) => result.assetId)),
    [results]
  );

  const skippedAssets = useMemo(
    () =>
      results
        .filter((result) => result.result === "SKIP")
        .map((result) => result.assetId),
    [results]
  );

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const result = resultMap.get(asset.assetId);

      if (filterMode === "MCP") return isMcp(asset);
      if (filterMode === "DETECTORS") return isDetector(asset);
      if (filterMode === "SOUNDERS") return isSounder(asset);
      if (filterMode === "NOT_TESTED") return !result;
      if (filterMode === "FAILED") return result?.result === "FAIL";
      if (filterMode === "SKIPPED") return result?.result === "SKIP";

      return true;
    });
  }, [assets, filterMode, resultMap]);

  const testedCount = testedAssetIds.size;
  const totalCount = assets.length;
  const progressPercent =
    totalCount > 0 ? Math.round((testedCount / totalCount) * 100) : 0;

  const handleZoneFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const importedAssets: TestAsset[] = [];

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const text = await file.text();
      const parsed = parseAdvancedZoneTxt(text, startingZone + index);
      importedAssets.push(...parsed);
    }

    const uniqueAssets = Array.from(
      new Map(importedAssets.map((asset) => [asset.assetId, asset])).values()
    ).sort((a, b) => {
      if ((a.zone ?? 0) !== (b.zone ?? 0)) return (a.zone ?? 0) - (b.zone ?? 0);
      if ((a.loop ?? 0) !== (b.loop ?? 0)) return (a.loop ?? 0) - (b.loop ?? 0);
      return (a.address ?? 0) - (b.address ?? 0);
    });

    setMasterAssets(uniqueAssets);
    setActiveAssetIds(uniqueAssets.map((asset) => asset.assetId));
    setCurrentIndex(0);
    setResults([]);
    setPaused(false);
    setFilterMode("ALL");
    setActiveRouteName("Full Site");
    setImportStatus(
      `${uniqueAssets.length} assets imported from ${files.length} file(s).`
    );
    setSessionStatus("New test session imported and saved locally.");

    if (uniqueAssets[0] && voiceEnabled) {
      setTimeout(() => speak(uniqueAssets[0].voiceId), 400);
    }

    event.target.value = "";
  };

  const moveNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, assets.length - 1));
  }, [assets.length]);

  const movePrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const jumpToAsset = (assetId: string) => {
    const index = assets.findIndex((asset) => asset.assetId === assetId);
    if (index < 0) return;

    setCurrentIndex(index);

    const asset = assets[index];
    if (voiceEnabled) {
      setTimeout(() => speak(asset.voiceId), 150);
    }
  };

  const recordResult = useCallback(
    (result: TestResult) => {
      if (!currentAsset || paused) return;

      const logEntry: ResultLog = {
        assetId: currentAsset.assetId,
        result,
        timestamp: new Date().toISOString(),
      };

      setResults((prev) => [
        ...prev.filter((entry) => entry.assetId !== currentAsset.assetId),
        logEntry,
      ]);

      if (voiceEnabled) {
        speak(`${result.toLowerCase()} recorded`);
      }

      setTimeout(() => {
        const nextIndex = Math.min(currentIndex + 1, assets.length - 1);
        setCurrentIndex(nextIndex);

        const nextAsset = assets[nextIndex];
        if (voiceEnabled && nextIndex !== currentIndex && nextAsset) {
          setTimeout(() => speak(nextAsset.voiceId), 350);
        }
      }, 450);
    },
    [assets, currentAsset, currentIndex, paused, voiceEnabled]
  );

  const repeatVoice = useCallback(() => {
    if (currentAsset) speak(currentAsset.voiceId);
  }, [currentAsset]);

  const togglePause = () => {
    setPaused((prev) => {
      const next = !prev;
      if (voiceEnabled) {
        speak(next ? "Testing paused" : "Testing resumed");
      }
      return next;
    });
  };

  const enableBt006Mode = async () => {
    try {
      if (!btAudioRef.current) {
        const audio = new Audio(silentAudio);
        audio.loop = true;
        audio.volume = 0.01;
        btAudioRef.current = audio;
      }

      await btAudioRef.current.play();

      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: "SeCo Site Test Mode",
          artist: "BT006 Hands-Free Control",
          album: "Service Testing",
        });

        navigator.mediaSession.setActionHandler("play", () => {
          setLastButtonEvent("BT006 MediaSession: PASS");
          recordResult("PASS");
        });

        navigator.mediaSession.setActionHandler("pause", () => {
          setLastButtonEvent("BT006 MediaSession: PASS");
          recordResult("PASS");
          setTimeout(() => btAudioRef.current?.play().catch(() => undefined), 100);
        });

        navigator.mediaSession.setActionHandler("nexttrack", () => {
          setLastButtonEvent("BT006 MediaSession: SKIP");
          recordResult("SKIP");
        });

        navigator.mediaSession.setActionHandler("previoustrack", () => {
          setLastButtonEvent("BT006 MediaSession: BACK");
          movePrevious();
        });

        navigator.mediaSession.setActionHandler("stop", () => {
          setLastButtonEvent("BT006 MediaSession: REPEAT");
          repeatVoice();
        });
      }

      setBt006ModeEnabled(true);
      setBluetoothEnabled(true);
      setLastButtonEvent("BT006 mode enabled. Try Play/Pause, Next and Previous.");
      setSessionStatus("BT006 mode enabled.");
    } catch {
      setSessionStatus("BT006 mode could not start. Tap the button again or check iPhone audio permissions.");
    }
  };

  const disableBt006Mode = () => {
    try {
      btAudioRef.current?.pause();

      if ("mediaSession" in navigator) {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
        navigator.mediaSession.setActionHandler("stop", null);
      }
    } catch {
      // Ignore cleanup failure.
    }

    setBt006ModeEnabled(false);
    setLastButtonEvent("BT006 mode disabled.");
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!bluetoothEnabled) return;

      const key = event.key;

      if (
        [
          "MediaPlayPause",
          "MediaTrackNext",
          "MediaTrackPrevious",
          "AudioVolumeUp",
          "AudioVolumeDown",
          " ",
          "Enter",
          "ArrowRight",
          "ArrowLeft",
        ].includes(key)
      ) {
        event.preventDefault();
      }

      if (key === "MediaPlayPause" || key === " " || key === "Enter") {
        setLastButtonEvent("Bluetooth/media: PASS");
        recordResult("PASS");
      }

      if (key === "MediaTrackNext" || key === "ArrowRight") {
        setLastButtonEvent("Bluetooth/media: SKIP");
        recordResult("SKIP");
      }

      if (key === "MediaTrackPrevious" || key === "ArrowLeft") {
        setLastButtonEvent("Bluetooth/media: BACK");
        movePrevious();
      }

      if (key === "AudioVolumeUp") {
        setLastButtonEvent("Bluetooth/media: REPEAT");
        repeatVoice();
      }

      if (key === "AudioVolumeDown") {
        setLastButtonEvent("Bluetooth/media: FAIL");
        recordResult("FAIL");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bluetoothEnabled, movePrevious, recordResult, repeatVoice]);

  const saveCurrentFilteredRoute = () => {
    const trimmed = routeName.trim();

    if (!trimmed) {
      setSessionStatus("Enter a route name first.");
      return;
    }

    if (filteredAssets.length === 0) {
      setSessionStatus("No assets in the current filter to save.");
      return;
    }

    const newRoute: SavedRoute = {
      name: trimmed,
      assetIds: filteredAssets.map((asset) => asset.assetId),
      createdAt: new Date().toISOString(),
    };

    setRoutes((prev) => [
      ...prev.filter((route) => route.name !== trimmed),
      newRoute,
    ]);
    setRouteName("");
    setSessionStatus(`Saved route "${trimmed}" with ${newRoute.assetIds.length} assets.`);
  };

  const loadRoute = (route: SavedRoute) => {
    const validIds = route.assetIds.filter((assetId) => assetById.has(assetId));

    if (validIds.length === 0) {
      setSessionStatus(`Route "${route.name}" has no matching assets loaded.`);
      return;
    }

    setActiveAssetIds(validIds);
    setCurrentIndex(0);
    setFilterMode("ALL");
    setActiveRouteName(route.name);
    setPaused(false);
    setSessionStatus(`Loaded route "${route.name}" with ${validIds.length} assets.`);

    const firstAsset = assetById.get(validIds[0]);
    if (firstAsset && voiceEnabled) {
      setTimeout(() => speak(firstAsset.voiceId), 300);
    }
  };

  const deleteRoute = (routeNameToDelete: string) => {
    setRoutes((prev) => prev.filter((route) => route.name !== routeNameToDelete));
    setSessionStatus(`Deleted route "${routeNameToDelete}".`);
  };

  const loadFullSite = () => {
    setActiveAssetIds(masterAssets.map((asset) => asset.assetId));
    setCurrentIndex(0);
    setFilterMode("ALL");
    setActiveRouteName("Full Site");
    setPaused(false);
    setSessionStatus("Loaded full site list.");

    if (masterAssets[0] && voiceEnabled) {
      setTimeout(() => speak(masterAssets[0].voiceId), 300);
    }
  };

  const resetTestProgress = () => {
    setCurrentIndex(0);
    setResults([]);
    setPaused(false);
    window.speechSynthesis?.cancel();
    setSessionStatus("Test progress reset. Imported assets and saved routes kept.");

    if (assets[0] && voiceEnabled) {
      setTimeout(() => speak(assets[0].voiceId), 300);
    }
  };

  const clearSession = () => {
    localStorage.removeItem(storageKey);
    disableBt006Mode();
    setMasterAssets(sampleAssets);
    setActiveAssetIds(sampleAssets.map((asset) => asset.assetId));
    setCurrentIndex(0);
    setResults([]);
    setVoiceEnabled(true);
    setBluetoothEnabled(true);
    setStartingZone(1);
    setImportStatus("No zone files imported yet.");
    setSessionStatus("Saved test session cleared.");
    setPaused(false);
    setFilterMode("ALL");
    setRoutes([]);
    setRouteName("");
    setActiveRouteName("Full Site");
    window.speechSynthesis?.cancel();
  };

  const existingResult = currentAsset
    ? results.find((result) => result.assetId === currentAsset.assetId)
    : undefined;

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>SeCo Site Test Mode</p>
          <h1 style={styles.title}>Hands-Free Service Test</h1>
          <p style={styles.subtitle}>Site ID: {siteFileId || "Demo Site"}</p>
          <p style={styles.routeLabel}>Active route: {activeRouteName}</p>
        </div>

        <button
          type="button"
          onClick={() => setVoiceEnabled((prev) => !prev)}
          style={{
            ...styles.smallButton,
            ...(voiceEnabled ? styles.voiceOn : styles.voiceOff),
          }}
        >
          Voice {voiceEnabled ? "On" : "Off"}
        </button>
      </section>

      <section style={styles.card}>
        <h3 style={styles.sectionTitle}>Import Zone TXT Files</h3>

        <label style={styles.fieldLabel}>
          Starting zone number
          <input
            type="number"
            min={1}
            value={startingZone}
            onChange={(event) => setStartingZone(Number(event.target.value))}
            style={styles.input}
          />
        </label>

        <input
          type="file"
          accept=".txt"
          multiple
          onChange={handleZoneFileUpload}
          style={styles.fileInput}
        />

        <p style={styles.muted}>{importStatus}</p>
        {sessionStatus ? <p style={styles.sessionText}>{sessionStatus}</p> : null}
      </section>

      <section style={styles.progressCard}>
        <div style={styles.progressTop}>
          <strong>
            {testedCount} / {totalCount} tested
          </strong>
          <span>{progressPercent}%</span>
        </div>

        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressFill,
              width: `${progressPercent}%`,
            }}
          />
        </div>
      </section>

      <section style={styles.card}>
        <h3 style={styles.sectionTitle}>Hands-Free Controls</h3>

        <div style={styles.controlGrid}>
          <button
            type="button"
            onClick={togglePause}
            style={paused ? styles.continueButton : styles.pauseButton}
          >
            {paused ? "Continue" : "Pause"}
          </button>

          <button
            type="button"
            onClick={() => setBluetoothEnabled((prev) => !prev)}
            style={bluetoothEnabled ? styles.btOnButton : styles.btOffButton}
          >
            Bluetooth {bluetoothEnabled ? "On" : "Off"}
          </button>

          <button
            type="button"
            onClick={enableBt006Mode}
            style={bt006ModeEnabled ? styles.bt006OnButton : styles.bt006Button}
          >
            {bt006ModeEnabled ? "BT006 Mode On" : "Enable BT006 Mode"}
          </button>

          <button
            type="button"
            onClick={disableBt006Mode}
            style={styles.bt006OffButton}
          >
            Disable BT006
          </button>
        </div>

        <p style={styles.muted}>{lastButtonEvent}</p>
        <p style={styles.muted}>
          BT006 iPhone mode tries to capture: Play/Pause = PASS, Next = SKIP,
          Previous = BACK. Volume buttons may stay as iPhone system volume.
        </p>
      </section>

      <section style={styles.card}>
        <h3 style={styles.sectionTitle}>Filters</h3>
        <div style={styles.filterWrap}>
          <FilterButton label="All" active={filterMode === "ALL"} onClick={() => setFilterMode("ALL")} />
          <FilterButton label="MCP only" active={filterMode === "MCP"} onClick={() => setFilterMode("MCP")} />
          <FilterButton label="Detectors" active={filterMode === "DETECTORS"} onClick={() => setFilterMode("DETECTORS")} />
          <FilterButton label="Sounders" active={filterMode === "SOUNDERS"} onClick={() => setFilterMode("SOUNDERS")} />
          <FilterButton label="Not tested" active={filterMode === "NOT_TESTED"} onClick={() => setFilterMode("NOT_TESTED")} />
          <FilterButton label="Failed" active={filterMode === "FAILED"} onClick={() => setFilterMode("FAILED")} />
          <FilterButton label="Skipped" active={filterMode === "SKIPPED"} onClick={() => setFilterMode("SKIPPED")} />
        </div>
        <p style={styles.muted}>{filteredAssets.length} assets shown in current filter.</p>
      </section>

      <section style={styles.card}>
        <h3 style={styles.sectionTitle}>Custom Test Routes</h3>

        <div style={styles.routeInputRow}>
          <input
            type="text"
            placeholder="Q1 Route / MCP Route / Void Route"
            value={routeName}
            onChange={(event) => setRouteName(event.target.value)}
            style={styles.input}
          />

          <button
            type="button"
            onClick={saveCurrentFilteredRoute}
            style={styles.saveRouteButton}
          >
            Save Current Filter
          </button>
        </div>

        <div style={styles.routeGrid}>
          <button type="button" onClick={loadFullSite} style={styles.routeCard}>
            <strong>Full Site</strong>
            <small>{masterAssets.length} assets</small>
          </button>

          {routes.map((route) => (
            <div key={route.name} style={styles.routeCardWrap}>
              <button
                type="button"
                onClick={() => loadRoute(route)}
                style={styles.routeCard}
              >
                <strong>{route.name}</strong>
                <small>{route.assetIds.length} assets</small>
              </button>

              <button
                type="button"
                onClick={() => deleteRoute(route.name)}
                style={styles.deleteRouteButton}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </section>

      {!currentAsset ? (
        <section style={styles.card}>
          <h2>No assets loaded</h2>
          <p style={styles.muted}>Upload zone TXT files to start testing.</p>
        </section>
      ) : (
        <section style={paused ? styles.pausedCard : styles.card}>
          <p style={styles.assetCount}>
            Asset {currentIndex + 1} of {totalCount}
          </p>

          <h2 style={styles.assetId}>{currentAsset.assetId}</h2>

          <div style={styles.assetDetails}>
            <p>
              <strong>Type:</strong> {currentAsset.type}
            </p>
            <p>
              <strong>Location:</strong> {currentAsset.location}
            </p>
            <p>
              <strong>Zone:</strong> {currentAsset.zone ?? "-"}
            </p>
            <p>
              <strong>Loop:</strong> {currentAsset.loop ?? "-"}
            </p>
            <p>
              <strong>Address:</strong> {currentAsset.address ?? "-"}
            </p>
          </div>

          {paused && <div style={styles.pauseBanner}>Testing paused</div>}

          {existingResult && (
            <div style={styles.resultBanner}>
              Current result: <strong>{existingResult.result}</strong>
            </div>
          )}

          <div style={styles.voiceBox}>
            <p>{currentAsset.voiceId}</p>
            <button type="button" onClick={repeatVoice} style={styles.repeatButton}>
              Repeat Voice
            </button>
          </div>

          <div style={styles.actionGrid}>
            <button
              type="button"
              onClick={() => recordResult("PASS")}
              disabled={paused}
              style={{ ...styles.actionButton, ...styles.passButton }}
            >
              PASS
            </button>

            <button
              type="button"
              onClick={() => recordResult("FAIL")}
              disabled={paused}
              style={{ ...styles.actionButton, ...styles.failButton }}
            >
              FAIL
            </button>

            <button
              type="button"
              onClick={() => recordResult("SKIP")}
              disabled={paused}
              style={{ ...styles.actionButton, ...styles.skipButton }}
            >
              SKIP
            </button>
          </div>

          <div style={styles.navRow}>
            <button type="button" onClick={movePrevious} style={styles.navButton}>
              Previous
            </button>

            <button type="button" onClick={moveNext} style={styles.navButton}>
              Next
            </button>
          </div>
        </section>
      )}

      <section style={styles.card}>
        <h3 style={styles.sectionTitle}>Jump To Device</h3>

        {filteredAssets.length === 0 ? (
          <p style={styles.muted}>No assets in this filter.</p>
        ) : (
          <div style={styles.assetList}>
            {filteredAssets.map((asset) => {
              const result = resultMap.get(asset.assetId);
              const isCurrent = currentAsset?.assetId === asset.assetId;

              return (
                <button
                  key={asset.assetId}
                  type="button"
                  onClick={() => jumpToAsset(asset.assetId)}
                  style={{
                    ...styles.assetListItem,
                    ...(isCurrent ? styles.assetListItemCurrent : {}),
                  }}
                >
                  <div>
                    <strong>{asset.assetId}</strong> — {asset.type}
                    <div style={styles.assetListLocation}>{asset.location}</div>
                  </div>

                  <span
                    style={{
                      ...styles.statusBadge,
                      ...(result?.result === "PASS" ? styles.passBadge : {}),
                      ...(result?.result === "FAIL" ? styles.failBadge : {}),
                      ...(result?.result === "SKIP" ? styles.skipBadge : {}),
                    }}
                  >
                    {result?.result ?? "OPEN"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section style={styles.card}>
        <h3 style={styles.sectionTitle}>Skipped Assets</h3>

        {skippedAssets.length === 0 ? (
          <p style={styles.muted}>No skipped assets yet.</p>
        ) : (
          <ul style={styles.list}>
            {skippedAssets.map((assetId) => (
              <li key={assetId}>{assetId}</li>
            ))}
          </ul>
        )}
      </section>

      <section style={styles.card}>
        <h3 style={styles.sectionTitle}>Result Log</h3>

        {results.length === 0 ? (
          <p style={styles.muted}>No results recorded yet.</p>
        ) : (
          <div style={styles.logList}>
            {results.map((result) => (
              <div key={result.assetId} style={styles.logRow}>
                <span>{result.assetId}</span>
                <strong>{result.result}</strong>
                <small>{new Date(result.timestamp).toLocaleTimeString()}</small>
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={styles.bottomActions}>
        <button type="button" onClick={resetTestProgress} style={styles.resetButton}>
          Reset Progress
        </button>

        <button type="button" onClick={clearSession} style={styles.clearButton}>
          Clear Session
        </button>
      </div>
    </main>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active ? styles.filterActive : styles.filterButton}
    >
      {label}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "18px",
    background: "#f3f5f8",
    color: "#172033",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "center",
    marginBottom: "16px",
  },
  eyebrow: {
    margin: 0,
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#667085",
    fontWeight: 700,
  },
  title: {
    margin: "4px 0",
    fontSize: "26px",
    lineHeight: 1.1,
  },
  subtitle: {
    margin: 0,
    color: "#667085",
  },
  routeLabel: {
    margin: "6px 0 0",
    color: "#1d4ed8",
    fontWeight: 900,
  },
  card: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "18px",
    marginBottom: "14px",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
    border: "1px solid rgba(15, 23, 42, 0.06)",
  },
  pausedCard: {
    background: "#fff7ed",
    borderRadius: "18px",
    padding: "18px",
    marginBottom: "14px",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
    border: "2px solid #f59e0b",
  },
  progressCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "14px",
    marginBottom: "14px",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
  },
  progressTop: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
  },
  progressTrack: {
    height: "12px",
    background: "#e5e7eb",
    borderRadius: "999px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "#2563eb",
    borderRadius: "999px",
    transition: "width 0.25s ease",
  },
  controlGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  pauseButton: {
    minHeight: "50px",
    borderRadius: "14px",
    border: "none",
    background: "#f59e0b",
    color: "#111827",
    fontWeight: 900,
  },
  continueButton: {
    minHeight: "50px",
    borderRadius: "14px",
    border: "none",
    background: "#16a34a",
    color: "#ffffff",
    fontWeight: 900,
  },
  btOnButton: {
    minHeight: "50px",
    borderRadius: "14px",
    border: "none",
    background: "#dcfce7",
    color: "#166534",
    fontWeight: 900,
  },
  btOffButton: {
    minHeight: "50px",
    borderRadius: "14px",
    border: "none",
    background: "#fee2e2",
    color: "#991b1b",
    fontWeight: 900,
  },
  bt006Button: {
    minHeight: "50px",
    borderRadius: "14px",
    border: "none",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontWeight: 900,
  },
  bt006OnButton: {
    minHeight: "50px",
    borderRadius: "14px",
    border: "none",
    background: "#111827",
    color: "#ffffff",
    fontWeight: 900,
  },
  bt006OffButton: {
    minHeight: "50px",
    borderRadius: "14px",
    border: "none",
    background: "#f3f4f6",
    color: "#111827",
    fontWeight: 900,
  },
  filterWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  filterButton: {
    border: "1px solid #d0d5dd",
    background: "#ffffff",
    color: "#111827",
    borderRadius: "999px",
    padding: "10px 12px",
    fontWeight: 800,
  },
  filterActive: {
    border: "1px solid #111827",
    background: "#111827",
    color: "#ffffff",
    borderRadius: "999px",
    padding: "10px 12px",
    fontWeight: 800,
  },
  routeInputRow: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
    marginBottom: "14px",
  },
  saveRouteButton: {
    minHeight: "46px",
    border: "none",
    borderRadius: "12px",
    background: "#111827",
    color: "#ffffff",
    fontWeight: 900,
  },
  routeGrid: {
    display: "grid",
    gap: "10px",
  },
  routeCardWrap: {
    position: "relative",
  },
  routeCard: {
    width: "100%",
    minHeight: "64px",
    borderRadius: "14px",
    border: "1px solid #d0d5dd",
    background: "#ffffff",
    padding: "12px",
    textAlign: "left",
    display: "grid",
    gap: "4px",
    color: "#111827",
  },
  deleteRouteButton: {
    position: "absolute",
    top: "8px",
    right: "8px",
    width: "28px",
    height: "28px",
    borderRadius: "999px",
    border: "none",
    background: "#dc2626",
    color: "#ffffff",
    fontWeight: 900,
  },
  assetCount: {
    margin: 0,
    color: "#667085",
    fontWeight: 700,
  },
  assetId: {
    fontSize: "44px",
    margin: "8px 0 12px",
    letterSpacing: "-0.04em",
  },
  assetDetails: {
    display: "grid",
    gap: "4px",
    marginBottom: "14px",
  },
  pauseBanner: {
    padding: "12px",
    borderRadius: "12px",
    background: "#fef3c7",
    color: "#92400e",
    fontWeight: 900,
    marginBottom: "14px",
  },
  resultBanner: {
    padding: "12px",
    borderRadius: "12px",
    background: "#eef2ff",
    color: "#1e3a8a",
    marginBottom: "14px",
  },
  voiceBox: {
    background: "#f8fafc",
    borderRadius: "14px",
    padding: "14px",
    marginBottom: "16px",
    border: "1px solid #e5e7eb",
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "12px",
  },
  actionButton: {
    minHeight: "90px",
    border: "none",
    borderRadius: "16px",
    color: "#ffffff",
    fontSize: "26px",
    fontWeight: 900,
    letterSpacing: "0.04em",
  },
  passButton: {
    background: "#16a34a",
  },
  failButton: {
    background: "#dc2626",
  },
  skipButton: {
    background: "#f59e0b",
  },
  navRow: {
    display: "flex",
    gap: "10px",
    marginTop: "14px",
  },
  navButton: {
    flex: 1,
    minHeight: "46px",
    borderRadius: "12px",
    border: "1px solid #d0d5dd",
    background: "#ffffff",
    fontWeight: 800,
  },
  smallButton: {
    border: "none",
    borderRadius: "999px",
    padding: "10px 14px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  voiceOn: {
    background: "#dcfce7",
    color: "#166534",
  },
  voiceOff: {
    background: "#fee2e2",
    color: "#991b1b",
  },
  repeatButton: {
    width: "100%",
    minHeight: "44px",
    borderRadius: "12px",
    border: "1px solid #d0d5dd",
    background: "#ffffff",
    fontWeight: 800,
  },
  sectionTitle: {
    margin: "0 0 10px",
  },
  muted: {
    color: "#667085",
  },
  sessionText: {
    color: "#1d4ed8",
    fontWeight: 800,
  },
  fieldLabel: {
    display: "grid",
    gap: 8,
    marginBottom: 12,
    fontWeight: 800,
  },
  input: {
    minHeight: 44,
    borderRadius: 10,
    border: "1px solid #d0d5dd",
    padding: "0 12px",
    fontSize: 16,
  },
  fileInput: {
    width: "100%",
    marginBottom: 12,
  },
  assetList: {
    display: "grid",
    gap: "8px",
    maxHeight: "430px",
    overflow: "auto",
  },
  assetListItem: {
    width: "100%",
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    borderRadius: "14px",
    padding: "12px",
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    textAlign: "left",
    color: "#111827",
  },
  assetListItemCurrent: {
    border: "2px solid #2563eb",
    background: "#eff6ff",
  },
  assetListLocation: {
    marginTop: "4px",
    color: "#667085",
    fontSize: "13px",
  },
  statusBadge: {
    height: "fit-content",
    borderRadius: "999px",
    padding: "6px 10px",
    background: "#f3f4f6",
    color: "#374151",
    fontWeight: 900,
    fontSize: "12px",
  },
  passBadge: {
    background: "#dcfce7",
    color: "#166534",
  },
  failBadge: {
    background: "#fee2e2",
    color: "#991b1b",
  },
  skipBadge: {
    background: "#fef3c7",
    color: "#92400e",
  },
  list: {
    margin: 0,
    paddingLeft: "20px",
  },
  logList: {
    display: "grid",
    gap: "8px",
  },
  logRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto auto",
    gap: "10px",
    alignItems: "center",
    padding: "10px",
    borderRadius: "10px",
    background: "#f8fafc",
  },
  bottomActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginBottom: "18px",
  },
  resetButton: {
    width: "100%",
    minHeight: "48px",
    borderRadius: "14px",
    border: "none",
    background: "#111827",
    color: "#ffffff",
    fontWeight: 900,
  },
  clearButton: {
    width: "100%",
    minHeight: "48px",
    borderRadius: "14px",
    border: "none",
    background: "#dc2626",
    color: "#ffffff",
    fontWeight: 900,
  },
};