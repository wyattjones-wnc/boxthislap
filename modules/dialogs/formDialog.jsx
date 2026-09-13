import { useRef } from "react";
import { useContainedDialog } from "./useContainedDialog.js";

export function FormDialog({
  children,
  className = "",
  closeLabel,
  initialFocusRef,
  message = "",
  messageIsError = false,
  onClose,
  onSubmit,
  open,
  saving = false,
  submitLabel = "Save",
  title,
  titleId,
}) {
  const dialogRef = useRef(null);
  const scrollRef = useRef(null);

  useContainedDialog({
    dialogRef,
    initialFocusRef,
    open,
    scrollRef,
  });

  return (
    <dialog
      aria-labelledby={titleId}
      className={`react-form-dialog ${className}`.trim()}
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
      ref={dialogRef}
    >
      <form
        className="react-form-dialog-panel"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <header>
          <h2 id={titleId}>{title}</h2>
          <button
            aria-label={closeLabel}
            className="dialog-close"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>
        <div className="react-form-dialog-scroll" ref={scrollRef}>
          {children}
        </div>
        <footer>
          <p
            aria-live="polite"
            className={`footy-note-status${messageIsError ? " is-error" : ""}`}
            role="status"
          >
            {message}
          </p>
          <button disabled={saving} onClick={onClose} type="button">
            Cancel
          </button>
          <button className="action-button" disabled={saving} type="submit">
            {saving ? "Saving…" : submitLabel}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
