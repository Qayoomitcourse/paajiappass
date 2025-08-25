// app/api/templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { z } from 'zod';
import { writeClient } from '@/sanity/lib/client';

// Validation schema for template creation
const templateSchema = z.object({
  title: z.string().min(1, "Title is required.").max(200, "Title cannot exceed 200 characters."),
  description: z.string().optional(),
  category: z.enum(['cargo', 'landside', 'general'], {
    errorMap: () => ({ message: "Category must be cargo, landside, or general." })
  }),
  isRequired: z.boolean().optional().default(false),
  isPublic: z.boolean().optional().default(true),
  displayOrder: z.number().int().min(0, "Display order cannot be negative.").optional().default(10),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const isPublic = searchParams.get('isPublic');

    // Build query based on parameters
    let query = `*[_type == "publicTemplate"`;
    const params: Record<string, string | boolean> = {};

    if (category) {
      query += ` && category == $category`;
      params.category = category;
    }

    if (isPublic !== null) {
      query += ` && isPublic == $isPublic`;
      params.isPublic = isPublic === 'true';
    }

    query += `] | order(displayOrder asc, _createdAt desc) {
      _id,
      title,
      description,
      category,
      isRequired,
      isPublic,
      displayOrder,
      "fileUrl": file.asset->url,
      "fileName": file.asset->originalFilename,
      "fileSize": file.asset->size,
      _createdAt,
      _updatedAt
    }`;

    const templates = await writeClient.fetch(query, params);

    return NextResponse.json({ 
      templates,
      count: templates.length 
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json({ 
      error: "Failed to fetch templates",
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const isRequired = formData.get('isRequired') === 'true';
    const isPublic = formData.get('isPublic') !== 'false'; // Default to true
    const displayOrder = parseInt(formData.get('displayOrder') as string) || 10;

    // Validate required fields
    if (!file) {
      return NextResponse.json({ 
        error: "File is required" 
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: "Invalid file type. Only PDF, DOC, and DOCX files are allowed." 
      }, { status: 400 });
    }

    // Validate template data
    const validationResult = templateSchema.safeParse({
      title,
      description: description || undefined,
      category,
      isRequired,
      isPublic,
      displayOrder,
    });

    if (!validationResult.success) {
      return NextResponse.json({ 
        error: "Validation failed",
        details: validationResult.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const validatedData = validationResult.data;

    // Check for duplicate title in the same category
    const existingTemplate = await writeClient.fetch(
      `*[_type == "publicTemplate" && title == $title && category == $category][0]._id`,
      { title: validatedData.title, category: validatedData.category }
    );

    if (existingTemplate) {
      return NextResponse.json({ 
        error: `A template with the title "${validatedData.title}" already exists in the ${validatedData.category} category.` 
      }, { status: 409 });
    }

    // Upload file to Sanity
    const buffer = await file.arrayBuffer();
    const fileAsset = await writeClient.assets.upload('file', Buffer.from(buffer), {
      filename: file.name,
      contentType: file.type,
    });

    // Create template document
    const templateDocument = {
      _type: 'publicTemplate',
      title: validatedData.title,
      description: validatedData.description,
      category: validatedData.category,
      isRequired: validatedData.isRequired,
      isPublic: validatedData.isPublic,
      displayOrder: validatedData.displayOrder,
      file: {
        _type: 'file',
        asset: {
          _type: 'reference',
          _ref: fileAsset._id,
        },
      },
      // Add author reference if you want to track who created it
      author: {
        _type: 'reference',
        _ref: session.user.id,
      },
    };

    const createdTemplate = await writeClient.create(templateDocument);

    return NextResponse.json({ 
      message: "Template created successfully",
      template: {
        _id: createdTemplate._id,
        title: validatedData.title,
        category: validatedData.category,
        fileName: file.name,
        fileUrl: fileAsset.url,
      }
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating template:", error);
    
    // Handle Sanity-specific errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const sanityError = error as { statusCode: number; message?: string };
      
      if (sanityError.statusCode === 409) {
        return NextResponse.json({ 
          error: "A template with this title already exists in this category." 
        }, { status: 409 });
      }

      if (sanityError.statusCode === 413) {
        return NextResponse.json({ 
          error: "File too large. Please upload a smaller file." 
        }, { status: 413 });
      }
    }

    return NextResponse.json({ 
      error: "Failed to create template",
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json({ 
        error: "Template ID is required" 
      }, { status: 400 });
    }

    const body = await req.json();
    
    // Validate update data
    const validationResult = templateSchema.partial().safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: "Validation failed",
        details: validationResult.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    // Check if template exists
    const existingTemplate = await writeClient.fetch(
      `*[_type == "publicTemplate" && _id == $id][0]`,
      { id: templateId }
    );

    if (!existingTemplate) {
      return NextResponse.json({ 
        error: "Template not found" 
      }, { status: 404 });
    }

    // Update template
    const updatedTemplate = await writeClient
      .patch(templateId)
      .set(validationResult.data)
      .commit();

    return NextResponse.json({ 
      message: "Template updated successfully",
      template: updatedTemplate 
    }, { status: 200 });

  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json({ 
      error: "Failed to update template",
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json({ 
        error: "Template ID is required" 
      }, { status: 400 });
    }

    // Check if template exists and get file asset reference
    const templateToDelete = await writeClient.fetch(
      `*[_type == "publicTemplate" && _id == $id][0]{
        _id,
        title,
        "fileAssetId": file.asset._ref
      }`,
      { id: templateId }
    );

    if (!templateToDelete) {
      return NextResponse.json({ 
        error: "Template not found" 
      }, { status: 404 });
    }

    // Delete the template document
    await writeClient.delete(templateId);

    // Optionally delete the file asset (uncomment if you want to delete files)
    // if (templateToDelete.fileAssetId) {
    //   try {
    //     await writeClient.delete(templateToDelete.fileAssetId);
    //   } catch (fileDeleteError) {
    //     console.warn("Failed to delete file asset:", fileDeleteError);
    //     // Continue even if file deletion fails
    //   }
    // }

    return NextResponse.json({ 
      message: `Template "${templateToDelete.title}" deleted successfully` 
    }, { status: 200 });

  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json({ 
      error: "Failed to delete template",
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}