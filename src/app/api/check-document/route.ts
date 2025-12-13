import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // 'security' or 'payment'
  const number = searchParams.get('number');
  const subtype = searchParams.get('subtype'); // 'special_branch', 'local_police' etc.

  if (!number) return NextResponse.json({ found: false });

  try {
    let query = '';
    let params: any = { number };

    if (type === 'security') {
      // Find a pass that contains a security document with this certificate number and type
      query = `*[_type == "employeePass" && count(securityDocuments[certificateNumber == $number && docType == $subtype]) > 0][0] {
        "document": securityDocuments[certificateNumber == $number && docType == $subtype][0] {
          issueDate,
          "imageUrl": document.asset->url,
          "assetId": document.asset->_id,
          "_id": document.asset->_id 
        }
      }`;
      params.subtype = subtype;
    } 
    else if (type === 'payment') {
      // Find a pass that contains a financial detail with this receipt number
      query = `*[_type == "employeePass" && count(financialDetails[receiptNumber == $number]) > 0][0] {
        "document": financialDetails[receiptNumber == $number][0] {
          totalAmount,
          dateOfPayment,
          bank,
          "imageUrl": receiptImage.asset->url,
          "assetId": receiptImage.asset->_id,
          "_id": receiptImage.asset->_id
        }
      }`;
    }

    const result = await client.fetch(query, params);

    if (result && result.document && result.document.imageUrl) {
      return NextResponse.json({ found: true, document: result.document });
    }

    return NextResponse.json({ found: false });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ found: false });
  }
}