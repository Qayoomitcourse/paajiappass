// app/api/circulars/route.ts
import { NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';

// NOTE: You need a 'circular' schema in your Sanity studio.
// Example schema: { name: 'circular', title: 'Circular', type: 'document', fields: [ {name: 'title', type: 'string'}, {name: 'description', type: 'string'}, {name: 'attachment', type: 'file'} ] }

// GET all circulars
export async function GET() {
  try {
    const query = `
      *[_type == "circular"] | order(_createdAt desc) {
        _id,
        title,
        description,
        "fileName": attachment.asset->originalFilename,
        "fileUrl": attachment.asset->url,
        _createdAt
      }
    `;
    const circulars = await client.fetch(query);
    return NextResponse.json({ circulars });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch circulars' }, { status: 500 });
  }
}

// POST a new circular
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    if (!file || !title) {
      return NextResponse.json({ error: 'Missing title or file' }, { status: 400 });
    }

    const fileAsset = await client.assets.upload('file', file, { filename: file.name });
    
    const result = await client.create({
      _type: 'circular',
      title,
      description,
      attachment: {
        _type: 'file',
        asset: {
          _type: 'reference',
          _ref: fileAsset._id,
        },
      },
    });

    return NextResponse.json({ message: 'Circular created', circular: result }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create circular' }, { status: 500 });
  }
}

// DELETE a circular
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        await client.delete(id);
        return NextResponse.json({ message: 'Circular deleted' }, { status: 200 });
    } catch {
        return NextResponse.json({ error: 'Failed to delete circular' }, { status: 500 });
    }
}