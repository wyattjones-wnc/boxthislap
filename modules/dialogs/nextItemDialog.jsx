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
        <label className="next-item-wide">
          <span>Thing</span>
          <input
            autoComplete="off"
            onChange={(event) => update("thing", event.target.value)}
            ref={thingRef}
            required
            type="text"
            value={values.thing}
          />
        </label>
        <label className="next-item-wide">
          <span>Image URL</span>
          <input
            autoComplete="url"
            inputMode="url"
            onChange={(event) => update("imageUrl", event.target.value)}
            placeholder="https://example.com/image.jpg"
            type="url"
            value={values.imageUrl}
          />
        </label>
        <label>
          <span>Date</span>
          <input
            onChange={(event) => update("date", event.target.value)}
            required
            type="date"
            value={values.date}
          />
        </label>
        <label>
          <span>End Date</span>
          <input
            onChange={(event) => update("endDate", event.target.value)}
            type="date"
            value={values.endDate}
          />
        </label>
        <label>
          <span>Time</span>
          <select
            onChange={(event) => update("time", event.target.value)}
            value={values.time}
          >
            <option value="">No time</option>
            {timeOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Priority</span>
          <input
            max="10"
            min="0"
            onChange={(event) => update("priority", event.target.value)}
            step="1"
            type="number"
            value={values.priority}
          />
        </label>
        <div className="next-dialog-checks">
          <label className="next-checkbox-control next-dialog-checkbox">
            <input
              checked={values.completed}
              onChange={(event) => update("completed", event.target.checked)}
              type="checkbox"
            />
            <span>Completed</span>
          </label>
          <label className="next-checkbox-control next-dialog-checkbox">
            <input
              checked={values.nonAdmin}
              onChange={(event) => update("nonAdmin", event.target.checked)}
              type="checkbox"
            />
            <span>Show to non-admin</span>
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

function timeOptions() {
  return Array.from({ length: 96 }, (_, index) => {
    const totalMinutes = index * 15;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const period = hour >= 12 ? "PM" : "AM";
    return {
      label: `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${period}`,
      value,
    };
  });
}
