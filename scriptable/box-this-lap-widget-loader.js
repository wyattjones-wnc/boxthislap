// Box This Lap - Widget Loader for Scriptable
//
// Paste this one script into Scriptable and run it. It can install or update
// the Footy, Formula 1, and Next widgets in the same Scriptable library as this loader.
// Stable versions come from main. To test dev, run the loader from a URL with
// ?channel=dev, for example:
// scriptable:///run/Box%20This%20Lap%20Widget%20Loader?channel=dev

// Use Update this loader in the menu to check for a newer loader. Updating a
// widget replaces its installed copy after confirmation.
// Compatibility marker for older self-updating copies: updateInstallerIfNeeded.

const DEFAULT_SOURCE_BRANCH = "main";
const LOADER_VERSION = "2026.09.24.2";
const QUERY_PARAMETERS = args.queryParameters || {};
let SOURCE_BRANCH = String(QUERY_PARAMETERS.channel || DEFAULT_SOURCE_BRANCH).trim().toLowerCase() === "dev"
  ? "dev"
  : "main";
let activeLoaderVersion = LOADER_VERSION;

const AVAILABLE_WIDGETS = [
  {
    name: "Box This Lap Footy",
    description: "The next three or eight Footy matches",
    sourceFile: "box-this-lap-footy-widget.js",
  },
  {
    name: "Box This Lap Formula 1",
    description: "The next one, three, or six Formula 1 rounds",
    sourceFile: "box-this-lap-formula-one-widget.js",
  },
  {
    name: "Box This Lap Next",
    description: "A focused countdown or a large upcoming list",
    sourceFile: "box-this-lap-next-widget.js",
  },
];

await runLoader();
Script.complete();

async function runLoader() {
  const selectedWidgets = await chooseWidgets();

  if (selectedWidgets.length) {
    await installWidgets(selectedWidgets);
  }
}

async function updateInstaller() {
  try {
    let downloadedSource = await downloadSourceFile("box-this-lap-widget-loader.js", SOURCE_BRANCH, 8);
    let downloadedVersion = getLoaderVersion(downloadedSource);
    let adoptedDevelopmentChannel = false;

    if (!downloadedVersion && SOURCE_BRANCH === "main") {
      const developmentSource = await downloadSourceFile("box-this-lap-widget-loader.js", "dev", 8);
      const developmentVersion = getLoaderVersion(developmentSource);
      if (developmentVersion) {
        downloadedSource = developmentSource;
        downloadedVersion = developmentVersion;
        SOURCE_BRANCH = "dev";
        adoptedDevelopmentChannel = true;
      }
    }

    if (!downloadedSource.includes("Box This Lap - Widget Loader") || !downloadedVersion) {
      throw new Error("The widget installer did not download correctly.");
    }

    const nextSource = setDefaultSourceBranch(downloadedSource, SOURCE_BRANCH);
    const storage = getScriptStorage();
    if (downloadedVersion === activeLoaderVersion && !adoptedDevelopmentChannel) {
      await showInstallerCurrent();
      return;
    }

    storage.manager.writeString(module.filename, nextSource);
    activeLoaderVersion = downloadedVersion;
    await showInstallerUpdated();
  } catch (error) {
    console.warn(`Unable to update the widget installer: ${error}`);
    await showInstallerUpdateError(error);
  }
}

async function downloadSourceFile(fileName, branch, timeoutInterval = 20) {
  const root = `https://raw.githubusercontent.com/wyattjones-wnc/boxthislap/${branch}/scriptable`;
  const request = new Request(`${root}/${fileName}?nonce=${Date.now()}`);
  request.timeoutInterval = timeoutInterval;
  return request.loadString();
}

function setDefaultSourceBranch(source, branch) {
  return source.replace(
    /const DEFAULT_SOURCE_BRANCH = "(?:main|dev)";/,
    `const DEFAULT_SOURCE_BRANCH = "${branch}";`
  );
}

async function showInstallerUpdated() {
  const alert = new Alert();
  alert.title = "Installer updated";
  alert.message = "The latest Box This Lap widget installer is ready. Continue to return to the loader options.";
  alert.addAction("Continue");
  await alert.presentAlert();
}

function getLoaderVersion(source) {
  return String(source || "").match(/const LOADER_VERSION = "([^"]+)";/)?.[1] || "";
}

async function showInstallerCurrent() {
  const alert = new Alert();
  alert.title = "Loader is current";
  alert.message = `This is already the latest ${SOURCE_BRANCH} version of the Box This Lap Widget Loader.`;
  alert.addAction("Done");
  await alert.presentAlert();
}

async function showInstallerUpdateError(error) {
  const alert = new Alert();
  alert.title = "Couldn’t update loader";
  alert.message = String(error && error.message ? error.message : error);
  alert.addAction("OK");
  await alert.presentAlert();
}

async function chooseWidgets() {
  const alert = new Alert();
  const actions = [
    { type: "widgets", widgets: AVAILABLE_WIDGETS },
    ...AVAILABLE_WIDGETS.map((widget) => ({ type: "widgets", widgets: [widget] })),
    { type: "update-loader" },
    { type: "share-loader" },
  ];
  alert.title = SOURCE_BRANCH === "dev"
    ? "Box This Lap Widgets (Dev)"
    : "Box This Lap Widgets";
  alert.message = "Install new widgets or update ones you already have.";
  actions.forEach((action, index) => {
    if (index === 0) alert.addAction("Install or update all");
    else if (action.type === "widgets") alert.addAction(action.widgets[0].name.replace("Box This Lap ", ""));
    else if (action.type === "update-loader") alert.addAction("Update this loader");
    else alert.addAction("Share this installer");
  });
  alert.addCancelAction("Cancel");

  const choice = await alert.presentSheet();
  const selectedAction = actions[choice];

  if (!selectedAction) return [];
  if (selectedAction.type === "widgets") return selectedAction.widgets;

  if (selectedAction.type === "update-loader") {
    await updateInstaller();
    return chooseWidgets();
  }

  if (selectedAction.type === "share-loader") {
    await shareInstaller();
  }

  return [];
}

async function shareInstaller() {
  const storage = getScriptStorage();
  const source = storage.manager.readString(module.filename);
  const sharedSource = setDefaultSourceBranch(source, SOURCE_BRANCH);
  const localManager = FileManager.local();
  const sharedPath = localManager.joinPath(
    localManager.temporaryDirectory(),
    "Box This Lap Widget Loader.js"
  );
  localManager.writeString(sharedPath, sharedSource);
  await ShareSheet.present([sharedPath]);
}

async function installWidgets(widgets) {
  const storage = getScriptStorage();
  const existingNames = widgets
    .filter((widget) => storage.manager.fileExists(getDestinationPath(storage, widget)))
    .map((widget) => widget.name);

  if (existingNames.length && !(await confirmReplacement(existingNames))) {
    return;
  }

  try {
    const downloads = [];

    for (const widget of widgets) {
      downloads.push({
        widget,
        source: await downloadWidget(widget),
      });
    }

    downloads.forEach(({ widget, source }) => {
      storage.manager.writeString(getDestinationPath(storage, widget), source);
    });

    await showSuccess(downloads.map(({ widget }) => widget));
  } catch (error) {
    await showError(error);
  }
}

function getScriptStorage() {
  const currentPath = normalizePath(module.filename);
  const candidates = [];

  try {
    candidates.push(FileManager.iCloud());
  } catch {
    // iCloud is optional in Scriptable.
  }

  candidates.push(FileManager.local());

  for (const manager of candidates) {
    try {
      const documentsDirectory = manager.documentsDirectory();
      const normalizedDirectory = normalizePath(documentsDirectory);

      if (currentPath === normalizedDirectory || currentPath.startsWith(`${normalizedDirectory}/`)) {
        return { manager, documentsDirectory };
      }
    } catch {
      // Skip storage providers that are not available on this device.
    }
  }

  const fallbackManager = FileManager.local();
  return {
    manager: fallbackManager,
    documentsDirectory: fallbackManager.documentsDirectory(),
  };
}

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/\/$/, "");
}

function getDestinationPath(storage, widget) {
  return storage.manager.joinPath(storage.documentsDirectory, `${widget.name}.js`);
}

async function confirmReplacement(existingNames) {
  const alert = new Alert();
  alert.title = existingNames.length === 1 ? "Update installed widget?" : "Update installed widgets?";
  alert.message = `${existingNames.join("\n")}\n\nThe installed copy will be replaced with the latest ${SOURCE_BRANCH} version.`;
  alert.addAction("Update");
  alert.addCancelAction("Keep current version");
  return await alert.presentAlert() === 0;
}

async function downloadWidget(widget) {
  let source;
  try {
    source = await downloadSourceFile(widget.sourceFile, SOURCE_BRANCH);
    validateWidgetSource(source, widget);
  } catch (error) {
    if (SOURCE_BRANCH !== "main") throw error;
    source = await downloadSourceFile(widget.sourceFile, "dev");
    validateWidgetSource(source, widget);
    adoptSourceBranch("dev");
  }

  return source;
}

function validateWidgetSource(source, widget) {
  if (!source.includes("Box This Lap") || !source.includes("Script.setWidget")) {
    throw new Error(`${widget.name} did not download correctly.`);
  }
}

function adoptSourceBranch(branch) {
  SOURCE_BRANCH = branch;
  const storage = getScriptStorage();
  const currentSource = storage.manager.readString(module.filename);
  storage.manager.writeString(module.filename, setDefaultSourceBranch(currentSource, branch));
}

async function showSuccess(widgets) {
  const alert = new Alert();
  const installed = widgets.map((widget) => `• ${widget.name}: ${widget.description}`).join("\n");
  alert.title = widgets.length === 1 ? "Widget ready" : "Widgets ready";
  alert.message = `${installed}\n\nNext: add a Scriptable widget to the Home Screen, edit it, choose the Box This Lap script you want, and set When Interacting to Run Script.\n\nUpdating an existing widget? Remove it from the Home Screen and add it again once so iOS drops its old tap action.`;
  alert.addAction("Done");
  await alert.presentAlert();
}

async function showError(error) {
  const alert = new Alert();
  alert.title = "Couldn’t install widgets";
  alert.message = String(error && error.message ? error.message : error);
  alert.addAction("OK");
  await alert.presentAlert();
}
