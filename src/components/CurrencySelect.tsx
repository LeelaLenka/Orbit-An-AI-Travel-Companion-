import { CURRENCIES, useSession } from '../lib/session';

/** Currency for amounts on this screen; also remembered as your default when you're logged in */
export function CurrencySelect({ label = 'Currency' }: { label?: string }) {
  const { currency, setCurrency } = useSession();
  const list = CURRENCIES.includes(currency) ? CURRENCIES : [currency, ...CURRENCIES];
  return (
    <label className="field currency-field">
      {label}
      <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
        {list.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </label>
  );
}
