import { WorkerEntrypoint } from "cloudflare:workers";
import worker, { dispatchResultRefresh } from "./index.js";

export default worker;

// This entrypoint is available only to explicitly configured service bindings.
// The public fetch handler does not expose workflow dispatch.
export class ResultRefreshScheduler extends WorkerEntrypoint {
  async dispatch() {
    await dispatchResultRefresh(this.env);
    return { ok: true };
  }
}
