import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const deg2rad = (deg: number) => deg * (Math.PI / 180);
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

async function fetchOverpassHospitals(lat: number, lng: number, radius = 15000, pediatricOnly = false) {
  const cacheKey = `overpass:hospitals:${lat.toFixed(2)}:${lng.toFixed(2)}:${radius}:${pediatricOnly}`;
  const { redis } = await import("@/lib/redis");
  
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return cached as any[];
  } catch (e) { /* redis fail */ }

  let query;
  if (pediatricOnly) {
    query = `[out:json][timeout:25];(
      nwr["amenity"~"hospital|clinic|doctors"]["healthcare:speciality"~"paediatrics|neonatology"](around:${radius},${lat},${lng});
      nwr["amenity"~"hospital|clinic|doctors"]["name"~"child|children|pediatric|paediatric|mother",i](around:${radius},${lat},${lng});
    );out center;`;
  } else {
    query = `[out:json][timeout:25];nwr["amenity"="hospital"](around:${radius},${lat},${lng});out center;`;
  }
  try {
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      method: "GET",
      next: { revalidate: 3600 }
    });
    
    if (!res.ok) {
      console.error("Overpass API Error:", res.statusText);
      return [];
    }
    
    const data = await res.json();
    const parsedData = (data.elements || [])
      .map((el: any) => {
        const hLat = el.lat || el.center?.lat;
        const hLng = el.lon || el.center?.lon;
        
        if (!hLat || !hLng) return null;

        return {
          id: `osm-${el.id}`,
          name: el.tags?.name || el.tags?.["name:en"] || "Hospital",
          address: el.tags?.["addr:full"] || el.tags?.["addr:street"] || el.tags?.["addr:city"] || "Hospital near Coimbatore",
          lat: hLat,
          lng: hLng,
          type: el.tags?.["healthcare:speciality"] === "community" ? "govt" : "private",
          isOpen24x7: el.tags?.opening_hours === "24/7" || el.tags?.emergency === "yes",
          hasNicu: el.tags?.["healthcare:speciality"] === "neonatology" || el.tags?.["neonatal"] === "yes",
          rating: 4.0, 
          isExternal: true
        };
      })
      .filter((h: any) => h !== null);

    try {
      await redis.set(cacheKey, parsedData, { ex: 86400 }); // cache for 24h
    } catch (e) { /* redis fail */ }

    return parsedData;
  } catch (e) {
    console.error("Overpass Fetch Error:", e);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || searchParams.get("lon") || "0");
    const typeFilter = searchParams.get("type"); // govt/private
    const hasNicuFilter = searchParams.get("hasNicu") === "true";
    const pediatricOnly = searchParams.get("pediatric") === "true";

    // 1. Fetch our verified database records (The "Seeds")
    const dbHospitals = await prisma.hospital.findMany({
      where: {
        type: typeFilter ? { contains: typeFilter, mode: 'insensitive' } : undefined,
        hasNicu: hasNicuFilter ? true : undefined,
      }
    });

    let finalHospitals = dbHospitals.map(h => ({ ...h, isExternal: false }));

    // 2. Fetch from OpenStreetMap if lat/lng are present
    if (lat && lng) {
      const osmHospitals = await fetchOverpassHospitals(lat, lng, 10000, pediatricOnly); // 10km

      // 3. Merge & Deduplicate
      // Logic: If an OSM result is within 100m of a DB result, it's a duplicate. Prefer DB result.
      for (const osmH of osmHospitals) {
        const isDuplicate = dbHospitals.some(dbH => {
          const dist = getDistance(osmH.lat, osmH.lng, dbH.lat, dbH.lng);
          const nameMatch = dbH.name.toLowerCase().includes(osmH.name.toLowerCase()) || 
                          osmH.name.toLowerCase().includes(dbH.name.toLowerCase());
          return dist < 0.2 || (dist < 1 && nameMatch); // Within 200m OR within 1km with name match
        });

        if (!isDuplicate) {
          finalHospitals.push(osmH);
        }
      }

      // 4. Sort all by distance from search center
      const sortedHospitals = finalHospitals.map(h => ({
        ...h,
        distance: getDistance(lat, lng, h.lat, h.lng)
      })).sort((a, b) => a.distance - b.distance);

      return NextResponse.json(sortedHospitals);
    }

    return NextResponse.json(finalHospitals);
  } catch (error) {
    console.error("[/api/hospitals] GET Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
