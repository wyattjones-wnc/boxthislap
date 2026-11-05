import { createLucideIcon } from "lucide-react";

// Simplified contiguous-U.S. coastline with Alaska and Hawaii insets.
export const UnitedStatesIcon = createLucideIcon("UnitedStates", [
  [
    "path",
    {
      d: "m2 5 4 1h4l1-1h2l1.5 1.5 1.5-.5 1 1 1.5-.5L19 4l1 1-.5 2 2-.5.5 1.5-2 2-1 2-2 1 .5 2 1 2-.5 1-1-.5-1.5-3-2-.5-1 1h-1l-1 2-1.5-.5L8 15H6.5L6 13.5 4 13l-1.5-3L1.5 7.5 2 5Z",
      strokeWidth: 2,
      key: "mainland",
    },
  ],
  [
    "path",
    {
      d: "m2 19 1-.5 1.5 1 .5 1-1 .5-1-.5-1 .5Z",
      strokeWidth: 2,
      key: "alaska",
    },
  ],
  ["path", { d: "m7 20 .5 .5 m1.5 .5 .5 .5", strokeWidth: 2, key: "hawaii" }],
]);
