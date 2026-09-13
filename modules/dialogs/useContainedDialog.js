import { useLayoutEffect } from "react";
import { openContainedDialog } from "./containDialog.js";

export function useContainedDialog({
  dialogRef,
  initialFocusRef,
  open,
  scrollRef,
}) {
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const scrollArea = scrollRef.current;
    if (!open || !dialog) {
      if (dialog?.open) dialog.close();
      return undefined;
    }

    return openContainedDialog({
      dialog,
      initialFocus: initialFocusRef.current,
      scrollArea,
    });
  }, [dialogRef, initialFocusRef, open, scrollRef]);
}
