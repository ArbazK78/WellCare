import { Component, ErrorInfo, ReactNode } from "react";
import { ErrorStatePage } from "@/components/ErrorStatePage";

type AppErrorBoundaryProps = { children: ReactNode };
type AppErrorBoundaryState = { hasError: boolean };

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unexpected WellCare UI error", error, info.componentStack);
  }

  private reload = () => window.location.reload();

  render() {
    if (this.state.hasError) {
      return <ErrorStatePage kind="unexpected" onRetry={this.reload} />;
    }
    return this.props.children;
  }
}
