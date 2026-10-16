import { FloatingField } from "../../components/FloatingField/FloatingField";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  defaultLeagueYear,
  leagueDestination,
  leaguesByYear,
} from "./leagueYears";

// Keep manual navigation within this visit; a fresh page load resolves the year again.
let selectedYear: number | undefined;

export function LeaguesPage() {
  const years = Object.keys(leaguesByYear)
    .map(Number)
    .sort((a, b) => b - a);
  const [year, setYear] = useState(
    () => selectedYear ?? defaultLeagueYear(years),
  );
  const current = new Date().getUTCFullYear();
  const choices = years.includes(year)
    ? years
    : [year, ...years].sort((a, b) => b - a);
  return (
    <>
      <div className="section-heading page-heading-with-action">
        <h1>Leagues</h1>
        <FloatingField className="select-control">
          <span>Year</span>
          <select
            id="league-year-select"
            value={year}
            onChange={(event) => {
              selectedYear = Number(event.target.value);
              setYear(selectedYear);
            }}
          >
            {choices.map((choice) => (
              <option value={choice} key={choice}>
                {choice}
                {choice > current ? " (Upcoming)" : ""}
              </option>
            ))}
          </select>
        </FloatingField>
      </div>
      <div className="league-list" id="league-list">
        {(leaguesByYear[year] || []).map((league) => {
          const route = leagueDestination(league, year);
          return (
            <article
              className={`league-card${league === "World Cup" && year === 2026 ? " is-current" : ""}`}
              key={league}
            >
              <div>
                <h2>{league}</h2>
              </div>
              {route ? (
                <a
                  className="league-card-link league-card-open-button"
                  href={`#${route}`}
                  data-page-link={route}
                  aria-label={`Open ${year} ${league}`}
                  title={`Open ${year} ${league}`}
                >
                  <ArrowRight aria-hidden="true" />
                </a>
              ) : (
                <button className="league-card-link" disabled type="button">
                  Planned
                </button>
              )}
            </article>
          );
        })}
        {!leaguesByYear[year]?.length && (
          <p className="league-empty">No leagues found for {year}.</p>
        )}
      </div>
    </>
  );
}
