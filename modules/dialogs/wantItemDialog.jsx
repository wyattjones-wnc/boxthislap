import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
// JSX references are not visible to the lightweight tooling lint rule.
// eslint-disable-next-line no-unused-vars
import { FormDialog } from "./formDialog.jsx";

export function createWantItemDialog({ mount, onClose, onSubmit }) {
  const root = createRoot(mount);
  let currentProps = { open: false };
  let openKey = 0;

  function render(nextProps = {}) {
    currentProps = { ...currentProps, ...nextProps };
    root.render(
      React.createElement(WantItemDialog, {
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

function WantItemDialog({
  initialValues = {},
  message = "",
  messageIsError = false,
  onClose,
  onSubmit,
  open,
  title = "Add Want Item",
}) {
  const nameRef = useRef(null);
  const [values, setValues] = useState(() => normalizeValues(initialValues));

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  return (
    <FormDialog
      className="want-react-dialog"
      closeLabel="Close Want item dialog"
      initialFocusRef={nameRef}
      message={message}
      messageIsError={messageIsError}
      onClose={onClose}
      onSubmit={() => onSubmit(values)}
      open={open}
      title={title}
      titleId="want-react-dialog-title"
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
          <span>Price</span>
          <input
            inputMode="decimal"
            min="0"
            onChange={(event) => update("price", event.target.value)}
            step="0.01"
            type="number"
            value={values.price}
          />
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
            ["archived", "Archived"],
            ["completed", "Completed"],
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
    id: String(values.id || ""),
    imageUrl: String(values.imageUrl || ""),
    maxOrder: String(values.maxOrder || 1),
    name: String(values.name || ""),
    order: String(values.order || 1),
    price: String(values.price ?? ""),
  };
}
