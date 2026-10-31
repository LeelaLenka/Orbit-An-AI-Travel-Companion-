import { Component, type ReactNode } from 'react';

/** If any part of the page crashes, show a way back instead of a blank screen */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[orbit] screen crashed:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="crash">
        <div className="panel crash__card">
          <h1>Something went wrong on this screen</h1>
          <p className="muted">Your trips and saved places are safe. Reload to carry on.</p>
          <pre className="crash__detail">{this.state.error.message}</pre>
          <div className="row">
            <button className="btn btn--primary" onClick={() => location.reload()}>Reload</button>
            <a className="btn btn--ghost" href="/">Go to Explore</a>
          </div>
        </div>
      </main>
    );
  }
}
