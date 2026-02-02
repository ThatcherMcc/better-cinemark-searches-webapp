// app/api/theaters/nearest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function POST(request: NextRequest) {
  try {
    const { lat, lon, limit = 5 } = await request.json();

    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Use PostGIS ST_Distance to find nearest theaters
    // ST_Distance returns distance in meters, divide by 1609.34 to get miles
    const result = await pool.query(
      `
      SELECT 
        id,
        name,
        city,
        latitude,
        longitude,
        url,
        ST_Distance(
          location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) / 1609.34 AS distance_miles
      FROM theatres
      ORDER BY location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
      LIMIT $3
      `,
      [lon, lat, limit]
    );

    const theaters = result.rows.map(row => ({
      ...row,
      distance: parseFloat(row.distance_miles)
    }));

    return NextResponse.json({ theaters });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to find nearest theaters',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}