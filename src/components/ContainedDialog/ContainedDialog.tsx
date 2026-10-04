import { X } from "lucide-react";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { openContainedDialog } from "../../../modules/dialogs/containDialog.js";
import styles from "./ContainedDialog.module.css";

export function ContainedDialog({
  bodyClassName = "",
  children,
  close,
  description,
  footer,
  title,
}: {
  bodyClassName?: string;
  children: ReactNode;
  close: () => void;
  description?: ReactNode;
  footer?: ReactNode;
  title: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const scrollArea = scrollRef.current;
    if (!dialog || !scrollArea) return;
    return openContainedDialog({
      dialog,
      initialFocus: closeRef.current,
      scrollArea,
    });
  }, []);

  return (
    <dialog
      aria-label={title}
      className={styles.dialog}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      ref={dialogRef}
    >
      <section className={styles.panel}>
        <header>
          <div className={styles.heading}>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button
            aria-label={`Close ${title}`}
            className={`icon-action-button dialog-close ${styles.close}`}
            onClick={close}
            ref={closeRef}
            title={`Close ${title}`}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <div
          className={`${styles.scroll} ${bodyClassName}`.trim()}
          ref={scrollRef}
        >
          {children}
        </div>
        {footer ? <footer>{footer}</footer> : null}
      </section>
    </dialog>
  );
}
