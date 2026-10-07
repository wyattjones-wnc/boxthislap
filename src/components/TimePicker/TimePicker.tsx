import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import styles from "./TimePicker.module.css";

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTES = ["00", "15", "30", "45"];
const PERIODS = ["AM", "PM"];
const ROW_HEIGHT = 44;

type TimeParts = { hour: string; minute: string; period: string };

function parts(value: string): TimeParts {
  const [hour, minute] = value.split(":");
  const hours = Number(hour || 0);
  return {
    hour: String(hours % 12 || 12),
    minute: minute || "00",
    period: hours >= 12 ? "PM" : "AM",
  };
}

function timeValue({ hour, minute, period }: TimeParts) {
  const hours = (Number(hour) % 12) + (period === "PM" ? 12 : 0);
  return `${String(hours).padStart(2, "0")}:${minute}`;
}

/** A controlled, optional clock time in HH:mm, with three independent wheels. */
export function TimePicker({
  value,
  onChange,
  label = "Time",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parts(value));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const selection = parts(value);

  function close() {
    panelRef.current?.hidePopover?.();
    setOpen(false);
    triggerRef.current?.focus();
  }

  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    if (!panel || !trigger) return;
    panel.showPopover?.();
    const place = (event?: Event) => {
      if (event?.target instanceof Node && panel.contains(event.target)) return;
      const anchor = trigger.getBoundingClientRect();
      const popup = panel.getBoundingClientRect();
      const below = anchor.bottom + 6;
      setPosition({
        left: Math.max(
          8,
          Math.min(anchor.left, window.innerWidth - popup.width - 8),
        ),
        top: Math.max(
          8,
          below + popup.height <= window.innerHeight - 8
            ? below
            : anchor.top - popup.height - 6,
        ),
      });
    };
    const dismissed = () => {
      if (!panel.matches(":popover-open")) setOpen(false);
    };
    place();
    panel.addEventListener("toggle", dismissed);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      panel.removeEventListener("toggle", dismissed);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  return (
    <div
      className={styles.picker}
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      <button
        className={styles.trigger}
        type="button"
        disabled={disabled}
        aria-label={`${label}: ${value ? `${selection.hour}:${selection.minute} ${selection.period}` : "No time"}`}
        aria-expanded={open}
        ref={triggerRef}
        onClick={() => {
          if (open) close();
          else {
            setDraft(parts(value));
            setOpen(true);
          }
        }}
      >
        <span className={styles.label}>{label}</span>
        <span>
          {value
            ? `${selection.hour}:${selection.minute} ${selection.period}`
            : "No time"}
        </span>
      </button>
      {open ? (
        <div
          className={styles.panel}
          role="group"
          ref={panelRef}
          popover="auto"
          style={position}
          aria-label={`Choose ${label.toLowerCase()}`}
        >
          <div className={styles.wheels}>
            <TimeWheel
              label="Hour"
              options={HOURS}
              value={draft.hour}
              change={(hour) => setDraft((current) => ({ ...current, hour }))}
            />
            <TimeWheel
              label="Minute"
              options={MINUTES}
              value={draft.minute}
              change={(minute) =>
                setDraft((current) => ({ ...current, minute }))
              }
            />
            <TimeWheel
              label="AM/PM"
              options={PERIODS}
              value={draft.period}
              change={(period) =>
                setDraft((current) => ({ ...current, period }))
              }
            />
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => {
                onChange("");
                close();
              }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                // Read the visible rows so an immediately confirmed scroll
                // cannot lose the final position to the debounce timer.
                const wheels =
                  panelRef.current?.querySelectorAll<HTMLElement>(
                    '[role="listbox"]',
                  );
                const row = (
                  index: number,
                  options: string[],
                  fallback: string,
                ) => {
                  const wheel = wheels?.[index];
                  return wheel
                    ? options[
                        Math.max(
                          0,
                          Math.min(
                            options.length - 1,
                            Math.round(wheel.scrollTop / ROW_HEIGHT),
                          ),
                        )
                      ]
                    : fallback;
                };
                onChange(
                  timeValue({
                    hour: row(0, HOURS, draft.hour),
                    minute: row(1, MINUTES, draft.minute),
                    period: row(2, PERIODS, draft.period),
                  }),
                );
                close();
              }}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TimeWheel({
  label,
  options,
  value,
  change,
}: {
  label: string;
  options: string[];
  value: string;
  change: (value: string) => void;
}) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const optionId = useId();
  const selected = Math.max(0, options.indexOf(value));
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    const wheel = wheelRef.current;
    if (wheel && Math.abs(wheel.scrollTop - selected * ROW_HEIGHT) > 1)
      wheel.scrollTop = selected * ROW_HEIGHT;
  }, [selected]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    const offsets: Record<string, number> = {
      ArrowDown: 1,
      ArrowUp: -1,
      PageDown: 3,
      PageUp: -3,
    };
    const index =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? options.length - 1
          : selected + (offsets[event.key] || 0);
    if (!(event.key in offsets) && event.key !== "Home" && event.key !== "End")
      return;
    event.preventDefault();
    change(options[Math.max(0, Math.min(options.length - 1, index))]);
  }

  return (
    <div className={styles.column}>
      <div className={styles.wheelFrame}>
        <div
          className={styles.wheel}
          role="listbox"
          aria-label={label}
          aria-activedescendant={`${optionId}-${selected}`}
          tabIndex={0}
          ref={wheelRef}
          onKeyDown={keyboard}
          onScroll={() => {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
              const wheel = wheelRef.current;
              if (!wheel) return;
              const index = Math.max(
                0,
                Math.min(
                  options.length - 1,
                  Math.round(wheel.scrollTop / ROW_HEIGHT),
                ),
              );
              change(options[index]);
            }, 100);
          }}
        >
          {options.map((option, index) => (
            <button
              className={styles.option}
              role="option"
              aria-selected={index === selected}
              key={option}
              id={`${optionId}-${index}`}
              type="button"
              tabIndex={-1}
              onClick={() => change(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
