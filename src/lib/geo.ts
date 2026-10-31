/**
 * Route algorithms used by "Plan a route" (visiting several places in a good order).
 * Finding the shortest round trip is the Travelling Salesman Problem (NP-hard), so we use
 * two classic heuristics: nearest neighbour to build a route, then 2-opt to improve it.
 */
export interface Pt { lat: number; lon: number }

const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km (haversine formula) */
export function haversineKm(a: Pt, b: Pt): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** n×n distance matrix, computed once: O(n²) */
function matrix(points: Pt[]): number[][] {
  return points.map((a) => points.map((b) => haversineKm(a, b)));
}

/** Total length of an open path that visits `order` (indices into the matrix) */
export function pathLength(order: number[], d: number[][]): number {
  let total = 0;
  for (let i = 1; i < order.length; i++) total += d[order[i - 1]!]![order[i]!]!;
  return total;
}

/** Greedy tour from the start point: always go to the closest unvisited place. O(n²) */
function nearestNeighbour(d: number[][]): number[] {
  const n = d.length;
  const seen = new Array<boolean>(n).fill(false);
  const order = [0];
  seen[0] = true;
  for (let step = 1; step < n; step++) {
    const last = order[order.length - 1]!;
    let best = -1;
    for (let j = 0; j < n; j++) if (!seen[j] && (best < 0 || d[last]![j]! < d[last]![best]!)) best = j;
    seen[best] = true;
    order.push(best);
  }
  return order;
}

/**
 * 2-opt: keep reversing any segment that makes the path shorter until no reversal helps.
 * Each pass is O(n²); removes the crossings that greedy routes often have. The start stays fixed.
 */
function twoOpt(order: number[], d: number[][]): number[] {
  const route = [...order];
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const a = route[i - 1]!, b = route[i]!, c = route[k]!, next = route[k + 1];
        const before = d[a]![b]! + (next !== undefined ? d[c]![next]! : 0);
        const after = d[a]![c]! + (next !== undefined ? d[b]![next]! : 0);
        if (after + 1e-9 < before) {
          route.splice(i, k - i + 1, ...route.slice(i, k + 1).reverse());
          improved = true;
        }
      }
    }
  }
  return route;
}

/** Best visiting order starting at `start`; returns the ordered places and the distance saved vs. the listed order */
export function planRoute<T extends Pt>(start: Pt, places: T[]): { ordered: T[]; km: number; naiveKm: number } {
  const pts: Pt[] = [start, ...places];
  const d = matrix(pts);
  const best = twoOpt(nearestNeighbour(d), d);
  const naive = pts.map((_, i) => i);
  return {
    ordered: best.slice(1).map((i) => places[i - 1]!),
    km: Math.round(pathLength(best, d) * 10) / 10,
    naiveKm: Math.round(pathLength(naive, d) * 10) / 10,
  };
}

/** "18.11350° N, 83.40190° E" style label */
export const formatCoords = (p: Pt) =>
  `${Math.abs(p.lat).toFixed(5)}° ${p.lat >= 0 ? 'N' : 'S'}, ${Math.abs(p.lon).toFixed(5)}° ${p.lon >= 0 ? 'E' : 'W'}`;
