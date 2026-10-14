/**
 * Server-only QuickBooks Online read-only API client.
 * Never expose access tokens to the browser. OAuth token exchange/rotation must be
 * implemented in a secure backend before this client is used in production.
 */
export type QboCredentials = { realmId: string; accessToken: string };
export type QboEntity = "Purchase" | "Bill" | "Payment" | "Deposit" | "Transfer" | "JournalEntry" | "CreditCardPayment";
export type QboRecord = { Id: string; SyncToken?: string; MetaData?: { LastUpdatedTime?: string }; [key: string]: unknown };
export type SyncCheckpoint = { entity: QboEntity; lastUpdated?: string; lastId?: string };
export type SyncSink = {
  upsert(record: { realmId: string; entity: QboEntity; providerId: string; sourceUpdatedAt: string | null; payload: QboRecord }): Promise<void>;
  checkpoint(value: SyncCheckpoint): Promise<void>;
};
const BASE = "https://quickbooks.api.intuit.com/v3/company";
const allowed: ReadonlySet<string> = new Set(["Purchase", "Bill", "Payment", "Deposit", "Transfer", "JournalEntry", "CreditCardPayment"]);
export async function queryQbo(creds: QboCredentials, query: string, fetcher: typeof fetch = fetch): Promise<Record<string, unknown>> {
  if (!/^SELECT\s+\*\s+FROM\s+(Purchase|Bill|Payment|Deposit|Transfer|JournalEntry|CreditCardPayment)\b/i.test(query)) throw new Error("Unsupported QBO query");
  if (!/^\d+$/.test(creds.realmId)) throw new Error("Invalid realm ID");
  const url = `${BASE}/${creds.realmId}/query?query=${encodeURIComponent(query)}&minorversion=75`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetcher(url, { headers: { Authorization: `Bearer ${creds.accessToken}`, Accept: "application/json" }, cache: "no-store" });
    if (response.ok) return (await response.json()) as Record<string, unknown>;
    if (response.status === 401 || response.status === 403) throw new Error("QBO authorization failed; reconnect or refresh credentials");
    if (response.status !== 429 && response.status < 500) throw new Error(`QBO request failed (${response.status})`);
    if (attempt === 4) throw new Error(`QBO retries exhausted (${response.status})`);
    const retryAfter = Number(response.headers.get("retry-after") || 0);
    await new Promise(resolve => setTimeout(resolve, Math.min(30000, Math.max(retryAfter * 1000, 500 * 2 ** attempt))));
  }
  throw new Error("Unreachable");
}
export async function syncQboEntity(creds: QboCredentials, entity: QboEntity, sink: SyncSink, checkpoint?: SyncCheckpoint, fetcher: typeof fetch = fetch): Promise<number> {
  if (!allowed.has(entity)) throw new Error("Unsupported entity");
  // Replay a two-minute overlap to avoid missing edits on timestamp boundaries.
  const parsed = checkpoint?.lastUpdated ? Date.parse(checkpoint.lastUpdated) : undefined;
  if (parsed !== undefined && !Number.isFinite(parsed)) throw new Error("Invalid checkpoint");
  const since = parsed === undefined ? undefined : new Date(parsed - 120000).toISOString();
  const syncStartedAt = new Date().toISOString();
  let start = 1, count = 0;
  const max = 500;
  while (true) {
    const filter = since ? ` WHERE MetaData.LastUpdatedTime >= '${since}'` : "";
    const query = `SELECT * FROM ${entity}${filter} ORDERBY MetaData.LastUpdatedTime STARTPOSITION ${start} MAXRESULTS ${max}`;
    const data = await queryQbo(creds, query, fetcher);
    const result = data.QueryResponse as Record<string, unknown> | undefined;
    const records = (result?.[entity] || []) as QboRecord[];
    if (!Array.isArray(records)) throw new Error("Malformed QBO response");
    for (const record of records) {
      if (!record.Id) throw new Error("QBO record missing ID");
      await sink.upsert({ realmId: creds.realmId, entity, providerId: record.Id, sourceUpdatedAt: record.MetaData?.LastUpdatedTime || null, payload: record });
      count++;
    }
    if (records.length < max) break;
    start += records.length;
    if (start > 1000000) throw new Error("QBO pagination safety limit");
  }
  // Advance only to the start of the run so records updated during pagination
  // remain eligible for the next overlapping sync.
  await sink.checkpoint({ entity, lastUpdated: syncStartedAt });
  return count;
}
