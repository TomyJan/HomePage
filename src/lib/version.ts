export function resolveRevision(
  env: Record<string, string | undefined>,
  readGit: () => string,
): string {
  const valid = (value: string | undefined): value is string =>
    !!value && /^[a-f\d]{40}$/i.test(value);
  let local = '';
  try {
    local = readGit().trim();
  } catch {
    /* Git-less build archives may supply a CI SHA. */
  }
  if (valid(local)) return local.toLowerCase();
  for (const key of [
    'SITE_REVISION',
    'GITHUB_SHA',
    'CI_COMMIT_SHA',
    'COMMIT_SHA',
  ]) {
    if (valid(env[key])) return env[key]!.toLowerCase();
  }
  throw new Error(
    'A full Git commit SHA is required. Build from a checkout or set SITE_REVISION.',
  );
}
