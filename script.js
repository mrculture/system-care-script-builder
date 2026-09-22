const state = {
  profile: {
    os: "Unknown",
    cpu: "Unknown",
    memory: "Unknown",
    gpu: "Unknown",
    browser: "Unknown",
  },
  level: "safe",
  script: "",
  diagnostic: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const taskPresets = {
  safe: ["userTemp", "recycleBin", "thumbnailCache", "dnsCache"],
  balanced: [
    "userTemp",
    "recycleBin",
    "thumbnailCache",
    "dnsCache",
    "windowsTemp",
    "deliveryOptimization",
    "browserCaches",
    "errorReports",
    "defenderCache",
  ],
  deepClean: [
    "userTemp",
    "recycleBin",
    "thumbnailCache",
    "dnsCache",
    "windowsTemp",
    "deliveryOptimization",
    "browserCaches",
    "errorReports",
    "defenderCache",
    "shaderCache",
    "crashDumps",
    "eventLogs",
    "componentCleanup",
    "restorePointPrune",
  ],
  maxSpace: [
    "userTemp",
    "recycleBin",
    "thumbnailCache",
    "dnsCache",
    "windowsTemp",
    "deliveryOptimization",
    "browserCaches",
    "errorReports",
    "defenderCache",
    "shaderCache",
    "crashDumps",
    "eventLogs",
    "componentCleanup",
    "restorePointPrune",
    "hibernationFile",
    "reservedStorage",
    "windowsOld",
    "componentResetBase",
  ],
};

const taskLabels = {
  userTemp: "User temp files",
  windowsTemp: "Windows temp files",
  recycleBin: "Recycle bin",
  dnsCache: "DNS cache",
  thumbnailCache: "Thumbnail cache",
  deliveryOptimization: "Windows Update delivery cache",
  browserCaches: "Browser caches",
  errorReports: "Windows Error Reporting files",
  defenderCache: "Defender cache and logs",
  shaderCache: "DirectX shader cache",
  crashDumps: "Crash dumps",
  componentCleanup: "Windows component cleanup",
  eventLogs: "Old log files",
  restorePointPrune: "System restore cleanup",
  hibernationFile: "Disable hibernation file",
  reservedStorage: "Reduce Reserved Storage",
  windowsOld: "Previous Windows installation",
  componentResetBase: "Component store reset base",
};

const taskWeights = {
  userTemp: 1200,
  windowsTemp: 734,
  recycleBin: 281,
  dnsCache: 5,
  thumbnailCache: 180,
  deliveryOptimization: 520,
  browserCaches: 640,
  errorReports: 260,
  defenderCache: 160,
  shaderCache: 520,
  crashDumps: 980,
  componentCleanup: 960,
  eventLogs: 140,
  restorePointPrune: 2048,
  hibernationFile: 4096,
  reservedStorage: 7168,
  windowsOld: 8192,
  componentResetBase: 1800,
};

const advancedTasks = ["restorePointPrune", "hibernationFile", "reservedStorage", "windowsOld", "componentResetBase"];
const tourSteps = [
  {
    selector: "#overview",
    title: "Start here",
    copy: "This page builds a cleaning script for you. If you want the simplest path, answer the questions, then use the Builder section to review the script.",
  },
  {
    selector: ".system-overview",
    title: "Check the snapshot",
    copy: "This shows cleanup readiness, estimated storage use, detected system hints, and possible upgrade bottlenecks before you answer the questions.",
  },
  {
    selector: ".guide-panel",
    title: "Answer simple questions",
    copy: "Pick the answers that best match how the computer is used. You do not need to know technical terms to get a sensible recommendation.",
  },
  {
    selector: ".scan-explain",
    title: "Browser-safe scan",
    copy: "This optional scan only reads basic browser-provided hints. It cannot access files, passwords, documents, installed apps, or private folders.",
  },
  {
    selector: "#cleanup",
    title: "Review what will be cleaned",
    copy: "The selected tasks update automatically. Advanced storage options are highlighted because they can change Windows behavior.",
  },
  {
    selector: ".controls-panel",
    title: "Preview first",
    copy: "Preview mode is on by default. That means the generated script shows what it would remove before doing the real cleanup.",
  },
  {
    selector: "#script-output",
    title: "Read before running",
    copy: "The final script appears here. Review it, then copy or download it only when you are comfortable with the selected actions.",
  },
];
let currentTourStep = 0;

function parseBrowser() {
  const agent = navigator.userAgent;
  if (agent.includes("Edg/")) return "Microsoft Edge";
  if (agent.includes("Chrome/")) return "Chrome or Chromium";
  if (agent.includes("Firefox/")) return "Firefox";
  if (agent.includes("Safari/")) return "Safari";
  return "Unknown browser";
}

function parseOs() {
  const platform = navigator.userAgentData?.platform || navigator.platform || "Unknown";
  const agent = navigator.userAgent;
  if (/Windows/i.test(platform) || /Windows/i.test(agent)) return "Windows";
  if (/Mac/i.test(platform) || /Mac OS/i.test(agent)) return "macOS";
  if (/Linux/i.test(platform) || /Linux/i.test(agent)) return "Linux";
  if (/Android/i.test(agent)) return "Android";
  if (/iPhone|iPad/i.test(agent)) return "iOS / iPadOS";
  return platform;
}

function getGpuHint() {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) return "Unavailable";
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  if (!ext) return "WebGL available";
  return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "WebGL available";
}

async function scanDevice(options = {}) {
  const scanStatus = $("#scan-status");
  if (!options.silent) {
    scanStatus.textContent = "Reading browser-safe device hints now...";
    scanStatus.classList.remove("is-complete");
  }

  const profile = {
    os: parseOs(),
    cpu: navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} logical threads; exact CPU name and speed need a local helper` : "Exact CPU name and speed need a local helper",
    memory: navigator.deviceMemory ? `${navigator.deviceMemory} GB browser hint; installed RAM speed needs a local helper` : "Total installed RAM and speed need a local helper",
    gpu: getGpuHint(),
    browser: parseBrowser(),
  };

  if (navigator.userAgentData?.getHighEntropyValues) {
    try {
      const details = await navigator.userAgentData.getHighEntropyValues([
        "architecture",
        "bitness",
        "platformVersion",
        "model",
      ]);
      const suffix = [details.architecture, details.bitness && `${details.bitness}-bit`, details.platformVersion]
        .filter(Boolean)
        .join(", ");
      profile.os = suffix ? `${details.platform || profile.os} (${suffix})` : profile.os;
    } catch {
      profile.os = `${profile.os} (high entropy hints denied)`;
    }
  }

  state.profile = profile;
  renderInsights();
  scanStatus.textContent = options.silent
    ? "Basic browser-safe hints loaded automatically. No files or personal data were accessed."
    : "Scan complete. Only browser-safe hints were read; no files or personal data were accessed.";
  scanStatus.classList.add("is-complete");
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function applyDiagnosticProfile(report) {
  const windows = report.windows || {};
  const processor = report.processor || {};
  const memory = report.memory || {};
  const graphics = Array.isArray(report.graphics) ? report.graphics[0] : report.graphics || {};
  const browsers = Array.isArray(report.browsers) ? report.browsers : [];
  const osParts = [windows.caption, windows.version, windows.architecture].filter(Boolean);
  const cpuParts = [
    processor.name,
    processor.maxClockSpeedMhz ? `${(processor.maxClockSpeedMhz / 1000).toFixed(2)} GHz` : "",
    processor.logicalProcessors ? `${processor.logicalProcessors} logical processors` : "",
  ].filter(Boolean);
  const memoryParts = [
    memory.totalGb ? `${memory.totalGb} GB` : "",
    memory.slotsUsed && memory.slotsTotal ? `${memory.slotsUsed} of ${memory.slotsTotal} RAM slots used` : "",
    memory.speedMhz ? `${memory.speedMhz} MHz` : "",
  ].filter(Boolean);

  state.diagnostic = report;
  state.profile = {
    os: osParts.join(" ") || state.profile.os,
    cpu: cpuParts.join("; ") || state.profile.cpu,
    memory: memoryParts.join("; ") || state.profile.memory,
    gpu: graphics.name || state.profile.gpu,
    browser: browsers.length ? browsers.join(", ") : state.profile.browser,
  };

  renderInsights();
}

function selectedTasks() {
  return $$("#task-options input:checked").map((input) => input.value);
}

function setSelectedTasks(tasks) {
  $$("#task-options input").forEach((input) => {
    input.checked = tasks.includes(input.value);
  });
}

function setLevel(level) {
  state.level = level;
  $$(".segment").forEach((button) => button.classList.toggle("is-active", button.dataset.level === level));
  const preset = taskPresets[level];
  setSelectedTasks(preset);
  $("#admin-tasks").checked = level === "maxSpace";
  renderInsights();
}

function answer(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value;
}

function applyRecommendations() {
  const goal = answer("goal");
  const pressure = answer("storage-pressure");
  const hibernate = answer("hibernate-use");
  const browser = answer("browser-clean");
  const updates = answer("update-health");
  const advanced = answer("admin-space");
  const drive = $("#drive-type").value;
  const tasks = new Set(taskPresets.safe);

  let level = "safe";
  let summary = "Safe cleanup selected.";

  if (goal === "speed" || pressure === "tight") {
    level = "balanced";
    taskPresets.balanced.forEach((task) => tasks.add(task));
    summary = "Balanced cleanup selected for a tidy-up plus light performance maintenance.";
  }

  if (browser === "clear") tasks.add("browserCaches");
  if (updates === "stuck") {
    taskPresets.balanced.forEach((task) => tasks.add(task));
  }

  if (goal === "max-space" || pressure === "critical") {
    level = "deepClean";
    taskPresets.deepClean.forEach((task) => tasks.add(task));
    summary = "Deep clean selected to recover more space while keeping the most behavior-changing actions separate.";
  }

  if ((goal === "max-space" || pressure === "critical") && advanced === "allow") {
    level = "maxSpace";
    taskPresets.maxSpace.forEach((task) => tasks.add(task));
    if (hibernate === "disable") tasks.add("hibernationFile");
    if (hibernate !== "disable") tasks.delete("hibernationFile");
    summary = "Max space selected with admin-only space savers included.";
  }

  if (drive === "ssd" || drive === "mixed") {
    summary += " SSD/NVMe-friendly choices are used; defrag-style actions are avoided.";
  }

  state.level = level;
  $$(".segment").forEach((button) => button.classList.toggle("is-active", button.dataset.level === level));
  setSelectedTasks([...tasks]);
  $("#admin-tasks").checked = [...tasks].some((task) => advancedTasks.includes(task));
  $("#restore-point").checked = true;
  $("#dry-run").checked = true;
  updateRecommendationSummary(summary);
  renderInsights();
}

function updateRecommendationSummary(prefix = "Current recommendation") {
  const tasks = selectedTasks();
  const admin = $("#admin-tasks").checked;
  const warnings = [];
  if (tasks.includes("hibernationFile")) warnings.push("hibernation will be disabled");
  if (tasks.includes("reservedStorage")) warnings.push("Reserved Storage change needs Administrator");
  if (tasks.includes("windowsOld")) warnings.push("previous Windows rollback files may be removed");
  if (tasks.includes("componentResetBase")) warnings.push("existing updates may become harder to uninstall");
  const warningText = warnings.length ? ` Includes: ${warnings.join("; ")}.` : "";
  $("#recommendation-summary").textContent = `${prefix} ${tasks.length} tasks selected, preview mode on, ${admin ? "admin steps included" : "no advanced Windows changes"}.${warningText}`;
}

function riskLevel() {
  const tasks = selectedTasks();
  const admin = $("#admin-tasks").checked;
  if (state.level === "maxSpace" || admin || tasks.some((task) => advancedTasks.includes(task))) return "High";
  if (state.level === "deepClean" || state.level === "balanced" || tasks.length > 7) return "Medium";
  return "Low";
}

function renderInsights() {
  const risk = riskLevel();
  const tasks = selectedTasks();
  const admin = $("#admin-tasks").checked;
  const dryRun = $("#dry-run").checked;
  $("#risk-score").textContent = `${risk} risk`;
  const meter = $(".health-ring");
  const color = risk === "High" ? "var(--red)" : risk === "Medium" ? "var(--amber)" : "var(--teal)";
  const healthScore = risk === "High" ? 61 : risk === "Medium" ? 74 : 85;
  meter.style.background = `radial-gradient(circle at center, var(--panel) 0 53%, transparent 54%), conic-gradient(${color} 0 ${healthScore}%, rgba(120, 146, 160, 0.18) ${healthScore}% 100%)`;

  const drive = $("#drive-type").value;
  const cleanupMb = tasks.reduce((total, task) => total + (taskWeights[task] || 0), 0);
  const insights = [
    `${risk} risk profile based on ${tasks.length} selected operations.`,
    drive === "hdd" ? "Hard disk systems can use disk analysis, but this generator avoids automatic defrag." : "SSD systems skip defrag-style maintenance.",
    admin ? "Admin-only commands are included with elevation checks." : "Admin-only commands are omitted.",
    dryRun ? "The generated script previews removals before making changes." : "Live cleanup mode is enabled; review the script carefully.",
  ];
  if (tasks.includes("hibernationFile")) {
    insights.push("Hibernation file removal can free several GB, but disables Hibernate and Windows Fast Startup.");
  }
  if (tasks.includes("reservedStorage")) {
    insights.push("Reserved Storage reduction can free more space, but Windows may have less update buffer later.");
  }
  if (tasks.includes("restorePointPrune")) {
    insights.push("System restore cleanup is highlighted because it reduces older recovery options.");
  }
  if (tasks.includes("windowsOld")) {
    insights.push("Previous Windows installation cleanup can recover a lot of space, but removes the easy rollback path.");
  }
  if (tasks.includes("componentResetBase")) {
    insights.push("Component reset base prevents uninstalling existing Windows updates after it runs.");
  }
  $("#health-score").textContent = `${healthScore}%`;
  $("#readiness-state").textContent = risk === "High" ? "Review" : risk === "Medium" ? "Caution" : "Good";
  $("#readiness-state").style.color = risk === "High" ? "var(--red)" : risk === "Medium" ? "var(--amber)" : "var(--green)";
  $("#readiness-meaning").textContent =
    risk === "High" ? "Read warnings first" : risk === "Medium" ? "Useful but review" : "Safe preview";
  $("#readiness-description").textContent =
    risk === "High"
      ? `${healthScore}% ready means powerful cleanup is selected. It can recover more space, but may remove rollback or recovery options, so preview and restore point matter.`
      : risk === "Medium"
        ? `${healthScore}% ready means the cleanup is useful and mostly routine, but includes deeper Windows cache or log work worth reviewing first.`
        : `${healthScore}% ready means the selected cleanup is low risk, previews changes first, and avoids advanced Windows changes.`;
  $("#task-count").textContent = tasks.length;
  $("#admin-state").textContent = admin ? "On" : "Off";
  $("#dry-run-state").textContent = dryRun ? "Dry run" : "Live";
  renderStorageOverview(cleanupMb);
  renderUpgradeRecommendations();
  $("#insights").innerHTML = insights.map((item) => `<li>${item}</li>`).join("");
  updateRecommendationSummary();
}

function formatCleanupSize(megabytes) {
  if (megabytes >= 1024) return `${(megabytes / 1024).toFixed(2)} GB`;
  return `${megabytes} MB`;
}

function cleanupTotal(tasks) {
  return tasks.reduce((total, task) => total + (taskWeights[task] || 0), 0);
}

function cleanupPotentialPercent(cleanupMb) {
  const referenceDriveMb = 512 * 1024;
  return (cleanupMb / referenceDriveMb) * 100;
}

function formatPotentialPercent(percent) {
  return percent >= 10 ? `${Math.round(percent)}%` : `${percent.toFixed(1)}%`;
}

function renderStaticStoragePotential() {
  const safeMb = cleanupTotal(taskPresets.safe);
  const maxMb = cleanupTotal(taskPresets.maxSpace);
  const safePercent = cleanupPotentialPercent(safeMb);
  const maxPercent = cleanupPotentialPercent(maxMb);
  const safeArc = Math.max(2, Math.min(100, safePercent));
  const maxArc = Math.max(2, Math.min(100, maxPercent));
  $("#storage-safe-score").textContent = formatPotentialPercent(safePercent);
  $("#storage-safe-size").textContent = formatCleanupSize(safeMb);
  $("#storage-max-score").textContent = formatPotentialPercent(maxPercent);
  $("#storage-max-size").textContent = formatCleanupSize(maxMb);
  $(".storage-ring--safe").style.background = `radial-gradient(circle at center, var(--panel) 0 53%, transparent 54%), conic-gradient(var(--teal) 0 ${safeArc}%, rgba(120, 146, 160, 0.18) ${safeArc}% 100%)`;
  $(".storage-ring--max").style.background = `radial-gradient(circle at center, var(--panel) 0 53%, transparent 54%), conic-gradient(var(--red) 0 ${maxArc}%, rgba(120, 146, 160, 0.18) ${maxArc}% 100%)`;
  $("#storage-state").textContent = "Static guide";
  $("#storage-state").style.color = "var(--green)";
}

function renderStorageOverview(cleanupMb) {
  $("#cleanup-size-secondary").textContent = `${formatCleanupSize(cleanupMb)} illustrative estimate — not scanned`;
}

function renderUpgradeRecommendations() {
  const recs = [];
  const drive = $("#drive-type").value;
  const cpuThreads = Number.parseInt(String(state.profile.cpu), 10);

  if (drive === "hdd") {
    recs.push("A standard hard disk can make everyday use feel slow. Moving Windows and apps to an SSD or NVMe drive is usually the biggest upgrade.");
  } else if (drive === "unknown") {
    recs.push("If this computer still uses a standard hard disk, an SSD/NVMe upgrade may noticeably improve startup and app loading.");
  } else {
    recs.push("SSD/NVMe drive type selected, so defrag-style maintenance is avoided.");
  }

  recs.push("RAM slot and storage-port upgrade advice requires a local hardware report or manual inspection, so this page does not guess it.");

  if (Number.isFinite(cpuThreads) && cpuThreads <= 4) {
    recs.push("The CPU thread count looks modest. Keep startup apps light and avoid expecting cleanup to solve heavy workload slowdowns.");
  }

  recs.push("Live CPU, memory-use, GPU-memory, RAM-slot, and storage-port details cannot be read by a normal web page. They require a separate local diagnostic script that the user chooses to run.");

  $("#upgrade-recommendations").innerHTML = recs.map((item) => `<li>${item}</li>`).join("");
}

function buildPowerShellScript() {
  const tasks = selectedTasks();
  const commentValue = value => String(value ?? "Unknown").replace(/[\r\n\u2028\u2029\x00-\x1f]/g, " ");
  const profileOs = commentValue(state.profile.os);
  const admin = $("#admin-tasks").checked;
  // Live cleanup remains gated until isolated-machine validation is complete.
  const dryRun = true;
  const restorePoint = $("#restore-point").checked;
  const taskSummary = tasks.map((task) => taskLabels[task]).join(", ");
  const action = dryRun ? "-WhatIf" : "-ErrorAction SilentlyContinue";
  const lines = [
    "# System Care Script Builder",
    "# Review every command before running. Close browsers before clearing browser caches.",
    `# Profile: ${profileOs}; ${commentValue($("#device-type").value)}; ${commentValue($("#drive-type").value)}; ${commentValue(state.profile.cpu)}; ${commentValue(state.profile.memory)}`,
    `# Selected tasks: ${taskSummary || "None"}`,
    "# Safety note: restore cleanup, hibernation, Reserved Storage, Windows.old, and ResetBase are advanced Windows options.",
    "",
    "$ErrorActionPreference = 'Continue'",
    "$LogRoot = Join-Path $env:TEMP 'SystemCareScriptBuilder'",
    "New-Item -ItemType Directory -Force -Path $LogRoot | Out-Null",
    "$LogFile = Join-Path $LogRoot ('care-run-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')",
    "Start-Transcript -Path $LogFile | Out-Null",
    "",
    "function Test-IsAdmin {",
    "  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()",
    "  $principal = [Security.Principal.WindowsPrincipal]::new($identity)",
    "  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)",
    "}",
    "",
    "function Clear-FolderContents {",
    "  param([Parameter(Mandatory=$true)][string]$Path)",
    "  if (Test-Path -LiteralPath $Path -PathType Container) {",
    `    Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force ${action}`,
    "  }",
    "}",
    "",
    `Write-Host "Dry run: ${dryRun ? "enabled" : "disabled"}"`,
  ];

  if (admin) {
    lines.push(
      "if (-not (Test-IsAdmin)) {",
      "  Write-Warning 'Admin tasks were selected. Re-run PowerShell as Administrator for full coverage.'",
      "}"
    );
  }

  if (restorePoint && dryRun) {
    lines.push("Write-Host 'Preview only: would request a restore point before live cleanup.'");
  } else if (restorePoint) {
    lines.push(
      "",
      "if (Test-IsAdmin) {",
      "  Checkpoint-Computer -Description 'Before System Care Script Builder cleanup' -RestorePointType 'MODIFY_SETTINGS' -ErrorAction SilentlyContinue",
      "} else {",
      "  Write-Warning 'Restore point skipped because this session is not elevated.'",
      "}"
    );
  }

  const snippets = {
    userTemp: ["", "Write-Host 'Clearing user temp files...'", "Clear-FolderContents -Path $env:TEMP"],
    windowsTemp: [
      "",
      "Write-Host 'Clearing Windows temp files...'",
      admin
        ? "if (Test-IsAdmin) { Clear-FolderContents -Path 'C:\\Windows\\Temp' } else { Write-Warning 'Windows temp cleanup needs Administrator.' }"
        : "Write-Host 'Skipped Windows temp because admin tasks are disabled.'",
    ],
    recycleBin: ["", "Write-Host 'Clearing recycle bin...'", `Clear-RecycleBin -Force ${dryRun ? "-WhatIf" : "-ErrorAction SilentlyContinue"}`],
    dnsCache: [
      "",
      "Write-Host 'Flushing DNS cache...'",
      dryRun ? "Write-Host 'Would run: Clear-DnsClientCache'" : "Clear-DnsClientCache -ErrorAction SilentlyContinue",
    ],
    thumbnailCache: [
      "",
      "Write-Host 'Clearing File Explorer thumbnail cache...'",
      `Get-ChildItem -Path "$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer" -Filter 'thumbcache_*.db' -Force -ErrorAction SilentlyContinue | Remove-Item -Force ${action}`,
    ],
    deliveryOptimization: [
      "",
      "Write-Host 'Clearing Delivery Optimization cache...'",
      admin
        ? `if (Test-IsAdmin) { Delete-DeliveryOptimizationCache -Force ${dryRun ? "-WhatIf" : "-ErrorAction SilentlyContinue"} } else { Write-Warning 'Delivery Optimization cache cleanup needs Administrator.' }`
        : "Write-Host 'Skipped Delivery Optimization cache because admin tasks are disabled.'",
    ],
    browserCaches: [
      "",
      "Write-Host 'Clearing common browser cache folders for current user...'",
      "$BrowserCachePaths = @(",
      "  \"$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\Cache\",",
      "  \"$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Cache\"",
      ")",
      "$BrowserCachePaths | ForEach-Object { Clear-FolderContents -Path $_ }",
      "Get-ChildItem -LiteralPath \"$env:LOCALAPPDATA\\Mozilla\\Firefox\\Profiles\" -Directory -ErrorAction SilentlyContinue | ForEach-Object { Clear-FolderContents -Path (Join-Path $_.FullName 'cache2') }",
    ],
    errorReports: [
      "",
      "Write-Host 'Clearing Windows Error Reporting files...'",
      "Clear-FolderContents -Path \"$env:LOCALAPPDATA\\Microsoft\\Windows\\WER\"",
      admin
        ? "if (Test-IsAdmin) { Clear-FolderContents -Path 'C:\\ProgramData\\Microsoft\\Windows\\WER' }"
        : "Write-Host 'Machine-wide Error Reporting cleanup skipped because admin tasks are disabled.'",
    ],
    defenderCache: [
      "",
      "Write-Host 'Clearing old Microsoft Defender cache and logs...'",
      admin
        ? "if (Test-IsAdmin) { Clear-FolderContents -Path 'C:\\ProgramData\\Microsoft\\Windows Defender\\Scans\\History\\Service' } else { Write-Warning 'Defender cache cleanup needs Administrator.' }"
        : "Write-Host 'Skipped Defender cache because admin tasks are disabled.'",
    ],
    shaderCache: [
      "",
      "Write-Host 'Clearing DirectX shader cache...'",
      "Clear-FolderContents -Path \"$env:LOCALAPPDATA\\D3DSCache\"",
      "Clear-FolderContents -Path \"$env:LOCALAPPDATA\\NVIDIA\\DXCache\"",
      "Clear-FolderContents -Path \"$env:LOCALAPPDATA\\AMD\\DxCache\"",
    ],
    crashDumps: [
      "",
      "Write-Host 'Clearing old crash dumps...'",
      "Clear-FolderContents -Path \"$env:LOCALAPPDATA\\CrashDumps\"",
      admin
        ? "if (Test-IsAdmin) { Get-ChildItem -Path 'C:\\Windows\\Minidump','C:\\Windows\\MEMORY.DMP' -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force " + action + " }"
        : "Write-Host 'System crash dump cleanup skipped because admin tasks are disabled.'",
    ],
    componentCleanup: [
      "",
      "Write-Host 'Running Windows component cleanup...'",
      admin
        ? dryRun
          ? "Write-Host 'Would run: DISM /Online /Cleanup-Image /StartComponentCleanup'"
          : "DISM /Online /Cleanup-Image /StartComponentCleanup"
        : "Write-Host 'Skipped component cleanup because admin tasks are disabled.'",
    ],
    eventLogs: [
      "",
      "Write-Host 'Exporting event log list before optional cleanup...'",
      "wevtutil el | Out-File (Join-Path $LogRoot 'event-log-list.txt')",
      admin
        ? dryRun
          ? "Write-Host 'Would remove old .log files from Windows temp/log folders.'"
          : "Get-ChildItem -Path 'C:\\Windows\\Logs','C:\\Windows\\Temp' -Filter *.log -Recurse -Force -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Force -ErrorAction SilentlyContinue"
        : "Write-Host 'Skipped event log maintenance because admin tasks are disabled.'",
    ],
    restorePointPrune: [
      "",
      "Write-Host 'System restore cleanup selected...'",
      "Write-Warning 'This reduces older recovery options. The script keeps this as a manual review step.'",
      dryRun
        ? "Write-Host 'Would review old restore points and keep the newest restore point.'"
        : "Write-Warning 'Open Disk Cleanup or System Protection settings to prune restore points manually after reviewing consequences.'",
    ],
    hibernationFile: [
      "",
      "Write-Host 'Disabling hibernation file to free storage...'",
      "Write-Warning 'This disables Hibernate and may disable Windows Fast Startup.'",
      admin
        ? dryRun
          ? "Write-Host 'Would run: powercfg /hibernate off'"
          : "powercfg /hibernate off"
        : "Write-Host 'Skipped hibernation change because admin tasks are disabled.'",
    ],
    reservedStorage: [
      "",
      "Write-Host 'Requesting Reserved Storage reduction...'",
      "Write-Warning 'This can free space, but Windows may have less room reserved for future updates.'",
      admin
        ? dryRun
        ? "Write-Host 'Would run: DISM /Online /Set-ReservedStorageState /State:Disabled'"
        : "DISM /Online /Set-ReservedStorageState /State:Disabled"
        : "Write-Host 'Skipped Reserved Storage change because admin tasks are disabled.'",
    ],
    windowsOld: [
      "",
      "Write-Host 'Previous Windows installation cleanup selected...'",
      "Write-Warning 'This removes Windows.old and the easy rollback path after a Windows upgrade.'",
      admin
        ? dryRun
          ? "Write-Host 'Would run: cleanmgr or Storage Sense previous Windows installation cleanup.'"
          : "Write-Warning 'Use Windows Settings > System > Storage > Temporary files to remove Previous Windows installation after review.'"
        : "Write-Host 'Skipped previous Windows installation cleanup because admin tasks are disabled.'",
    ],
    componentResetBase: [
      "",
      "Write-Host 'Component store reset base selected...'",
      "Write-Warning 'This prevents uninstalling existing Windows updates.'",
      admin
        ? dryRun
          ? "Write-Host 'Would run: DISM /Online /Cleanup-Image /StartComponentCleanup /ResetBase'"
          : "DISM /Online /Cleanup-Image /StartComponentCleanup /ResetBase"
        : "Write-Host 'Skipped component reset base because admin tasks are disabled.'",
    ],
  };

  tasks.forEach((task) => {
    if (snippets[task]) lines.push(...snippets[task]);
  });
  lines.push(
    "",
    "Stop-Transcript | Out-Null",
    "Write-Host \"Done. Log saved to $LogFile\"",
    "Write-Host ''",
    "Write-Host 'You can close this window after reading the result above.'",
    "Read-Host 'Press Enter to close'"
  );
  return lines.join("\n");
}

function buildBatchLauncher() {
  const ps = buildPowerShellScript().replaceAll("\r", "");
  const base64 = toBase64Utf8(ps);
  const chunks = base64.match(/.{1,1800}/g) || [];
  return [
    "@echo off",
    "if /I \"%~1\"==\"__inside\" goto inside",
    "start \"System Care Script Builder\" cmd /k call \"%~f0\" __inside",
    "exit /b",
    ":inside",
    "setlocal EnableExtensions DisableDelayedExpansion",
    "title System Care Script Builder",
    "echo System Care Script Builder",
    "echo.",
    "echo Preparing the PowerShell script in your temporary folder...",
    "set \"SCB_PS1=%TEMP%\\system-care-generated.ps1\"",
    "set \"SCB_B64=%TEMP%\\system-care-generated.b64\"",
    "break > \"%SCB_B64%\"",
    ...chunks.map((chunk) => `>> "%SCB_B64%" echo(${chunk}`),
    "powershell -NoProfile -ExecutionPolicy Bypass -Command \"try { $text = (Get-Content -LiteralPath $env:SCB_B64 -Raw) -replace '\\s',''; [IO.File]::WriteAllBytes($env:SCB_PS1, [Convert]::FromBase64String($text)); exit 0 } catch { Write-Host $_; exit 1 }\"",
    "if errorlevel 1 goto failed",
    "echo.",
    "echo Running: %SCB_PS1%",
    "echo A PowerShell window will stay open after the script finishes so you can read any messages.",
    "echo.",
    "powershell -NoProfile -ExecutionPolicy Bypass -NoExit -File \"%SCB_PS1%\"",
    "set \"SCB_EXIT=%ERRORLEVEL%\"",
    "echo.",
    "echo PowerShell closed with exit code %SCB_EXIT%.",
    "pause",
    "exit /b %SCB_EXIT%",
    ":failed",
    "echo.",
    "echo The batch launcher could not prepare the PowerShell script.",
    "echo Try copying the PowerShell version into Notepad and saving it as system-care-script.ps1.",
    "pause",
    "exit /b 1",
  ].join("\r\n");
}

function toBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function buildShellScript() {
  const tasks = selectedTasks();
  const lines = [
    "#!/usr/bin/env bash",
    "set -u",
    "",
    "# System Care Script Builder",
    "# Review every command before running. Close browsers before clearing browser caches.",
    "echo 'Preview only: no cleanup commands are executed.'",
  ];
  if (tasks.includes("userTemp")) lines.push("echo 'Review user temporary files manually. No temporary path is assumed.'");
  if (tasks.includes("browserCaches")) {
    lines.push(
      "echo 'Review browser cache using the browser settings. Browser profiles must not be removed.'"
    );
  }
  if (tasks.includes("dnsCache")) {
    lines.push("echo 'DNS cache commands vary by OS; run the matching command manually after review.'");
  }
  const windowsOnlyTasks = tasks.filter((task) =>
    [
      "windowsTemp",
      "deliveryOptimization",
      "errorReports",
      "defenderCache",
      "componentCleanup",
      "restorePointPrune",
      "hibernationFile",
      "reservedStorage",
      "windowsOld",
      "componentResetBase",
    ].includes(task)
  );
  if (windowsOnlyTasks.length) {
    lines.push(`echo 'Windows-only cleanup tasks selected: ${windowsOnlyTasks.map((task) => taskLabels[task]).join(", ")}.'`);
  }
  lines.push("echo 'Done.'");
  return lines.join("\n");
}

function buildDiagnosticHelperScript() {
  return [
    "# System Care Diagnostic Helper",
    "# Read this file before running. It collects hardware and performance details only.",
    "# It does not read personal files, documents, passwords, browser history, or message content.",
    "# Running PowerShell as Administrator can make some hardware fields more complete.",
    "",
    "$ErrorActionPreference = 'SilentlyContinue'",
    "$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)",
    "Write-Host 'System Care Diagnostic Helper'",
    "Write-Host 'This is read-only. It creates a JSON report on your Desktop.'",
    "if (-not $isAdmin) { Write-Warning 'Not running as Administrator. The report will still run, but some hardware fields may be incomplete.' }",
    "",
    "$computer = Get-ComputerInfo",
    "$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1",
    "$memoryModules = @(Get-CimInstance Win32_PhysicalMemory)",
    "$memoryArray = Get-CimInstance Win32_PhysicalMemoryArray | Select-Object -First 1",
    "$video = @(Get-CimInstance Win32_VideoController)",
    "$disks = @(Get-CimInstance Win32_DiskDrive)",
    "$logicalDisks = @(Get-CimInstance Win32_LogicalDisk -Filter \"DriveType=3\")",
    "$os = Get-CimInstance Win32_OperatingSystem",
    "",
    "$cpuLoad = $cpu.LoadPercentage",
    "$memoryTotalKb = [double]$os.TotalVisibleMemorySize",
    "$memoryFreeKb = [double]$os.FreePhysicalMemory",
    "$memoryUsedPercent = if ($memoryTotalKb -gt 0) { [math]::Round((($memoryTotalKb - $memoryFreeKb) / $memoryTotalKb) * 100, 1) } else { $null }",
    "$gpuDedicatedUsageMb = $null",
    "$gpuMemoryPercent = $null",
    "try {",
    "  $gpuSamples = (Get-Counter '\\GPU Adapter Memory(*)\\Dedicated Usage').CounterSamples",
    "  if ($gpuSamples) { $gpuDedicatedUsageMb = [math]::Round((($gpuSamples | Measure-Object CookedValue -Sum).Sum / 1MB), 1) }",
    "  $firstGpuRam = ($video | Where-Object { $_.AdapterRAM -gt 0 } | Select-Object -First 1).AdapterRAM",
    "  if ($firstGpuRam -and $gpuDedicatedUsageMb -ne $null) { $gpuMemoryPercent = [math]::Round((($gpuDedicatedUsageMb * 1MB) / [double]$firstGpuRam) * 100, 1) }",
    "} catch {}",
    "",
    "$browserChecks = [ordered]@{",
    "  'Microsoft Edge' = @(\"$env:ProgramFiles\\Microsoft\\Edge\\Application\\msedge.exe\", \"${env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe\")",
    "  'Google Chrome' = @(\"$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe\", \"${env:ProgramFiles(x86)}\\Google\\Chrome\\Application\\chrome.exe\")",
    "  'Mozilla Firefox' = @(\"$env:ProgramFiles\\Mozilla Firefox\\firefox.exe\", \"${env:ProgramFiles(x86)}\\Mozilla Firefox\\firefox.exe\")",
    "  'Opera' = @(\"$env:LOCALAPPDATA\\Programs\\Opera\\opera.exe\", \"$env:ProgramFiles\\Opera\\launcher.exe\")",
    "  'Brave' = @(\"$env:ProgramFiles\\BraveSoftware\\Brave-Browser\\Application\\brave.exe\", \"${env:ProgramFiles(x86)}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe\")",
    "}",
    "$browsers = @($browserChecks.GetEnumerator() | Where-Object { $_.Value | Where-Object { Test-Path $_ } } | ForEach-Object { $_.Key })",
    "",
    "$report = [ordered]@{",
    "  reportType = 'SystemCareDiagnostic'",
    "  reportVersion = 1",
    "  collectedAt = (Get-Date).ToString('o')",
    "  ranAsAdministrator = $isAdmin",
    "  windows = [ordered]@{",
    "    caption = $computer.WindowsProductName",
    "    version = $computer.WindowsVersion",
    "    build = $computer.OsBuildNumber",
    "    architecture = $computer.OsArchitecture",
    "  }",
    "  processor = [ordered]@{",
    "    name = $cpu.Name",
    "    maxClockSpeedMhz = $cpu.MaxClockSpeed",
    "    cores = $cpu.NumberOfCores",
    "    logicalProcessors = $cpu.NumberOfLogicalProcessors",
    "  }",
    "  memory = [ordered]@{",
    "    totalGb = [math]::Round(($memoryModules | Measure-Object Capacity -Sum).Sum / 1GB, 1)",
    "    slotsTotal = $memoryArray.MemoryDevices",
    "    slotsUsed = @($memoryModules).Count",
    "    slotsFree = if ($memoryArray.MemoryDevices -ne $null) { [int]$memoryArray.MemoryDevices - @($memoryModules).Count } else { $null }",
    "    speedMhz = ($memoryModules | Select-Object -ExpandProperty Speed -Unique | Where-Object { $_ } | Select-Object -First 1)",
    "  }",
    "  graphics = @($video | ForEach-Object { [ordered]@{ name = $_.Name; adapterRamMb = if ($_.AdapterRAM) { [math]::Round($_.AdapterRAM / 1MB, 0) } else { $null }; driverVersion = $_.DriverVersion } })",
    "  disks = @($disks | ForEach-Object { [ordered]@{ model = $_.Model; mediaType = $_.MediaType; interfaceType = $_.InterfaceType; sizeGb = if ($_.Size) { [math]::Round($_.Size / 1GB, 1) } else { $null } } })",
    "  volumes = @($logicalDisks | ForEach-Object { [ordered]@{ drive = $_.DeviceID; sizeGb = [math]::Round($_.Size / 1GB, 1); freeGb = [math]::Round($_.FreeSpace / 1GB, 1) } })",
    "  metrics = [ordered]@{",
    "    cpuLoadPercent = $cpuLoad",
    "    memoryUsedPercent = $memoryUsedPercent",
    "    gpuDedicatedUsageMb = $gpuDedicatedUsageMb",
    "    gpuMemoryUsedPercent = $gpuMemoryPercent",
    "  }",
    "  browsers = $browsers",
    "}",
    "",
    "$json = $report | ConvertTo-Json -Depth 6",
    "$output = Join-Path ([Environment]::GetFolderPath('Desktop')) 'system-care-diagnostic-report.json'",
    "$json | Set-Content -LiteralPath $output -Encoding UTF8",
    "Write-Host \"Diagnostic report saved to: $output\"",
    "Write-Host 'Open the JSON file, review it, then paste or upload it back into the System Care page if you want to use it.'",
    "Write-Host ''",
    "Write-Host 'You can close this window after noting where the report was saved.'",
    "Read-Host 'Press Enter to close'",
  ].join("\n");
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadDiagnosticHelper() {
  const script = buildDiagnosticHelperScript();
  state.script = script;
  $("#script-code").textContent = script;
  $("#diagnostic-status").textContent = "Diagnostic helper generated. Review it before running; it creates a JSON report on your Desktop.";
  $("#diagnostic-status").classList.add("is-complete");
  downloadTextFile("system-care-diagnostic-helper.ps1", script);
  document.querySelector("#script-output").scrollIntoView({ behavior: "smooth", block: "start" });
}

function parseDiagnosticReport(raw) {
  const report = JSON.parse(raw);
  if (report.reportType !== "SystemCareDiagnostic") {
    throw new Error("This does not look like a System Care diagnostic report.");
  }
  applyDiagnosticProfile(report);
  $("#diagnostic-status").textContent = "Diagnostic report applied. The overview now uses the local report where available.";
  $("#diagnostic-status").classList.add("is-complete");
}

function applyDiagnosticFromTextarea() {
  const raw = $("#diagnostic-json").value.trim();
  if (!raw) {
    $("#diagnostic-status").textContent = "Paste the JSON report first, then press Use this report.";
    $("#diagnostic-status").classList.remove("is-complete");
    return;
  }
  try {
    parseDiagnosticReport(raw);
  } catch (error) {
    $("#diagnostic-status").textContent = error.message || "The report could not be read.";
    $("#diagnostic-status").classList.remove("is-complete");
  }
}

async function loadDiagnosticFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const raw = await file.text();
    $("#diagnostic-json").value = raw;
    parseDiagnosticReport(raw);
  } catch (error) {
    $("#diagnostic-status").textContent = error.message || "The report file could not be read.";
    $("#diagnostic-status").classList.remove("is-complete");
  }
}

function generateScript() {
  const format = $("#script-format").value;
  const script = format === "batch" ? buildBatchLauncher() : format === "shell" ? buildShellScript() : buildPowerShellScript();
  state.script = script;
  $("#script-code").textContent = script;
  renderInsights();
}

function switchGuideTab(tabName) {
  $$(".read-tab").forEach((tab) => {
    const isActive = tab.dataset.guideTab === tabName;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  ["novice", "advanced"].forEach((name) => {
    const panel = $(`#${name}-guide`);
    panel.hidden = name !== tabName;
    panel.classList.toggle("is-active", name === tabName);
  });
}

function showTourStep(index) {
  currentTourStep = Math.max(0, Math.min(index, tourSteps.length - 1));
  const step = tourSteps[currentTourStep];
  const target = document.querySelector(step.selector);

  $$(".tour-target").forEach((element) => element.classList.remove("tour-target"));
  if (target) {
    target.classList.add("tour-target");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  $("#tour-step-count").textContent = `Step ${currentTourStep + 1} of ${tourSteps.length}`;
  $("#tour-title").textContent = step.title;
  $("#tour-copy").textContent = step.copy;
  $("#tour-prev").disabled = currentTourStep === 0;
  $("#tour-next").textContent = currentTourStep === tourSteps.length - 1 ? "Finish" : "Next";
}

function openTour() {
  $("#tour-overlay").hidden = false;
  showTourStep(0);
}

function closeTour() {
  $("#tour-overlay").hidden = true;
  $$(".tour-target").forEach((element) => element.classList.remove("tour-target"));
  window.scrollTo({ top: 0, behavior: "smooth" });
  try {
    localStorage.setItem("systemCareTourSeen", "true");
  } catch {}
}

function nextTourStep() {
  if (currentTourStep >= tourSteps.length - 1) {
    closeTour();
    return;
  }
  showTourStep(currentTourStep + 1);
}

function previousTourStep() {
  showTourStep(currentTourStep - 1);
}

function shouldAutoStartTour() {
  try {
    return localStorage.getItem("systemCareTourSeen") !== "true";
  } catch {
    return true;
  }
}

function scriptSaveHelp() {
  const format = $("#script-format").value;
  if (format === "batch") {
    return {
      filename: "system-care-script.bat",
      app: "Notepad",
      warning: "This is the Batch launcher format, so saving it as .bat is correct.",
      run: "Find it on your Desktop, right-click it, and choose Run as administrator if the script includes admin tasks.",
    };
  }
  if (format === "shell") {
    return {
      filename: "system-care-script.sh",
      app: "TextEdit, VS Code, or another plain text editor",
      warning: "This is the macOS/Linux shell format, so do not save it as .bat on Windows.",
      run: "On macOS or Linux, open Terminal, go to the folder, run chmod +x system-care-script.sh, then run ./system-care-script.sh.",
    };
  }
  return {
    filename: "system-care-script.ps1",
    app: "Notepad",
    warning: "This is PowerShell code. Save it as .ps1, not .bat. A .bat file cannot run these lines directly.",
    run: "Do not rely on double-clicking the .ps1 file. Open Windows PowerShell as administrator, type Set-ExecutionPolicy -Scope Process Bypass, press Enter, then run the saved .ps1 file after reviewing it.",
  };
}

function openCopyHelp() {
  const help = scriptSaveHelp();
  $("#copy-help-copy").textContent =
    `The script text is copied. ${help.warning}`;
  const steps = [
    `Open ${help.app}.`,
    "Paste the copied script text into a blank file.",
    `Save the file on your Desktop as ${help.filename}. Choose All files if Notepad tries to add .txt.`,
    "Read the saved file once more before running it.",
    help.run,
  ];
  $("#copy-help-steps").innerHTML = steps.map((step) => `<li>${step}</li>`).join("");
  $("#copy-help-overlay").hidden = false;
}

function closeCopyHelp() {
  $("#copy-help-overlay").hidden = true;
}

async function copyScript() {
  generateScript();
  try { await navigator.clipboard.writeText(state.script); } catch {
    $("#copy-script").textContent = "Copy manually from output";
    return;
  }
  $("#copy-script").textContent = "Copied";
  openCopyHelp();
  setTimeout(() => {
    $("#copy-script").textContent = "Copy";
  }, 1400);
}

function downloadScript() {
  generateScript();
  const format = $("#script-format").value;
  const extension = format === "batch" ? "bat" : format === "shell" ? "sh" : "ps1";
  downloadTextFile(`system-care-script.${extension}`, state.script);
}

function regenerateVisibleScript() {
  if (state.script) generateScript();
}

$("#scan-device").addEventListener("click", scanDevice);
$("#use-browser-only").addEventListener("click", scanDevice);
$("#download-diagnostic").addEventListener("click", downloadDiagnosticHelper);
$("#apply-diagnostic").addEventListener("click", applyDiagnosticFromTextarea);
$("#diagnostic-file").addEventListener("change", loadDiagnosticFile);
$("#generate-script").addEventListener("click", generateScript);
$("#copy-script").addEventListener("click", copyScript);
$("#download-script").addEventListener("click", downloadScript);
$("#start-tour").addEventListener("click", openTour);
$("#tour-next").addEventListener("click", nextTourStep);
$("#tour-prev").addEventListener("click", previousTourStep);
$("#tour-skip").addEventListener("click", closeTour);
$("#copy-help-ok").addEventListener("click", closeCopyHelp);
$("#copy-help-close").addEventListener("click", closeCopyHelp);
$("#drive-type").addEventListener("change", renderInsights);
$("#script-format").addEventListener("change", regenerateVisibleScript);
$("#admin-tasks").addEventListener("change", renderInsights);
$("#dry-run").addEventListener("change", renderInsights);
$("#task-options").addEventListener("change", renderInsights);
$$(".question-card input").forEach((input) => input.addEventListener("change", applyRecommendations));
$$(".read-tab").forEach((tab) => tab.addEventListener("click", () => switchGuideTab(tab.dataset.guideTab)));
$$(".segment").forEach((button) => button.addEventListener("click", () => setLevel(button.dataset.level)));

renderStaticStoragePotential();
applyRecommendations();
scanDevice({ silent: true });
if (shouldAutoStartTour()) {
  window.requestAnimationFrame(openTour);
}
