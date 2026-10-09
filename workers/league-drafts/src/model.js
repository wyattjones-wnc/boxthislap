export function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}

function label(value, field, maximum = 160) {
  const text = String(value || "").trim();
  if (!text || text.length > maximum)
    fail(400, `${field} is required (maximum ${maximum} characters).`);
  return text;
}

export function scheduleFor(participants, rounds) {
  return Array.from({ length: rounds }, (_, round) => {
    const order =
      participants.length >= 4 && round % 2 === 1
        ? [...participants].reverse()
        : participants;
    return order.map((manager, position) => ({
      number: round * participants.length + position + 1,
      round: round + 1,
      managerId: manager.id,
    }));
  }).flat();
}

export function configuration(body) {
  if (
    !["fantasy-office", "world-cup"].includes(body.league) ||
    body.year !== 2027
  ) {
    fail(
      400,
      "This draft service supports the 2027 Fantasy Office and World Cup leagues.",
    );
  }
  const participants = (
    Array.isArray(body.participants) ? body.participants : []
  ).map((manager) => ({
    id: label(manager.id, "Manager ID", 64),
    name: label(manager.name, "Manager name", 100),
  }));
  if (
    participants.length < 2 ||
    participants.length > 16 ||
    new Set(participants.map((manager) => manager.id)).size !==
      participants.length
  ) {
    fail(400, "Choose between 2 and 16 different managers in seed order.");
  }
  const rounds = Number(body.rounds);
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 24)
    fail(400, "Choose between 1 and 24 rounds.");
  const options = (Array.isArray(body.options) ? body.options : []).map(
    (option) => ({
      id: label(option.id, "Option ID", 100),
      name: label(option.name, "Option name", 200),
    }),
  );
  if (
    options.length > 500 ||
    new Set(options.map((option) => option.id)).size !== options.length ||
    new Set(options.map((option) => option.name.toLocaleLowerCase("en-US")))
      .size !== options.length
  ) {
    fail(400, "Use at most 500 options with distinct IDs and names.");
  }
  return {
    league: body.league,
    year: 2027,
    name: label(body.name, "Draft name"),
    resourceLabel: label(body.resourceLabel || "Options", "Resource label", 80),
    participants,
    rounds,
    options,
    schedule: scheduleFor(participants, rounds),
  };
}

function audit(state, action, actor, reason = "") {
  state.audit.push({
    revision: state.revision,
    action,
    actor,
    reason,
    at: new Date().toISOString(),
  });
}

function notify(state, type, managerId) {
  const preference = state.preferences[managerId];
  if (!preference?.enabled) return;
  const titles = {
    started: "Draft started",
    turn: "Your turn to draft",
    paused: "Draft paused",
    resumed: "Draft resumed",
    completed: "Draft completed",
    cancelled: "Draft cancelled",
  };
  state.events.push({
    id: crypto.randomUUID(),
    type,
    managerId,
    title: titles[type],
    body:
      type === "turn"
        ? `${state.name}: round ${state.schedule[state.picks.length]?.round}, pick #${state.picks.length + 1}.`
        : state.name,
    turnToken: state.turnToken,
    createdAt: new Date().toISOString(),
    deliveredAt: null,
  });
}

function notifyAll(state, type) {
  for (const managerId of Object.keys(state.preferences))
    notify(state, type, managerId);
}

function nextTurn(state) {
  state.turnToken = crypto.randomUUID();
  if (state.picks.length === state.schedule.length) {
    state.status = "completed";
    notifyAll(state, "completed");
  } else {
    notify(state, "turn", state.schedule[state.picks.length].managerId);
  }
}

export function newDraft(body, actor) {
  const state = {
    ...configuration(body),
    id: crypto.randomUUID(),
    revision: 1,
    status: "setup",
    reason: "",
    picks: [],
    audit: [],
    events: [],
    preferences: {},
    requests: {},
    turnToken: "",
    createdAt: new Date().toISOString(),
  };
  audit(state, "created", actor);
  return state;
}

export function transition(
  original,
  action,
  body,
  actor,
  admin,
  performedBy = actor,
) {
  const isPick = action === "pick";
  if (isPick && original.requests[body.requestId]) {
    const previous = original.requests[body.requestId];
    if (previous.managerId !== actor || previous.optionId !== body.optionId)
      fail(409, "This retry key was used for another selection.");
    return original;
  }
  if (Number(body.revision) !== original.revision)
    fail(409, "The draft changed. Refresh and try again.");
  if (!["pick", "preferences"].includes(action) && !admin)
    fail(403, "Administrator access is required.");
  const state = structuredClone(original);
  state.revision += 1;

  if (action === "configure") {
    if (!["setup", "published"].includes(state.status))
      fail(409, "A started draft cannot be reordered or reconfigured.");
    const config = configuration(body);
    if (config.league !== state.league || config.year !== state.year)
      fail(400, "A draft cannot move to another league or year.");
    Object.assign(state, config);
    for (const id of Object.keys(state.preferences)) {
      if (!state.participants.some((manager) => manager.id === id))
        delete state.preferences[id];
    }
  } else if (action === "publish" || action === "start") {
    if (action === "publish" && state.status !== "setup")
      fail(409, "Only unpublished setup can be published.");
    if (action === "start" && state.status !== "published")
      fail(409, "Publish the draft before starting it.");
    if (state.options.length < state.schedule.length)
      fail(400, "Add at least one available option for every scheduled pick.");
    state.status = action === "publish" ? "published" : "active";
    if (action === "start") {
      notifyAll(state, "started");
      nextTurn(state);
    }
  } else if (isPick) {
    if (state.status !== "active")
      fail(409, "This draft is not accepting picks.");
    if (state.schedule[state.picks.length]?.managerId !== actor)
      fail(403, "It is not your turn.");
    const requestId = label(body.requestId, "Retry key", 100);
    const option = state.options.find((entry) => entry.id === body.optionId);
    if (!option) fail(400, "Choose an option from this draft resource.");
    if (state.picks.some((pick) => pick.optionId === option.id))
      fail(409, "That option has already been taken.");
    const pick = {
      ...state.schedule[state.picks.length],
      optionId: option.id,
      optionName: option.name,
      at: new Date().toISOString(),
      requestId,
      ...(performedBy !== actor ? { adminActor: performedBy } : {}),
    };
    state.picks.push(pick);
    state.requests[requestId] = { managerId: actor, optionId: option.id };
    nextTurn(state);
  } else if (action === "pause") {
    if (state.status !== "active")
      fail(409, "Only an active draft can be paused.");
    state.reason = label(body.reason, "Pause reason", 500);
    state.status = "paused";
    state.turnToken = crypto.randomUUID();
    notifyAll(state, "paused");
  } else if (action === "resume") {
    if (state.status !== "paused")
      fail(409, "Only a paused draft can be resumed.");
    state.reason = "";
    state.status = "active";
    nextTurn(state);
    notifyAll(state, "resumed");
  } else if (action === "undo") {
    if (
      !["active", "paused", "completed"].includes(state.status) ||
      !state.picks.length
    )
      fail(409, "There is no latest pick to undo.");
    state.reason = label(body.reason, "Undo reason", 500);
    const pick = state.picks.pop();
    // Keep retry receipts: a delayed retry of an undone pick must never recreate it.
    state.status = "paused";
    state.turnToken = crypto.randomUUID();
    audit(
      state,
      "pick-undone",
      performedBy,
      `Pick #${pick.number}: ${pick.optionName}. ${state.reason}`,
    );
    notifyAll(state, "paused");
  } else if (action === "cancel") {
    if (["cancelled", "completed"].includes(state.status))
      fail(409, "This draft has already ended.");
    state.reason = label(body.reason, "Cancellation reason", 500);
    state.status = "cancelled";
    state.turnToken = crypto.randomUUID();
    notifyAll(state, "cancelled");
  } else if (action === "preferences") {
    if (!state.participants.some((manager) => manager.id === actor) && !admin)
      fail(403, "Only participants and administrators can subscribe.");
    if (state.status === "setup" && !admin)
      fail(403, "This draft has not been published.");
    if (typeof body.enabled !== "boolean" || typeof body.push !== "boolean")
      fail(400, "Choose notification preferences.");
    const previous = state.preferences[actor];
    state.preferences[actor] = {
      enabled: body.enabled,
      push: body.enabled && body.push,
    };
    if (
      body.enabled &&
      (!previous?.enabled || (!previous.push && body.push)) &&
      state.status === "active" &&
      state.schedule[state.picks.length]?.managerId === actor
    )
      notify(state, "turn", actor);
  } else {
    fail(404, "Unknown draft action.");
  }
  audit(
    state,
    performedBy !== actor ? "test-pick" : action,
    performedBy,
    state.reason,
  );
  return state;
}

export function visibleDraft(state, managerId, admin = false) {
  const { preferences, events, audit: history, ...draft } = state;
  delete draft.requests;
  return {
    ...draft,
    preference: preferences[managerId] || { enabled: false, push: false },
    notifications: events
      .filter(
        (event) =>
          event.managerId === managerId && eventIsCurrent(state, event),
      )
      .slice(-20),
    ...(admin ? { audit: history } : {}),
  };
}

export function eventIsCurrent(state, event) {
  if (!state.preferences[event.managerId]?.enabled) return false;
  if (event.type === "turn")
    return (
      state.status === "active" &&
      state.turnToken === event.turnToken &&
      state.schedule[state.picks.length]?.managerId === event.managerId
    );
  if (event.type === "paused")
    return state.status === "paused" && state.turnToken === event.turnToken;
  if (event.type === "resumed")
    return state.status === "active" && state.turnToken === event.turnToken;
  if (event.type === "completed") return state.status === "completed";
  if (event.type === "cancelled") return state.status === "cancelled";
  return !["setup", "published", "cancelled"].includes(state.status);
}
