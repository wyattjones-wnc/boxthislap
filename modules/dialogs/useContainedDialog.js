import { useLayoutEffect } from "react";

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

    const scrollY = window.scrollY;
    let lastTouchY = 0;
    const rememberTouch = (event) => {
      lastTouchY = event.touches[0]?.clientY ?? 0;
    };
    const containTouch = (event) => {
      if (!scrollArea?.contains(event.target)) {
        event.preventDefault();
        return;
      }
      const touchY = event.touches[0]?.clientY ?? lastTouchY;
      const movingDown = touchY > lastTouchY;
      const atTop = scrollArea.scrollTop <= 0;
      const atBottom =
        Math.ceil(scrollArea.scrollTop + scrollArea.clientHeight) >=
        scrollArea.scrollHeight;
      if (
        scrollArea.scrollHeight <= scrollArea.clientHeight ||
        (atTop && movingDown) ||
        (atBottom && !movingDown)
      ) {
        event.preventDefault();
      }
      lastTouchY = touchY;
    };
    const containWheel = (event) => {
      if (!scrollArea?.contains(event.target)) {
        event.preventDefault();
        return;
      }
      const atTop = scrollArea.scrollTop <= 0;
      const atBottom =
        Math.ceil(scrollArea.scrollTop + scrollArea.clientHeight) >=
        scrollArea.scrollHeight;
      if (
        scrollArea.scrollHeight <= scrollArea.clientHeight ||
        (atTop && event.deltaY < 0) ||
        (atBottom && event.deltaY > 0)
      ) {
        event.preventDefault();
      }
    };

    document.documentElement.style.setProperty(
      "--contained-dialog-scroll-offset",
      `${-scrollY}px`,
    );
    document.documentElement.classList.add("has-contained-dialog");
    dialog.addEventListener("touchstart", rememberTouch, { passive: true });
    dialog.addEventListener("touchmove", containTouch, { passive: false });
    dialog.addEventListener("wheel", containWheel, { passive: false });
    dialog.showModal();
    window.requestAnimationFrame(() => initialFocusRef.current?.focus());

    return () => {
      dialog.removeEventListener("touchstart", rememberTouch);
      dialog.removeEventListener("touchmove", containTouch);
      dialog.removeEventListener("wheel", containWheel);
      if (dialog.open) dialog.close();
      document.documentElement.classList.remove("has-contained-dialog");
      document.documentElement.style.removeProperty(
        "--contained-dialog-scroll-offset",
      );
      window.scrollTo(0, scrollY);
    };
  }, [dialogRef, initialFocusRef, open, scrollRef]);
}
