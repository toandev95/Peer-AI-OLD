import { del, list } from '@vercel/blob';
import type { HandleUploadBody } from '@vercel/blob/client';
import { handleUpload } from '@vercel/blob/client';
import { isEmpty } from 'lodash';
import moment from 'moment';
import type { ServerRuntime } from 'next';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const runtime: ServerRuntime = 'edge';

export async function GET(): Promise<NextResponse<any>> {
  try {
    const { blobs } = await list();

    if (!isEmpty(blobs)) {
      await Promise.all(
        blobs.map(async (blob) => {
          const old = moment(blob.uploadedAt).isBefore(
            moment().subtract(12, 'hours'),
          );

          if (old) {
            await del(blob.url);
          }
        }),
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as HandleUploadBody;

    const res = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 5 * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const { url } = (await req.json()) as { url: string };

    await del(url);

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
