// /app/api/passes/logic.ts

import { writeClient } from '@/sanity/lib/client';
import { PassCategory } from '@/app/types';

/**
 * Finds the next available passId for a specific category AND year.
 * The pass ID sequence will restart from 1 for each new year.
 *
 * @param {PassCategory} category - The pass category ('cargo' or 'landside').
 * @param {string} year - The four-digit year (e.g., "2026") for which to generate the ID.
 * @returns {Promise<number>} The next sequential pass ID for that year.
 */
export async function getNextPassId(category: PassCategory, year: string): Promise<number> {
  // --- CORRECTED QUERY SYNTAX ---
  // The query now uses the proper string::startsWith() function as required by GROQ.
  const query = `
    *[_type == "employeePass" && 
      category == $category && 
      string::startsWith(dateOfEntry, $year)
    ] | order(passId desc)[0].passId
  `;
  
  const params = { 
    category,
    year, 
  };

  const highestExistingId = await writeClient.fetch<number | null>(query, params);
  const nextId = (highestExistingId ?? 0) + 1;

  return nextId;
}