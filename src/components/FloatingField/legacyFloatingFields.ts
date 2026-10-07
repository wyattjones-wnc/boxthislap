const controls =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="hidden"]):not([type="file"]):not([type="color"]):not([type="button"]):not([type="submit"]):not([type="reset"]), select, textarea';

/** Legacy HTML renderers use the same field markup/styles as FloatingField.
 * React fields already carry data-floating-field and are never reparented. */
export function enhanceLegacyFloatingFields(root: ParentNode) {
  const fields = [
    ...(root instanceof Element && root.matches(controls) ? [root] : []),
    ...root.querySelectorAll(controls),
  ];
  for (const element of fields) {
    const control = element as
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (control.closest("[data-floating-field]")) continue;
    let label =
      control.parentElement?.tagName === "LABEL"
        ? (control.parentElement as HTMLLabelElement)
        : null;
    const caption = label?.querySelector(":scope > span");
    const captionText =
      caption?.textContent?.trim() ||
      control.getAttribute("aria-label") ||
      control.getAttribute("placeholder") ||
      control.getAttribute("title") ||
      control.name ||
      control.id ||
      "Value";
    if (!label) {
      label = document.createElement("label");
      control.before(label);
      label.append(control);
    }
    label.classList.add("floating-field");
    label.setAttribute("data-floating-field", "");
    control.setAttribute("data-floating-control", "");
    if (control.tagName !== "SELECT" && !control.getAttribute("placeholder"))
      control.setAttribute("placeholder", " ");
    const floatingLabel = caption || document.createElement("span");
    floatingLabel.classList.remove("sr-only");
    floatingLabel.classList.add("floating-label");
    if (!caption) {
      floatingLabel.textContent = captionText;
      label.prepend(floatingLabel);
    }
  }
}

export function observeLegacyFloatingFields(root: HTMLElement) {
  enhanceLegacyFloatingFields(root);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element && node.isConnected)
          enhanceLegacyFloatingFields(node);
      }
    }
  });
  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}
