import { useEffect, useState } from 'react';
import { Check, ChevronDown, CircleAlert, Database, GitBranch, X } from 'lucide-react';

type ConnectorId = 'github' | 'vercel' | 'neon';
const selectedConnectorKey = 'git-goat:selected-connector';
const isConnectorId = (value: string | null): value is ConnectorId =>
  value === 'github' || value === 'vercel' || value === 'neon';

type Connector = {
  id: ConnectorId;
  name: string;
  purpose: string;
  status: string;
  detail: string;
  icon: typeof GitBranch;
};

const connectors: Connector[] = [
  {
    id: 'github',
    name: 'GitHub',
    purpose: 'Repository access and pull requests',
    status: 'Setup needed',
    detail: 'Repository authorization and branch/PR permissions are not configured in this app.',
    icon: GitBranch,
  },
  {
    id: 'vercel',
    name: 'Vercel Sandbox',
    purpose: 'Isolated builds and tests',
    status: 'Setup needed',
    detail: 'Sandbox authorization is not configured. Repository code is not run by this selection.',
    icon: CircleAlert,
  },
  {
    id: 'neon',
    name: 'Neon',
    purpose: 'Durable workflow and approval data',
    status: 'Setup needed',
    detail: 'A Neon database connection is not configured in this app.',
    icon: Database,
  },
];

export function ConnectorsControl() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ConnectorId | null>(null);
  const [selectionRestored, setSelectionRestored] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(selectedConnectorKey);
      if (isConnectorId(saved)) setSelected(saved);
    } catch {
      // Storage may be disabled by browser privacy settings. The selector still works in memory.
    } finally {
      setSelectionRestored(true);
    }
  }, []);

  function selectConnector(id: ConnectorId) {
    setSelected(id);
    try {
      window.localStorage.setItem(selectedConnectorKey, id);
    } catch {
      // Keep the selection for this page session when persistent storage is unavailable.
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return <>
    <button className="connectors-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <GitBranch size={14} /> Connectors <ChevronDown size={13} />
    </button>
    {open && <div className="connector-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="connector-dialog" role="dialog" aria-modal="true" aria-labelledby="connectors-title">
        <header className="connector-dialog-head">
          <div><div className="section-kicker">INTEGRATIONS</div><h2 id="connectors-title">Choose a connector</h2></div>
          <button className="connector-close" type="button" aria-label="Close connectors" onClick={() => setOpen(false)}><X size={18} /></button>
        </header>
        <p className="connector-intro">Select a provider to see what it enables. Selection does not sign in, save credentials, or start a connection.</p>
        <div className="connector-list">
          {connectors.map(connector => {
            const Icon = connector.icon;
            const active = selected === connector.id;
            return <button className={`connector-card${active ? ' selected' : ''}`} type="button" key={connector.id} aria-pressed={active} onClick={() => selectConnector(connector.id)}>
              <span className="connector-icon"><Icon size={17} /></span>
              <span className="connector-copy"><strong>{connector.name}</strong><small>{connector.purpose}</small><span className="connector-detail">{connector.detail}</span></span>
              <span className={`connector-state${active ? ' is-selected' : ''}`}><i />{active ? 'SELECTED · NOT CONNECTED' : 'NOT CONNECTED'}<small>{connector.status}</small></span>
              {active && <Check className="connector-selected-check" size={15} aria-label="Selected" />}
            </button>;
          })}
        </div>
        <div className="connector-notice"><CircleAlert size={15} /><span>All three providers currently need setup. No provider resources are created and no account is contacted from this panel.</span></div>
        <footer className="connector-dialog-foot"><span>{!selectionRestored ? 'Loading saved selection…' : selected ? `${connectors.find(connector => connector.id === selected)?.name} selected on this device` : 'No connector selected'}</span><button type="button" onClick={() => setOpen(false)}>DONE</button></footer>
      </section>
    </div>}
  </>;
}
