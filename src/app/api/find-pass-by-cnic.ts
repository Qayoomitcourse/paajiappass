// pages/api/find-pass-by-cnic.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { client } from '@/sanity/lib/client';
import { EmployeePass } from '@/app/types'; // Assuming your types are defined here

type ApiResponse = {
  pass?: EmployeePass;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { cnic } = req.query;

  if (!cnic || typeof cnic !== 'string') {
    return res.status(400).json({ error: 'CNIC parameter is required and must be a string.' });
  }

  try {
    // GROQ query to find the *most recently created* pass with the given CNIC.
    // This is important for fetching the latest data for an individual.
    const query = `*[_type == "employeePass" && cnic == $cnic] | order(_createdAt desc)[0]`;
    const params = { cnic };
    const pass: EmployeePass | null = await client.fetch(query, params);

    if (pass) {
      return res.status(200).json({ pass });
    } else {
      return res.status(404).json({ message: 'No pass found with this CNIC.' });
    }
  } catch (error) {
    console.error('Error fetching pass by CNIC:', error);
    return res.status(500).json({ error: 'An internal server error occurred while fetching pass data.' });
  }
}