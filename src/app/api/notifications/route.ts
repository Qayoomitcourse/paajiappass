// app/api/notifications/route.ts
import { NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';

// Your publicNotice schema should already exist based on your homepage query

// GET all notices
export async function GET() {
  try {
    const query = `*[_type == "publicNotice"] | order(_createdAt desc)`;
    const notices = await client.fetch(query);
    return NextResponse.json({ notices });
  } catch (error) {
    console.error("Failed to fetch notices:", error); // Log the actual error
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: `Failed to fetch notices: ${errorMessage}` }, { status: 500 });
  }
}

// POST a new notice
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, type, isActive, validUntil } = body;

    if (!title || !type) {
      return NextResponse.json({ error: 'Title and type are required' }, { status: 400 });
    }

    const result = await client.create({
      _type: 'publicNotice',
      title,
      description,
      type,
      isActive,
      validUntil: validUntil || null,
      displayOrder: 10, // Default display order
    });

    return NextResponse.json({ message: 'Notification created', notice: result }, { status: 201 });
  } catch (error) {
    console.error("Failed to create notification:", error); // Log the actual error
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: `Failed to create notification: ${errorMessage}` }, { status: 500 });
  }
}

// PUT (update) a notice, e.g., for toggling isActive
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { _id, ...updates } = body;

        if (!_id) {
            return NextResponse.json({ error: 'Notice ID is required for update' }, { status: 400 });
        }
        
        // Use patch to update the document in Sanity
        const result = await client.patch(_id).set(updates).commit();

        return NextResponse.json({ message: 'Notification updated', notice: result }, { status: 200 });
    } catch (error) {
        console.error("Failed to update notification:", error); // Log the actual error
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return NextResponse.json({ error: `Failed to update notification: ${errorMessage}` }, { status: 500 });
    }
}


// DELETE a notice
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        await client.delete(id);
        return NextResponse.json({ message: 'Notification deleted' }, { status: 200 });
    } catch (error) {
        console.error("Failed to delete notification:", error); // Log the actual error
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return NextResponse.json({ error: `Failed to delete notification: ${errorMessage}` }, { status: 500 });
    }
}