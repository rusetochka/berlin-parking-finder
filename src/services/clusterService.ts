/**
 * Cluster Service — groups nearby parking spots into clusters.
 *
 * Uses a greedy distance-based approach: iterate through spots (sorted by
 * distance from search location) and assign each to the nearest existing
 * cluster if within CLUSTER_RADIUS_M, or create a new cluster.
 *
 * Returns the top MAX_CLUSTERS clusters sorted by total spot count (biggest first).
 */

import type { DifficultyLevel, DifficultyResult, ParkingCluster, ParkingSpot, ParkingType, SearchLocation } from '@/types/parking';
import { haversineMetres, estimateWalkingMinutes } from '@/services/parkingService';

/** Spots within this distance are grouped into the same cluster */
const CLUSTER_RADIUS_M = 150;

/** Maximum number of clusters to return */
const MAX_CLUSTERS = 5;

/**
 * Group parking spots into spatial clusters and return the top clusters
 * sorted by spot count (biggest first), limited to MAX_CLUSTERS.
 */
export function clusterParkingSpots(
  spots: ParkingSpot[],
  searchLocation: SearchLocation,
): ParkingCluster[] {
  if (spots.length === 0) return [];

  // Sort by distance so we build clusters from closest-first
  const sorted = [...spots].sort(
    (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity),
  );

  // Greedy clustering
  const clusters: Array<{ centerLat: number; centerLng: number; spots: ParkingSpot[] }> = [];

  for (const spot of sorted) {
    let assigned = false;

    for (const cluster of clusters) {
      const dist = haversineMetres(spot.lat, spot.lng, cluster.centerLat, cluster.centerLng);
      if (dist <= CLUSTER_RADIUS_M) {
        cluster.spots.push(spot);
        // Recompute centre as average
        const n = cluster.spots.length;
        cluster.centerLat = cluster.spots.reduce((s, sp) => s + sp.lat, 0) / n;
        cluster.centerLng = cluster.spots.reduce((s, sp) => s + sp.lng, 0) / n;
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      clusters.push({ centerLat: spot.lat, centerLng: spot.lng, spots: [spot] });
    }
  }

  // Sort by spot count descending, take top N
  clusters.sort((a, b) => b.spots.length - a.spots.length);
  const topClusters = clusters.slice(0, MAX_CLUSTERS);

  return topClusters.map((c, idx) => buildCluster(c, idx, searchLocation));
}

function buildCluster(
  raw: { centerLat: number; centerLng: number; spots: ParkingSpot[] },
  index: number,
  searchLocation: SearchLocation,
): ParkingCluster {
  const { centerLat, centerLng, spots } = raw;

  // Find the spot closest to the cluster centre — use its address
  let closestSpot = spots[0];
  let closestDist = Infinity;
  for (const s of spots) {
    const d = haversineMetres(s.lat, s.lng, centerLat, centerLng);
    if (d < closestDist) {
      closestDist = d;
      closestSpot = s;
    }
  }

  const distanceMeters = haversineMetres(searchLocation.lat, searchLocation.lng, centerLat, centerLng);
  const walkingMinutes = estimateWalkingMinutes(distanceMeters);

  // Aggregate capacity
  const capacities = spots.filter((s) => s.capacity != null).map((s) => s.capacity!);
  const totalCapacity = capacities.length > 0 ? capacities.reduce((a, b) => a + b, 0) : null;

  // Type breakdown
  const typeCounts: Partial<Record<ParkingType, number>> = {};
  for (const s of spots) {
    typeCounts[s.type] = (typeCounts[s.type] ?? 0) + 1;
  }

  // Average difficulty
  const avgDifficulty = computeAvgDifficulty(spots);

  const hasFreeParking = spots.some((s) => s.isFree === true);

  // Build a readable address from the closest spot
  const address = closestSpot.address !== 'Berlin'
    ? closestSpot.address
    : `${centerLat.toFixed(5)}, ${centerLng.toFixed(5)}`;

  return {
    id: `cluster-${index}`,
    lat: centerLat,
    lng: centerLng,
    address,
    label: `${spots.length} parking spot${spots.length !== 1 ? 's' : ''}`,
    spots,
    distanceMeters,
    walkingMinutes,
    totalCapacity,
    spotsWithCapacity: capacities.length,
    typeCounts,
    avgDifficulty,
    hasFreeParking,
  };
}

function computeAvgDifficulty(spots: ParkingSpot[]): DifficultyResult | null {
  const scored = spots.filter((s) => s.difficulty != null);
  if (scored.length === 0) return null;

  const avgScore = Math.round(
    scored.reduce((sum, s) => sum + s.difficulty!.score, 0) / scored.length,
  );

  const level: DifficultyLevel =
    avgScore < 40 ? 'easy' : avgScore < 68 ? 'medium' : 'hard';

  const labelMap: Record<DifficultyLevel, string> = {
    easy: 'Easy to park',
    medium: 'Moderate difficulty',
    hard: 'Hard to park',
  };

  // Collect unique factors
  const allFactors = new Set<string>();
  for (const s of scored) {
    for (const f of s.difficulty!.factors) {
      allFactors.add(f);
    }
  }

  return {
    level,
    score: avgScore,
    label: labelMap[level],
    isEstimated: true,
    factors: Array.from(allFactors).slice(0, 5),
  };
}
