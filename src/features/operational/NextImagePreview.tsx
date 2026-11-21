import { useLayoutEffect, useRef, useState } from "react";
import { NextCard, type NextItemView } from "./NextCard";

export function NextImagePreview({ item }: { item: NextItemView }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ width: 0, height: 0, scale: 1 });

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    const list =
      document.querySelector("#next-list .next-list") ||
      document.querySelector("#next-list");
    if (!frame || !canvas || !list) return;
    const measure = () => {
      // Keep the page's layout width so wrapping, padding, and image aspect
      // ratio match. Scale the entire card only after its layout is computed.
      const style = getComputedStyle(list);
      const width =
        list.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight) || frame.clientWidth;
      const scale = Math.min(1, frame.clientWidth / width);
      setLayout((current) => {
        const height = canvas.offsetHeight * scale;
        return current.width === width &&
          current.height === height &&
          current.scale === scale
          ? current
          : { width, height, scale };
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    observer.observe(frame);
    observer.observe(canvas);
    measure();
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      className="next-image-position-preview"
      style={{ height: layout.height || undefined }}
    >
      <div
        ref={canvasRef}
        className="next-image-position-canvas"
        style={{
          width: layout.width || "100%",
          transform: `scale(${layout.scale})`,
        }}
      >
        <NextCard
          item={item}
          view={{ editMode: false, activeItemId: "" }}
          preview
        />
      </div>
    </div>
  );
}
