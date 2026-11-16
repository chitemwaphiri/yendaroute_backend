export interface StopMatch {
  stopId?: number;
  name?: string;
  lat?: number;
  lng?: number;
  radius?: number; // metres, default 1000
}

export interface SqlFilter {
  sql: string;
  params: Record<string, unknown>;
}

export const toNumber = (v?: number | string): number | undefined =>
  v === undefined || v === null || v === '' ? undefined : Number(v);

const hasCriteria = (m?: StopMatch): m is StopMatch =>
  !!m &&
  (m.stopId !== undefined ||
    !!m.name ||
    (m.lat !== undefined && m.lng !== undefined));

function stopCondition(alias: string, p: string, m: StopMatch): SqlFilter {
  const parts = [`${alias}."isActive" = true`];
  const params: Record<string, unknown> = {};

  if (m.stopId !== undefined) {
    parts.push(`${alias}.id = :${p}StopId`);
    params[`${p}StopId`] = m.stopId;
  }
  if (m.name) {
    parts.push(`${alias}.name ILIKE :${p}Name`);
    params[`${p}Name`] = `%${m.name}%`;
  }
  if (m.lat !== undefined && m.lng !== undefined) {
    parts.push(
      `ST_DWithin(
         geography(ST_MakePoint(${alias}.longitude, ${alias}.latitude)),
         geography(ST_MakePoint(:${p}Lng, :${p}Lat)),
         :${p}Radius)`,
    );
    params[`${p}Lng`] = m.lng;
    params[`${p}Lat`] = m.lat;
    params[`${p}Radius`] = m.radius ?? 1000;
  }
  return { sql: parts.join(' AND '), params };
}

/**
 * SQL "EXISTS" condition: the route stops at a `from` stop and, later in
 * its sequence, at a `to` stop. Intermediate stops count, so passengers
 * travelling only part of a journey are matched.
 * Returns null when neither side has any criteria.
 */
export function routeStopsFilter(
  routeIdColumn: string,
  from?: StopMatch,
  to?: StopMatch,
): SqlFilter | null {
  const f = hasCriteria(from) ? stopCondition('sa', 'from', from) : null;
  const t = hasCriteria(to) ? stopCondition(f ? 'sb' : 'sa', 'to', to) : null;
  if (!f && !t) return null;

  if (f && t) {
    return {
      sql: `EXISTS (
        SELECT 1 FROM route_stops rsa
        JOIN stops sa ON sa.id = rsa."stopId"
        JOIN route_stops rsb ON rsb."routeId" = rsa."routeId" AND rsb.sequence > rsa.sequence
        JOIN stops sb ON sb.id = rsb."stopId"
        WHERE rsa."routeId" = ${routeIdColumn} AND ${f.sql} AND ${t.sql})`,
      params: { ...f.params, ...t.params },
    };
  }

  const only = (f ?? t) as SqlFilter;
  return {
    sql: `EXISTS (
      SELECT 1 FROM route_stops rsa
      JOIN stops sa ON sa.id = rsa."stopId"
      WHERE rsa."routeId" = ${routeIdColumn} AND ${only.sql})`,
    params: only.params,
  };
}