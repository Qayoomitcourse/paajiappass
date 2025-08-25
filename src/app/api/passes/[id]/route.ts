// app/api/passes/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'

// Define the context type for async params
type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Await the params since they're now async in Next.js 15
    const { id } = await context.params
    
    // Your GET logic here
    console.log('Pass ID:', id)
    
    return NextResponse.json({ message: `Getting pass ${id}` })
  } catch (error) {
    console.error('Error in GET /api/passes/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Await the params
    const { id } = await context.params
    
    // Your PUT logic here
    console.log('Updating pass:', id)
    
    return NextResponse.json({ message: `Updated pass ${id}` })
  } catch (error) {
    console.error('Error in PUT /api/passes/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Await the params - this is what's causing your error
    const { id } = await context.params
    
    // Your DELETE logic here
    console.log('Deleting pass:', id)
    
    return NextResponse.json({ message: `Deleted pass ${id}` })
  } catch (error) {
    console.error('Error in DELETE /api/passes/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Alternative approach if you want to be more explicit about types
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Your PATCH logic here
    console.log('Patching pass:', id)
    
    return NextResponse.json({ message: `Patched pass ${id}` })
  } catch (error) {
    console.error('Error in PATCH /api/passes/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}