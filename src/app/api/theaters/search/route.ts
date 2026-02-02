// app/api/theaters/search/route.ts
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
    const { query, limit = 10 } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const searchTerm = query.trim();
    
    // Search for city or name matches
    const textMatches = await pool.query(
      `
      SELECT 
        id,
        name,
        city,
        latitude,
        longitude,
        url
      FROM theatres
      WHERE 
        city ILIKE $1
        OR name ILIKE $1
      ORDER BY 
        CASE 
          WHEN LOWER(city) = LOWER($2) THEN 1
          ELSE 2
        END,
        city,
        name
      LIMIT $3
      `,
      [`%${searchTerm}%`, searchTerm, limit]
    );

    // If we found matches, also get nearest theaters to the first result
    let nearbyTheaters = [];
    if (textMatches.rows.length > 0) {
      const firstTheater = textMatches.rows[0];
      const textMatchIds = textMatches.rows.map(t => t.id);
      
      const nearbyResult = await pool.query(
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
        WHERE id != ALL($3)
        ORDER BY location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
        LIMIT 5
        `,
        [firstTheater.longitude, firstTheater.latitude, textMatchIds]
      );
      
      nearbyTheaters = nearbyResult.rows.map(row => ({
        ...row,
        distance: parseFloat(row.distance_miles)
      }));
    }

    return NextResponse.json({ 
      cityMatches: textMatches.rows,
      nearbyMatches: nearbyTheaters
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search theaters',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}