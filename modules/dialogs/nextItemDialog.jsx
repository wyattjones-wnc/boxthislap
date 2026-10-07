import { TimePicker } from "../../src/components/TimePicker/TimePicker.tsx";
import { FloatingField } from "../../src/components/FloatingField/FloatingField.tsx";
import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
// JSX references are not visible to the lightweight tooling lint rule.
// eslint-disable-next-line no-unused-vars
import { FormDialog } from "./formDialog.jsx";

export function createNextItemDialog({ mount, onClose, onSubmit }) {
  const root = createRoot(mount);
  let currentProps = { open: false };
  let openKey = 0;

  function render(nextProps = {}) {
    currentProps = { ...currentProps, ...nextProps };
    root.render(
      React.createElement(NextItemDialog, {
        ...currentProps,
        key: openKey,
        onClose,
        onSubmit,
      }),
    );
  }

  return {
    close() {
      const dialog = mount.querySelector("dialog[open]");
      if (dialog) dialog.close();
      render({ open: false });
    },
    open(props) {
      openKey += 1;
      render({ ...props, open: true });
    },
    update(props) {
      render(props);
    },
  };
}

function NextItemDialog({
  initialValues = {},
  message = "",
  messageIsError = false,
  onClose,
  onSubmit,
  open,
  saving = false,
  title = "Add Next Item",
}) {
  const thingRef = useRef(null);
  const [values, setValues] = useState(() => normalizeValues(initialValues));

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  return (
    <FormDialog
      className="next-react-dialog"
      closeLabel="Close Next item dialog"
      initialFocusRef={thingRef}
      message={message}
      messageIsError={messageIsError}
      onClose={onClose}
      onSubmit={() => onSubmit(values)}
      open={open}
      saving={saving}
      title={title}
      titleId="next-react-dialog-title"
    >
      <div className="next-item-fields">
        <FloatingField className="next-item-wide">
          <input
            autoComplete="off"
            onChange={(event) => update("thing", event.target.value)}
            ref={thingRef}
            placeholder=" "
            required
            type="text"
            value={values.thing}
          />
          <span>Thing</span>
        </FloatingField>
        <FloatingField className="next-item-wide">
          <input
            autoComplete="url"
            inputMode="url"
            onChange={(event) => update("imageUrl", event.target.value)}
            placeholder=" "
            type="url"
            value={values.imageUrl}
          />
          <span>Image URL</span>
        </FloatingField>
        <FloatingField>
          <span>Date</span>
          <input
            onChange={(event) => update("date", event.target.value)}
            required
            type="date"
            value={values.date}
          />
        </FloatingField>
        <FloatingField>
          <span>End Date</span>
          <input
            onChange={(event) => update("endDate", event.target.value)}
            type="date"
            value={values.endDate}
          />
        </FloatingField>
        <TimePicker
          value={values.time}
          onChange={(time) => update("time", time)}
        />
        <FloatingField>
          <span>Priority</span>
          <input
            max="10"
            min="0"
            onChange={(event) => update("priority", event.target.value)}
            step="1"
            type="number"
            value={values.priority}
          />
        </FloatingField>
        <div className="next-dialog-checks">
          <label className="next-checkbox-control next-dialog-checkbox toggle-control">
            <input
              checked={values.completed}
              onChange={(event) => update("completed", event.target.checked)}
              role="switch"
              type="checkbox"
            />
            <span className="toggle-label">
              <span>Completed</span>
            </span>
          </label>
          <label className="next-checkbox-control next-dialog-checkbox toggle-control">
            <input
              checked={values.nonAdmin}
              onChange={(event) => update("nonAdmin", event.target.checked)}
              role="switch"
              type="checkbox"
            />
            <span className="toggle-label">
              <span>Show to non-admin</span>
            </span>
          </label>
        </div>
      </div>
    </FormDialog>
  );
}

function normalizeValues(values) {
  return {
    completed: Boolean(values.completed),
    date: String(values.date || ""),
    endDate: String(values.endDate || ""),
    id: String(values.id || ""),
    imageUrl: String(values.imageUrl || ""),
    nonAdmin: Boolean(values.nonAdmin),
    priority: String(values.priority ?? 5),
    thing: String(values.thing || ""),
    time: String(values.time || ""),
  };
}
