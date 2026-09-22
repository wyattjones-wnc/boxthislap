import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("React application shell failed", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <section className="shell-error" role="alert">
          <strong>The site shell could not load.</strong>
          <button
            type="button"
            onClick={() => window.boxThisLapHardRefresh?.()}
          >
            Refresh
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}
