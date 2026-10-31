import { useEffect, useState } from 'react';
import { api, type Place, type Scan, type Usage } from '../lib/api';
import { useSession } from '../lib/session';

/** AI briefing for a destination: costs in your currency, getting there, laws, emergency numbers, food */
export function ScanPanel({ place }: { place: Pick<Place, 'name' | 'admin' | 'country' | 'countryCode'> }) {
  const { money, setUsage, usage, requireLogin } = useSession();
  const [from, setFrom] = useState('');
  const [scan, setScan] = useState<Scan | null>(null);
  const [meta, setMeta] = useState({ cached: false, sample: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setScan(null);
    setError('');
  }, [place.name, place.country]);

  async function run() {
    if (!requireLogin('AI scans are free with an account, so we can keep the service running for everyone.', () => void run())) return;
    setBusy(true);
    setError('');
    try {
      const r = await api<{ scan: Scan; cached: boolean; sample: boolean; usage: Usage }>('ai/scan', {
        method: 'POST',
        body: { name: place.name, admin: place.admin, country: place.country, countryCode: place.countryCode, from },
      });
      setScan(r.scan);
      setMeta({ cached: r.cached, sample: r.sample });
      setUsage(r.usage);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!scan) {
    return (
      <div className="scan-start">
        <p className="muted">Get an AI briefing on {place.name}: typical costs in your currency, how to get there, local laws, emergency numbers and healthy local food.</p>
        <label className="field"><span>Travelling from <span className="muted">(optional)</span></span>
          <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="e.g. Hyderabad" maxLength={80} />
        </label>
        <button className="btn btn--primary" onClick={() => void run()} disabled={busy}>
          {busy ? 'Scanning…' : 'Scan with AI'}
        </button>
        {usage && usage.aiEnabled && <p className="fineprint">{usage.remaining} of {usage.limit} AI requests left today.</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    );
  }

  const b = scan.costBreakdownUSD;
  const total = b.stay + b.food + b.localTransport + b.activities || 1;
  return (
    <div className="scan">
      <div className="tags">
        <span className="tag tag--ai">AI estimate</span>
        {meta.cached && <span className="tag">Saved answer</span>}
        {meta.sample && <span className="tag tag--warn">Sample data</span>}
      </div>
      <p>{scan.summary}</p>
      <p className="muted small"><strong>Best time:</strong> {scan.bestTimeToVisit} · <strong>Local currency:</strong> {scan.localCurrency}</p>

      <h3>Daily cost per person</h3>
      <div className="tiers">
        <div><span>Budget</span><strong>{money(scan.dailyCostUSD.budget)}</strong></div>
        <div className="tiers__mid"><span>Moderate</span><strong>{money(scan.dailyCostUSD.moderate)}</strong></div>
        <div><span>Luxury</span><strong>{money(scan.dailyCostUSD.luxury)}</strong></div>
      </div>
      <ul className="bars" aria-label="A moderate day, broken down">
        {([['Stay', b.stay], ['Food', b.food], ['Local transport', b.localTransport], ['Activities', b.activities]] as const).map(([k, v]) => (
          <li key={k}><span>{k}</span><span className="bars__track"><span style={{ width: `${(v / total) * 100}%` }} /></span><span>{money(v)}</span></li>
        ))}
      </ul>

      {scan.gettingThere.length > 0 && (<>
        <h3>Getting there</h3>
        <ul className="list">
          {scan.gettingThere.map((g) => (
            <li key={g.mode}><strong>{g.mode}</strong> · {g.typicalCostUSD > 0 ? money(g.typicalCostUSD) : 'n/a'} · {g.duration}<br /><span className="muted small">{g.note}</span></li>
          ))}
        </ul>
      </>)}

      <h3>Emergency numbers</h3>
      <dl className="emergency">
        <div><dt>Police</dt><dd>{scan.emergency.police}</dd></div>
        <div><dt>Ambulance</dt><dd>{scan.emergency.ambulance}</dd></div>
        <div><dt>Fire</dt><dd>{scan.emergency.fire}</dd></div>
        {scan.emergency.tourist && <div><dt>Tourist help</dt><dd>{scan.emergency.tourist}</dd></div>}
      </dl>

      {scan.laws.length > 0 && (<><h3>Laws to know</h3><ul className="list">{scan.laws.map((l) => <li key={l}>{l}</li>)}</ul></>)}
      {scan.customs.length > 0 && (<><h3>Local customs</h3><ul className="list">{scan.customs.map((l) => <li key={l}>{l}</li>)}</ul></>)}
      {scan.foods.length > 0 && (<><h3>Healthy local food</h3><ul className="list">{scan.foods.map((f) => <li key={f.name}><strong>{f.name}</strong>: {f.why}</li>)}</ul></>)}
      {scan.safetyTips.length > 0 && (<><h3>Safety</h3><ul className="list">{scan.safetyTips.map((l) => <li key={l}>{l}</li>)}</ul></>)}

      <p className="fineprint">{scan.confidence} Costs are AI estimates converted at today’s exchange rate, not quotes. Always confirm emergency numbers and laws with official sources before travelling.</p>
      <button className="btn btn--ghost" onClick={() => setScan(null)}>Scan again</button>
    </div>
  );
}
