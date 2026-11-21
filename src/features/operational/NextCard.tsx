import { Check as CheckIcon } from "lucide-react";

export interface NextItemView {
  imagePositionX?: number;
  imagePositionY?: number;
  completed: boolean;
  dateLabel: string;
  id: string;
  imageUrl: string;
  isPast: boolean;
  passed: boolean;
  thing: string;
  timeLabel: string;
}

export function NextCard({
  item,
  view,
  preview = false,
}: {
  item: NextItemView;
  view: { editMode: boolean; activeItemId: string };
  preview?: boolean;
}) {
  const expanded = view.editMode && view.activeItemId === item.id;
  const classes = [
    "next-card",
    item.completed && "next-card--completed",
    view.editMode && "next-card--editable",
    expanded && "is-expanded",
    item.isPast && "next-card--past",
    item.imageUrl && "next-card--with-image",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={classes}
      role={view.editMode && item.id ? "button" : undefined}
      tabIndex={view.editMode && item.id ? 0 : undefined}
      aria-expanded={view.editMode && item.id ? expanded : undefined}
      data-next-item-id={view.editMode && item.id ? item.id : undefined}
    >
      {item.imageUrl ? (
        <img
          className="next-card-image"
          src={item.imageUrl}
          alt={preview ? "Image position preview" : ""}
          loading="lazy"
          decoding="async"
          style={{
            objectPosition: `${item.imagePositionX ?? 50}% ${item.imagePositionY ?? 50}%`,
          }}
          data-next-card-image={preview ? undefined : true}
        />
      ) : null}
      <div
        className={`next-card-main${item.completed ? " has-completed-icon" : ""}`}
      >
        {item.completed ? (
          <span
            className="next-completed-icon"
            aria-label="Completed"
            title="Completed"
          >
            <CheckIcon aria-hidden="true" />
          </span>
        ) : null}
        <div>
          {item.passed && !item.completed ? (
            <span
              className="next-passed-status"
              aria-label="Event time has passed"
              title="Event time has passed"
            >
              <CheckIcon aria-hidden="true" />
            </span>
          ) : null}
          <h2>{item.thing}</h2>
          <p className="next-card-date">
            <span>{item.dateLabel}</span>
            {item.timeLabel ? (
              <span className="next-time">{item.timeLabel}</span>
            ) : null}
          </p>
        </div>
      </div>
      {expanded ? (
        <button
          className="action-button next-edit-button"
          type="button"
          data-next-edit={item.id}
        >
          Edit
        </button>
      ) : null}
    </article>
  );
}
