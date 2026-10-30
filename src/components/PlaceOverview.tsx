import type { Attraction, PlaceInfo } from '../lib/api';

/** About the place (Wikipedia), practical country facts, and a preview of famous places */
export function PlaceOverview({ info, loading, onShowAll, onPick }: {
  info: PlaceInfo | null; loading: boolean; onShowAll: () => void; onPick: (a: Attraction) => void;
}) {
  if (loading) return <div className="skeleton" style={{ height: 260 }} aria-label="Loading place details" />;
  if (!info) return <p className="muted">Details aren’t available right now.</p>;
  const c = info.country;
  return (
    <div className="overview">
      {info.about ? (
        <section className="about">
          {info.about.image && <img src={info.about.image} alt="" className="about__img" loading="lazy" />}
          <p>{info.about.extract}</p>
          <a href={info.about.url} target="_blank" rel="noreferrer" className="small">Read more on Wikipedia</a>
        </section>
      ) : (
        <p className="muted small">No encyclopedia entry for this exact spot. Famous places nearby and the country facts are below.</p>
      )}

      {info.attractions.length > 0 && (
        <section>
          <div className="row-between"><h3>Famous nearby</h3><button className="linkish" onClick={onShowAll}>See all {info.attractions.length}</button></div>
          <ul className="mini-places">
            {info.attractions.slice(0, 3).map((a) => (
              <li key={a.title}>
                <button onClick={() => onPick(a)}>
                  {a.image ? <img src={a.image} alt="" loading="lazy" /> : <span className="mini-places__ph" aria-hidden="true" />}
                  <span><strong>{a.title}</strong><span className="muted small">{a.distanceKm} km away</span></span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c && (
        <section>
          <h3>{c.flag && <img src={c.flag} alt="" className="flag" />} Travelling in {c.name}</h3>
          <dl className="facts">
            {c.capital && <div><dt>Capital</dt><dd>{c.capital}</dd></div>}
            {c.currencies[0] && <div><dt>Currency</dt><dd>{c.currencies.map((x) => `${x.name} (${x.symbol || x.code})`).join(', ')}</dd></div>}
            {c.languages.length > 0 && <div><dt>Languages</dt><dd>{c.languages.slice(0, 4).join(', ')}</dd></div>}
            {c.callingCode && <div><dt>Calling code</dt><dd>{c.callingCode}</dd></div>}
            {c.drivingSide && <div><dt>Traffic drives on</dt><dd>the {c.drivingSide}</dd></div>}
            {c.timezones[0] && <div><dt>Time zone</dt><dd>{c.timezones.length > 2 ? `${c.timezones.length} zones` : c.timezones.join(', ')}</dd></div>}
          </dl>
        </section>
      )}
      <p className="fineprint">Descriptions: Wikipedia. Country facts: REST Countries.</p>
    </div>
  );
}
