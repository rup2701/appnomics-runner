/** How the checks after approval ended. "change" = the tests ran and some failed (the change can be repaired); "system" = they could not run properly (not the change's fault). */
export type VerifyVerdict = { ok: true } | { ok: false; kind: "change" | "system"; tail: string };

const INFRA_TROUBLE = /Executable doesn't exist|browserType\.launch|EADDRINUSE|address already in use|Process from config\.webServer|ENOSPC|ENOMEM|Cannot find module|ECONNREFUSED.*(5432|postgres)|Target page, context or browser has been closed/i;

/** Decides, from how the e2e run ended, whether the change failed the tests or the tests could not run. Unknown is "system": better to alert than to repair or blame the change. */
export function judgeE2e(exitCode: number | null, timedOut: boolean, output: string): VerifyVerdict {
  const tail = output.slice(-3000);
  if (exitCode === 0 && !timedOut) return { ok: true };
  if (timedOut || INFRA_TROUBLE.test(output)) return { ok: false, kind: "system", tail };
  const failed = /(\d+)\s+failed/i.exec(output);
  if (failed && Number(failed[1]) > 0) return { ok: false, kind: "change", tail };
  return { ok: false, kind: "system", tail };
}

