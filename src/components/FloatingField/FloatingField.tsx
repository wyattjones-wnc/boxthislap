import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";

type ControlProps = Pick<
  ComponentProps<"input">,
  "placeholder" | "aria-label" | "name"
> & {
  "data-floating-control"?: string;
};

/** A native label/control pair, with the label floating on focus or a value. */
export function FloatingField({
  children,
  className = "",
  label,
  ...props
}: ComponentProps<"label"> & { label?: ReactNode }) {
  const entries = Children.toArray(children);
  const control = entries.find(
    (child) =>
      isValidElement(child) &&
      ["input", "select", "textarea"].includes(String(child.type)),
  ) as ReactElement<ControlProps> | undefined;
  const existingLabel = entries.find(
    (child) => isValidElement(child) && child.type === "span",
  );
  const originalLabel = isValidElement<ComponentProps<"span">>(existingLabel)
    ? existingLabel
    : undefined;
  const caption =
    label ??
    (originalLabel
      ? originalLabel.props.children
      : control?.props["aria-label"] ||
        control?.props.placeholder ||
        control?.props.name);

  return (
    <label
      {...props}
      className={`${className} floating-field`.trim()}
      data-floating-field
    >
      {originalLabel ? (
        cloneElement(originalLabel, {
          className: [
            ...(originalLabel.props.className || "")
              .split(/\s+/)
              .filter((name) => name && name !== "sr-only"),
            "floating-label",
          ].join(" "),
          children: caption,
        })
      ) : (
        <span className="floating-label">{caption}</span>
      )}
      {entries
        .filter((child) => child !== existingLabel)
        .map((child) => {
          if (child !== control || !control) return child;
          return cloneElement(control, {
            "data-floating-control": "",
            ...(control.type !== "select"
              ? { placeholder: control.props.placeholder || " " }
              : {}),
          });
        })}
    </label>
  );
}
