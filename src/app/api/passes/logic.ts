// /app/api/passes/logic.ts - FIXED VERSION

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
  // FIXED: Fetch ALL passIds and convert to numbers in JavaScript
  // because Sanity stores passId as string, and sorting strings gives wrong order
  const query = `
    *[_type == "employeePass" && 
      category == $category && 
      string::startsWith(dateOfEntry, $year)
    ].passId
  `;
  
  const params = { 
    category,
    year, 
  };

  const allPassIds = await writeClient.fetch<string[]>(query, params);
  
  // Convert strings to numbers and find the highest
  const numericIds = allPassIds
    .map(id => parseInt(id, 10))
    .filter(id => !isNaN(id)); // Filter out any invalid conversions
  
  const highestExistingId = numericIds.length > 0 
    ? Math.max(...numericIds) 
    : 0;
  
  const nextId = highestExistingId + 1;

  console.log(`[getNextPassId] Category: ${category}, Year: ${year}, Highest ID: ${highestExistingId}, Next ID: ${nextId}`);

  return nextId;
}