import { useSessionParser } from './hooks/useSessionParser';
import { SessionInput } from './components/SessionInput';
import { SessionCard } from './components/SessionCard';
import { TotalsSummary } from './components/TotalsSummary';
import './App.css';

const App = () => {
  const { sessions, addSession, removeSession, clearAll, totals } = useSessionParser();

  return (
    <div className="app">
      <header className="app__header">
        <h1>Claude Code Session Stats</h1>
        <p>Paste one or more Claude Code session summaries to calculate usage and cost.</p>
      </header>

      <main className="app__main">
        <SessionInput onAdd={addSession} />

        {sessions.length > 0 && (
          <>
            <TotalsSummary
              totalCost={totals.totalCost}
              linesAdded={totals.linesAdded}
              linesRemoved={totals.linesRemoved}
              sessionCount={sessions.length}
            />

            <div className="sessions-list">
              <div className="sessions-list__header">
                <h2>Sessions</h2>
                <button onClick={clearAll}>Clear All</button>
              </div>
              {sessions.map((session, i) => (
                <SessionCard key={i} session={session} index={i} onRemove={removeSession} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
