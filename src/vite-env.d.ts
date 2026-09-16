/// <reference types="vite/client" />

interface Window {
  BOX_THIS_LAP_RELEASE?: string;
  BOX_THIS_LAP_VERSION?: string;
  boxThisLapHardRefresh?: () => void;
  boxThisLapMarkReady?: () => void;
}
