const MANAGER_PORTAL_SPREADSHEET_ID = "1LpGZYoPm6EjGt6yta7n0OToHAuKYaTD3xfcRFgh1DcI";
const MANAGER_PORTAL_SPREADSHEET_ID_PROPERTY = "MANAGER_PORTAL_SPREADSHEET_ID";
const MANAGER_AUTH_SHEET_NAMES = [
  "Manager Auth",
  "Managers Private",
  "PRIVATE - IF AGENT CAN SEE ALERT",
];

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: "boxthislap-manager-portal" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(event) {
  const payload = parseManagerPayload_(event);

  if (
    payload.action === "authStatus" ||
    payload.action === "login" ||
    payload.action === "setupPassphrase" ||
    payload.action === "verifyRecovery"
  ) {
    return handleManagerAuth_(payload);
  }

  return createPortalResponse_(payload, { ok: false, error: "Unknown manager portal action." });
}

function parseManagerPayload_(event) {
  const text = event?.parameter?.payload || event?.postData?.contents || "{}";

  try {
    return JSON.parse(text);
  } catch (error) {
    return {};
  }
}

function handleManagerAuth_(payload) {
  try {
    const managerId = String(payload.managerId || "").trim();
    const passphrase = String(payload.passphrase || "");

    if (!managerId) {
      return createPortalResponse_(payload, { ok: false, error: "Manager is required." });
    }

    const sheet = getManagerAuthSheet_();
    const table = readSheetTable_(sheet);
    const idColumn = findColumn_(table.headers, ["Manager ID", "ID"]);
    const passphraseColumn = findColumn_(table.headers, ["Passphrase", "Passcode"]);
    const displayNameColumn = findColumn_(table.headers, ["Display Name", "Name"]);
    const recoveryQuestionColumn = findColumn_(table.headers, ["Recovery Question", "Question"]);
    const recoveryAnswerColumn = findColumn_(table.headers, ["Recovery Answer", "Answer"]);
    const mustResetColumn = findColumn_(table.headers, ["Must_Reset", "Must Reset", "MustReset"]);
    const updatedAtColumn = findColumn_(table.headers, ["Updated_At", "Updated At", "UpdatedAt"]);

    if (idColumn < 0 || passphraseColumn < 0) {
      return createPortalResponse_(payload, { ok: false, error: "Manager auth sheet needs Manager ID and Passphrase columns." });
    }

    const rowIndex = table.rows.findIndex((row) => String(row[idColumn] || "").trim() === managerId);

    if (rowIndex < 0) {
      return createPortalResponse_(payload, { ok: false, error: "Manager was not found in the auth sheet." });
    }

    const row = table.rows[rowIndex];
    const storedPassphrase = String(row[passphraseColumn] || "");
    const mustReset = mustResetColumn >= 0 && isTruthy_(row[mustResetColumn]);

    if (payload.action === "authStatus") {
      return createPortalResponse_(payload, {
        ok: true,
        managerId,
        displayName: displayNameColumn >= 0 ? row[displayNameColumn] : "",
        hasPassphrase: Boolean(storedPassphrase),
        mustReset,
        recoveryQuestion: (!mustReset && storedPassphrase) || recoveryQuestionColumn < 0 ? "" : row[recoveryQuestionColumn],
      });
    }

    if (payload.action === "verifyRecovery") {
      if (storedPassphrase && !mustReset) {
        return createPortalResponse_(payload, { ok: false, error: "A passphrase already exists for this manager." });
      }

      const recoveryCheck = validateRecoveryAnswer_(payload, row, recoveryAnswerColumn);

      if (!recoveryCheck.ok) {
        return createPortalResponse_(payload, recoveryCheck);
      }

      return createPortalResponse_(payload, {
        ok: true,
        managerId,
        displayName: displayNameColumn >= 0 ? row[displayNameColumn] : "",
        recoveryQuestion: recoveryQuestionColumn >= 0 ? row[recoveryQuestionColumn] : "",
      });
    }

    if (payload.action === "setupPassphrase") {
      if (storedPassphrase && !mustReset) {
        return createPortalResponse_(payload, { ok: false, error: "A passphrase already exists for this manager." });
      }

      if (!passphrase) {
        return createPortalResponse_(payload, { ok: false, error: "Passphrase is required." });
      }

      const recoveryCheck = validateRecoveryAnswer_(payload, row, recoveryAnswerColumn);

      if (!recoveryCheck.ok) {
        return createPortalResponse_(payload, recoveryCheck);
      }

      sheet.getRange(rowIndex + 2, passphraseColumn + 1).setValue(passphrase);

      if (mustResetColumn >= 0) {
        sheet.getRange(rowIndex + 2, mustResetColumn + 1).setValue(false);
      }

      updateManagerSecretTimestamp_(sheet, rowIndex, updatedAtColumn);

      return createPortalResponse_(payload, {
        ok: true,
        managerId,
        displayName: displayNameColumn >= 0 ? row[displayNameColumn] : "",
      });
    }

    if (!passphrase) {
      return createPortalResponse_(payload, { ok: false, error: "Passphrase is required." });
    }

    if (mustReset) {
      return createPortalResponse_(payload, { ok: false, error: "Passphrase reset is required for this manager." });
    }

    if (!isPassphraseMatch_(passphrase, storedPassphrase)) {
      return createPortalResponse_(payload, { ok: false, error: "Passphrase did not match." });
    }

    return createPortalResponse_(payload, {
      ok: true,
      managerId,
      displayName: displayNameColumn >= 0 ? row[displayNameColumn] : "",
    });
  } catch (error) {
    return createPortalResponse_(payload, { ok: false, error: error.message });
  }
}

function validateRecoveryAnswer_(payload, row, recoveryAnswerColumn) {
  if (recoveryAnswerColumn < 0) {
    return { ok: false, error: "Manager auth sheet needs a Recovery Answer column for first-time setup." };
  }

  const expectedAnswer = String(row[recoveryAnswerColumn] || "");
  const submittedAnswer = String(payload.recoveryAnswer || "");

  if (!isRecoveryAnswerMatch_(submittedAnswer, expectedAnswer)) {
    return { ok: false, error: "Recovery answer did not match." };
  }

  return { ok: true };
}

function isRecoveryAnswerMatch_(submittedAnswer, expectedAnswer) {
  const submitted = normalizeRecoveryAnswer_(submittedAnswer);
  const expected = normalizeRecoveryAnswer_(expectedAnswer);

  if (!submitted || !expected) {
    return false;
  }

  return expected.includes(submitted) || submitted.includes(expected);
}

function normalizeRecoveryAnswer_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isPassphraseMatch_(submittedPassphrase, storedPassphrase) {
  const submitted = normalizePassphrase_(submittedPassphrase);
  const stored = normalizePassphrase_(storedPassphrase);

  return Boolean(submitted && stored && submitted === stored);
}

function normalizePassphrase_(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function updateManagerSecretTimestamp_(sheet, rowIndex, updatedAtColumn) {
  if (updatedAtColumn < 0) {
    return;
  }

  sheet.getRange(rowIndex + 2, updatedAtColumn + 1).setValue(new Date());
}

function isTruthy_(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["1", "true", "yes", "y", "x"].includes(normalized);
}

function getManagerAuthSheet_() {
  const spreadsheet = getManagerPortalSpreadsheet_();

  for (const sheetName of MANAGER_AUTH_SHEET_NAMES) {
    const sheet = spreadsheet.getSheetByName(sheetName);

    if (sheet) {
      return sheet;
    }
  }

  throw new Error(`Could not find manager auth sheet. Expected one of: ${MANAGER_AUTH_SHEET_NAMES.join(", ")}`);
}

function getManagerPortalSpreadsheet_() {
  const configuredSpreadsheetId = MANAGER_PORTAL_SPREADSHEET_ID ||
    PropertiesService.getScriptProperties().getProperty(MANAGER_PORTAL_SPREADSHEET_ID_PROPERTY);

  if (configuredSpreadsheetId) {
    return SpreadsheetApp.openById(configuredSpreadsheetId);
  }

  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (activeSpreadsheet) {
    return activeSpreadsheet;
  }

  throw new Error(`Set ${MANAGER_PORTAL_SPREADSHEET_ID_PROPERTY} in Script Properties, set MANAGER_PORTAL_SPREADSHEET_ID in code, or deploy this script bound to the manager portal workbook.`);
}

function readSheetTable_(sheet) {
  const values = sheet.getDataRange().getValues();

  if (values.length === 0) {
    return { headers: [], rows: [] };
  }

  return {
    headers: values[0].map((value) => String(value || "").trim()),
    rows: values.slice(1),
  };
}

function findColumn_(headers, candidates) {
  const normalizedCandidates = candidates.map((candidate) => normalizeHeader_(candidate));

  return headers.findIndex((header) => normalizedCandidates.includes(normalizeHeader_(header)));
}

function normalizeHeader_(value) {
  return String(value || "").trim().toLowerCase();
}

function createPortalResponse_(payload, response) {
  const body = {
    source: "boxthislap-manager-portal",
    callbackId: payload.callbackId || "",
    ...response,
  };
  const message = JSON.stringify(body);
  const script = `
    <!doctype html>
    <html>
      <body>
        <pre id="response">${escapeHtml_(message)}</pre>
        <script>
          (function () {
            var message = ${JSON.stringify(message)};
            var parsed = JSON.parse(message);
            function send() {
              try {
                parent.postMessage(parsed, "*");
              } catch (error) {}
              try {
                parent.postMessage(message, "*");
              } catch (error) {}
              try {
                top.postMessage(parsed, "*");
              } catch (error) {}
              try {
                top.postMessage(message, "*");
              } catch (error) {}
            }
            send();
            window.addEventListener("load", send);
            setTimeout(send, 100);
            setTimeout(send, 500);
            setTimeout(send, 1500);
          })();
        </script>
      </body>
    </html>
  `;

  return HtmlService
    .createHtmlOutput(script)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function escapeHtml_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
