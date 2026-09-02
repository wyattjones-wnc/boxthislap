// Box This Lap - Widget Loader for Scriptable
//
// Paste this one script into Scriptable and run it. It can install or update
// the Footy and Next widgets in the same Scriptable library as this loader.
// Stable versions come from main. To test dev, run the loader from a URL with
// ?channel=dev, for example:
// scriptable:///run/Box%20This%20Lap%20Widget%20Loader?channel=dev

// Updating replaces the installed copy of a selected widget. The loader asks
// for confirmation first if it finds an existing copy.

const QUERY_PARAMETERS = args.queryParameters || {};
const SOURCE_BRANCH = String(QUERY_PARAMETERS.channel || "main").trim().toLowerCase() === "dev"
  ? "dev"
  : "main";
const REPOSITORY_RAW_ROOT = `https://raw.githubusercontent.com/wyattjones-wnc/boxthislap/${SOURCE_BRANCH}/scriptable`;

const AVAILABLE_WIDGETS = [
  {
    name: "Box This Lap Footy",
    description: "The next three Footy matches",
    sourceFile: "box-this-lap-footy-widget.js",
  },
  {
    name: "Box This Lap Next",
    description: "A countdown chosen from the Next list",
    sourceFile: "box-this-lap-next-widget.js",
  },
];

const selectedWidgets = await chooseWidgets();

if (selectedWidgets.length) {
  await installWidgets(selectedWidgets);
}

Script.complete();

async function chooseWidgets() {
  const alert = new Alert();
  alert.title = SOURCE_BRANCH === "dev"
    ? "Box This Lap Widgets (Dev)"
    : "Box This Lap Widgets";
  alert.message = "Install new widgets or update ones you already have.";
  alert.addAction("Install or update both");
  AVAILABLE_WIDGETS.forEach((widget) => {
    alert.addAction(widget.name.replace("Box This Lap ", ""));
  });
  alert.addCancelAction("Cancel");

  const choice = await alert.presentSheet();

  if (choice === 0) {
    return AVAILABLE_WIDGETS;
  }

  if (choice > 0 && choice <= AVAILABLE_WIDGETS.length) {
    return [AVAILABLE_WIDGETS[choice - 1]];
  }

  return [];
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
  const request = new Request(`${REPOSITORY_RAW_ROOT}/${widget.sourceFile}?nonce=${Date.now()}`);
  request.timeoutInterval = 20;
  const source = await request.loadString();

  if (!source.includes("Box This Lap") || !source.includes("Script.setWidget")) {
    throw new Error(`${widget.name} did not download correctly.`);
  }

  return source;
}

async function showSuccess(widgets) {
  const alert = new Alert();
  const installed = widgets.map((widget) => `• ${widget.name}: ${widget.description}`).join("\n");
  alert.title = widgets.length === 1 ? "Widget ready" : "Widgets ready";
  alert.message = `${installed}\n\nNext: add a Scriptable widget to the Home Screen, edit it, and choose the Box This Lap script you want.`;
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
