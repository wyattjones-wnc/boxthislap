import { useState, type ReactNode } from "react";
import { useAppState } from "../../app/providers";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import {
  useDrafts,
  useDraftAction,
} from "../competition/LeagueDrafts/LeagueDraftFeature";
import {
  draftEndpoint,
  draftLink,
  managerName,
} from "../competition/LeagueDrafts/api";
import {
  eligibleMovies,
  movieRanks,
  tmdbMovieId,
} from "../competition/LeagueDrafts/movieDraftList";
import type { Draft, DraftOption } from "../competition/LeagueDrafts/types";
import { ContainedDialog } from "../../components/ContainedDialog/ContainedDialog";
import { FloatingField } from "../../components/FloatingField/FloatingField";
import styles from "../competition/LeagueDrafts/LeagueDrafts.module.css";
interface CardsProps {
  items: DraftListItemView[];
  sheetId: string;
  draggingId: string;
  renderHandle: (item: DraftListItemView) => ReactNode;
}
interface MovieCardData {
  option?: DraftOption;
  rank?: number;
  status: string;
  canPick: boolean;
  choose: () => void;
}
export default function DraftListCards(props: CardsProps) {
  const { route } = useAppState();
  if (route.split("?")[0] !== "draft-list") return null;
  return props.sheetId === "fantasy-office" && draftEndpoint() ? (
    <LinkedCards {...props} />
  ) : (
    <Cards {...props} />
  );
}
function Cards(props: CardsProps & { movies?: Map<string, MovieCardData> }) {
  return (
    <>
      {props.items.map((item, index) => (
        <DraftListCard
          key={item.id}
          item={item}
          rank={index + 1}
          dragging={props.draggingId === item.id}
          handle={props.renderHandle(item)}
          movie={props.movies?.get(item.id)}
        />
      ))}
    </>
  );
}
function LinkedCards(props: CardsProps) {
  const query = useDrafts("fantasy-office");
  const [chosenId, setChosenId] = useState("");
  const [selected, setSelected] = useState<{
    draftId: string;
    optionId: string;
    requestId: string;
  } | null>(null);
  const drafts = (query.data?.drafts || []).filter(
    (d) => d.year === 2027 && !["setup", "cancelled"].includes(d.status),
  );
  const participating = drafts.filter((d) =>
    d.participants.some((p) => p.id === query.managerId),
  );
  const draft =
    drafts.find((d) => d.id === chosenId) ||
    participating.find((d) => ["active", "paused"].includes(d.status)) ||
    drafts[0];
  const available = draft ? eligibleMovies(draft) : [];
  const ranks = movieRanks(available);
  const movies = new Map<string, MovieCardData>();
  if (draft)
    for (const item of props.items) {
      const id = tmdbMovieId(item.dataUrl);
      if (!id) continue;
      const option = draft.options.find((o) => o.tmdbId === id);
      const pick = draft.picks.find(
        (p) => p.tmdbId === id || (option && p.optionId === option.id),
      );
      const eligible = option && available.some((o) => o.id === option.id);
      const myTurn =
        draft.status === "active" &&
        draft.schedule[draft.picks.length]?.managerId === query.managerId;
      const status = pick
        ? `Taken by ${managerName(draft, pick.managerId)}`
        : !eligible
          ? "Outside the current resource"
          : draft.status === "paused"
            ? "Draft paused"
            : draft.status === "completed"
              ? "Draft completed"
              : myTurn
                ? "Your turn"
                : "Waiting for your turn";
      movies.set(item.id, {
        option,
        rank: option ? ranks.get(option.id) : undefined,
        status,
        canPick: Boolean(
          eligible &&
          myTurn &&
          !pick &&
          !item.archived &&
          !item.unavailable &&
          !item.drafted,
        ),
        choose: () => {
          if (option)
            setSelected({
              draftId: draft.id,
              optionId: option.id,
              requestId: crypto.randomUUID(),
            });
        },
      });
    }
  const selectedDraft = drafts.find((d) => d.id === selected?.draftId);
  const selectedOption = selectedDraft?.options.find(
    (o) => o.id === selected?.optionId,
  );
  return (
    <>
      <div className={styles.savedListTools}>
        {drafts.length > 1 ? (
          <FloatingField>
            <span>2027 draft</span>
            <select
              value={draft?.id || ""}
              onChange={(event) => setChosenId(event.target.value)}
            >
              {drafts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </FloatingField>
        ) : (
          draft && <span>2027 · {draft.name}</span>
        )}
        <a
          href={
            draft
              ? `${draftLink(draft, "active")}&view=resource`
              : "#fantasy-office-2027-draft"
          }
        >
          Browse movies
        </a>
      </div>
      {query.error && (
        <p role="alert">
          Live draft availability could not be loaded. Your saved list is still
          available.
        </p>
      )}
      <Cards {...props} movies={movies} />
      {selected && selectedDraft && selectedOption && (
        <SavedPick
          draft={selectedDraft}
          option={selectedOption}
          managerId={query.managerId}
          requestId={selected.requestId}
          close={() => setSelected(null)}
        />
      )}
    </>
  );
}
function SavedPick({
  draft,
  option,
  managerId,
  requestId,
  close,
}: {
  draft: Draft;
  option: DraftOption;
  managerId: string;
  requestId: string;
  close: () => void;
}) {
  const mutation = useDraftAction(draft);
  const taken = draft.picks.some(
    (p) => p.optionId === option.id || p.tmdbId === option.tmdbId,
  );
  const canPick =
    draft.status === "active" &&
    draft.schedule[draft.picks.length]?.managerId === managerId &&
    !taken &&
    eligibleMovies(draft).some((o) => o.id === option.id);
  return (
    <ContainedDialog
      title="Confirm your selection"
      description={`${option.name} · pick #${draft.picks.length + 1}`}
      close={() => {
        if (!mutation.isPending) close();
      }}
      footer={
        <div className={styles.actions}>
          <button
            type="button"
            disabled={!canPick || mutation.isPending}
            onClick={() =>
              mutation.mutate(
                { action: "picks", body: { optionId: option.id, requestId } },
                { onSuccess: close },
              )
            }
          >
            {mutation.isPending ? "Saving…" : "Confirm pick"}
          </button>
          <button type="button" disabled={mutation.isPending} onClick={close}>
            Cancel
          </button>
        </div>
      }
    >
      <p>{option.releaseDate || "North America release: TBA"}</p>
      {!canPick && (
        <p role="alert">
          This movie is no longer available to draft on your turn.
        </p>
      )}
      {mutation.error && <p role="alert">{mutation.error.message}</p>}
    </ContainedDialog>
  );
}
export interface DraftListItemView {
  archived: boolean;
  dataUrl: string;
  drafted: boolean;
  id: string;
  imageUrl: string;
  name: string;
  rank: number;
  releaseLabel: string;
  sheetId: string;
  unavailable: boolean;
}

function DraftListCard({
  dragging,
  item,
  rank,
  handle,
  movie,
}: {
  dragging: boolean;
  item: DraftListItemView;
  rank: number;
  handle: ReactNode;
  movie?: MovieCardData;
}) {
  const [showImage, setShowImage] = useState(Boolean(item.imageUrl));
  const flags = [
    item.archived && "Archived",
    item.drafted && "Drafted",
    item.unavailable && "Unavailable",
  ].filter(Boolean) as string[];
  return (
    <article
      className={`draft-list-item${showImage ? " has-image" : ""}${dragging ? " is-dragging" : ""}`}
      data-draft-list-item-id={item.id}
      data-draft-list-sheet-id={item.sheetId}
      data-sortable-id={item.id}
      data-sortable-kind="draft-list"
    >
      {showImage ? (
        <div className="draft-list-item-image">
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            data-draft-list-image
            onError={() => setShowImage(false)}
          />
        </div>
      ) : null}
      <span className="draft-list-rank">{rank}</span>
      <div className="draft-list-item-main">
        <h2>{movie?.option?.name || item.name}</h2>
        <p className="draft-list-item-date">
          {movie?.option
            ? movie.option.releaseDate
              ? new Date(
                  `${movie.option.releaseDate}T00:00:00Z`,
                ).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })
              : "North America: TBA"
            : item.releaseLabel}
        </p>
        {movie && (
          <p className="draft-list-item-date">
            {movie.rank ? `Movie rank #${movie.rank} · ` : ""}
            {movie.status}
          </p>
        )}
        {flags.length ? (
          <div className="draft-list-item-flags">
            {flags.map((flag) => (
              <span key={flag}>{flag}</span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="draft-list-item-actions">
        {movie && (
          <button
            type="button"
            className="icon-action-button draft-list-item-action"
            aria-label={`Draft ${item.name}`}
            title={movie.canPick ? `Draft ${item.name}` : movie.status}
            disabled={!movie.canPick}
            onClick={movie.choose}
          >
            <Plus aria-hidden="true" />
          </button>
        )}
        {item.dataUrl ? (
          <a
            className="icon-action-button draft-list-item-action"
            href={item.dataUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open data page for ${item.name}`}
            title="Open data page"
          >
            <ExternalLink aria-hidden="true" />
          </a>
        ) : null}
        <button
          className="icon-action-button draft-list-item-action"
          type="button"
          data-draft-list-edit={item.id}
          aria-label={`Edit ${item.name}`}
          title="Edit item"
        >
          <Pencil aria-hidden="true" />
        </button>
      </div>
      {handle}
    </article>
  );
}
