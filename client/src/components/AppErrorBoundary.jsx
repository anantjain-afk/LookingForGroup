import { Component } from "react";

export default class AppErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error, info) {
    console.error(
      JSON.stringify({
        event: "client_render_failed",
        name: error.name,
        component: info.componentStack,
      }),
    );
  }
  render() {
    if (this.state.failed)
      return (
        <main className="min-h-screen bg-[#0e0f11] text-gray-200 grid place-items-center p-6">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-2xl font-bold">
              Something interrupted the app
            </h1>
            <p className="text-gray-400">
              Reload to reconnect with your squad.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-emerald-700 rounded-lg px-5 py-3 font-semibold"
            >
              Reload app
            </button>
            <p>
              <a
                href="https://github.com/anantjain-afk/LookingForGroup/issues/new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-emerald-400 underline"
              >
                Report a problem
              </a>
            </p>
          </div>
        </main>
      );
    return this.props.children;
  }
}
