// app/api/notifications/route.ts
import { NextResponse } from 'next/server';
import { serverWriteClient as client } from '@/sanity/lib/serverClient'; // Use write client
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/lib/auth";

// GET all notices
export async function GET() {
  try {
    const query = `*[_type == "publicNotice"] | order(_createdAt desc)`;
    const notices = await client.fetch(query);
    return NextResponse.json({ notices });
  } catch (error) {
    console.error("Failed to fetch notices:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: `Failed to fetch notices: ${errorMessage}` }, { status: 500 });
  }
}

// POST a new notice
export async function POST(request: Request) {
  try {
    // Optional: Add authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, type, isActive, validUntil } = body;

    if (!title || !type) {
      return NextResponse.json({ error: 'Title and type are required' }, { status: 400 });
    }

    // Create the document
    const result = await client.create({
      _type: 'publicNotice',
      title,
      description,
      type,
      isActive: isActive ?? true, // Default to true if not provided
      validUntil: validUntil || null,
      displayOrder: 10, // Default display order
      _createdAt: new Date().toISOString(), // Explicitly set creation time
    });

    return NextResponse.json({ 
      message: 'Notification created successfully', 
      notice: result 
    }, { status: 201 });
    
  } catch (error) {
    console.error("Failed to create notification:", error);
    
    // More detailed error handling
    if (error instanceof Error) {
      if (error.message.includes('permission')) {
        return NextResponse.json({ 
          error: 'Insufficient permissions to create notification. Check your Sanity API token.' 
        }, { status: 403 });
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ 
      error: `Failed to create notification: ${errorMessage}` 
    }, { status: 500 });
  }
}

// PUT (update) a notice
export async function PUT(request: Request) {
  try {
    // Optional: Add authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { _id, ...updates } = body;

    if (!_id) {
      return NextResponse.json({ error: 'Notice ID is required for update' }, { status: 400 });
    }
    
    const result = await client.patch(_id).set(updates).commit();

    return NextResponse.json({ 
      message: 'Notification updated successfully', 
      notice: result 
    }, { status: 200 });
    
  } catch (error) {
    console.error("Failed to update notification:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ 
      error: `Failed to update notification: ${errorMessage}` 
    }, { status: 500 });
  }
}

// DELETE a notice
export async function DELETE(request: Request) {
  try {
    // Optional: Add authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await client.delete(id);
    return NextResponse.json({ message: 'Notification deleted successfully' }, { status: 200 });
    
  } catch (error) {
    console.error("Failed to delete notification:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ 
      error: `Failed to delete notification: ${errorMessage}` 
    }, { status: 500 });
  }
}