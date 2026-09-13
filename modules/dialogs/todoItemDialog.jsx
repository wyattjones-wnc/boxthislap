import React, { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
// JSX references are not visible to the lightweight tooling lint rule.
// eslint-disable-next-line no-unused-vars
import { FormDialog } from "./formDialog.jsx";

export function createTodoItemDialog({ mount, onClose, onSubmit }) {
  const root = createRoot(mount);
  let currentProps = { open: false };
  let openKey = 0;

  function render(nextProps = {}) {
    currentProps = { ...currentProps, ...nextProps };
    root.render(
      React.createElement(TodoItemDialog, {
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

function TodoItemDialog({
  initialValues = {},
  message = "",
  messageIsError = false,
  onClose,
  onSubmit,
  open,
  parentOptions = [],
  saving = false,
  title = "Add To Do Item",
}) {
  const nameRef = useRef(null);
  const [values, setValues] = useState(() => normalizeValues(initialValues));
  const [showParentOptions, setShowParentOptions] = useState(false);
  const visibleParentOptions = useMemo(() => {
    const query = normalize(values.parentLabel);
    return parentOptions
      .filter((option) => !query || normalize(option.label).includes(query))
      .slice(0, 8);
  }, [parentOptions, values.parentLabel]);

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function updateParentLabel(value) {
    setValues((current) => ({
      ...current,
      parentId:
        normalize(current.parentLabel) === normalize(value)
          ? current.parentId
          : "",
      parentLabel: value,
    }));
    setShowParentOptions(true);
  }

  function selectParent(option) {
    setValues((current) => ({
      ...current,
      parentId: option.id,
      parentLabel: option.label,
    }));
    setShowParentOptions(false);
  }

  return (
    <FormDialog
      className="todo-react-dialog"
      closeLabel="Close To Do item dialog"
      initialFocusRef={nameRef}
      message={message}
      messageIsError={messageIsError}
      onClose={onClose}
      onSubmit={() => onSubmit(values)}
      open={open}
      saving={saving}
      title={title}
      titleId="todo-react-dialog-title"
    >
      <div className="next-item-fields">
        <label className="next-item-wide">
          <span>Name</span>
          <input
            autoComplete="off"
            onChange={(event) => update("name", event.target.value)}
            ref={nameRef}
            required
            type="text"
            value={values.name}
          />
        </label>
        <label>
          <span>Order</span>
          <input
            max={values.maxOrder}
            min="1"
            onChange={(event) => update("order", event.target.value)}
            step="1"
            type="number"
            value={values.order}
          />
        </label>
        <label>
          <span>Low Hour</span>
          <input
            min="0"
            onChange={(event) => update("lowHour", event.target.value)}
            step="0.25"
            type="number"
            value={values.lowHour}
          />
        </label>
        <label>
          <span>High Hour</span>
          <input
            min="0"
            onChange={(event) => update("highHour", event.target.value)}
            step="0.25"
            type="number"
            value={values.highHour}
          />
        </label>
        <label className="next-item-wide autocomplete-field">
          <span>Parent</span>
          <input
            aria-autocomplete="list"
            aria-controls="todo-parent-options"
            aria-expanded={showParentOptions}
            autoComplete="off"
            onBlur={() => window.setTimeout(() => setShowParentOptions(false))}
            onChange={(event) => updateParentLabel(event.target.value)}
            onFocus={() => setShowParentOptions(true)}
            role="combobox"
            type="text"
            value={values.parentLabel}
          />
          {showParentOptions ? (
            <div
              className="autocomplete-dropdown is-open"
              id="todo-parent-options"
              role="listbox"
            >
              {visibleParentOptions.length ? (
                visibleParentOptions.map((option) => (
                  <button
                    className="autocomplete-option"
                    key={option.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      selectParent(option);
                    }}
                    role="option"
                    type="button"
                  >
                    <span>{option.label}</span>
                    {option.meta ? <small>{option.meta}</small> : null}
                  </button>
                ))
              ) : (
                <p className="table-message">No To Do matches</p>
              )}
            </div>
          ) : null}
        </label>
        <label className="next-item-wide">
          <span>Image URL</span>
          <input
            autoComplete="url"
            inputMode="url"
            onChange={(event) => update("imageUrl", event.target.value)}
            type="url"
            value={values.imageUrl}
          />
        </label>
        <div className="next-dialog-checks">
          {[
            ["started", "Started"],
            ["archived", "Archived"],
            ["platinumCleanup", "Platinum Cleanup"],
            ["completed", "Completed"],
            ["unpurchased", "Unpurchased"],
          ].map(([name, label]) => (
            <label
              className="next-checkbox-control next-dialog-checkbox"
              key={name}
            >
              <input
                checked={values[name]}
                onChange={(event) => update(name, event.target.checked)}
                type="checkbox"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>
    </FormDialog>
  );
}

function normalizeValues(values) {
  return {
    archived: Boolean(values.archived),
    completed: Boolean(values.completed),
    highHour: String(values.highHour || ""),
    id: String(values.id || ""),
    imageUrl: String(values.imageUrl || ""),
    lowHour: String(values.lowHour || ""),
    maxOrder: String(values.maxOrder || 1),
    name: String(values.name || ""),
    order: String(values.order || 1),
    parentId: String(values.parentId || ""),
    parentLabel: String(values.parentLabel || ""),
    platinumCleanup: Boolean(values.platinumCleanup),
    started: Boolean(values.started),
    unpurchased: Boolean(values.unpurchased),
  };
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase();
}
