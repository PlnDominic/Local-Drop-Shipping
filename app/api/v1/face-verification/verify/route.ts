import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface FaceppResponse {
  face_request_id?: string;
  face_num?: number;
  face_id?: string;
  error_message?: string;
  error_code?: number;
}

async function verifyWithFacepp(base64Data: string): Promise<{ success: boolean; message: string }> {
  const apiKey = process.env.FACEPP_API_KEY;
  const apiSecret = process.env.FACEPP_API_SECRET;

  if (!apiKey || !apiSecret) {
    return { success: false, message: 'Face++ API keys not configured.' };
  }

  const formData = new FormData();
  formData.append('api_key', apiKey);
  formData.append('api_secret', apiSecret);
  formData.append('image_base64', base64Data);
  formData.append('return_face_token', 'true');

  const res = await fetch(
    `https://api-us.faceplusplus.com/facepp/v3/detect`,
    { method: 'POST', body: formData },
  );

  const data: FaceppResponse = await res.json();

  if (data.error_code) {
    return { success: false, message: data.error_message || 'Face detection failed.' };
  }

  if (data.face_num && data.face_num > 0) {
    return { success: true, message: 'Face verification successful!' };
  }

  return { success: false, message: 'No face detected or confidence too low. Please try again.' };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, provider } = body;

    if (!image || !image.startsWith('data:image/')) {
      return NextResponse.json(
        {
          success: false,
          data: {
            provider: provider || 'simulated',
            message: 'Invalid image format. Please upload a valid image.',
          },
        },
        { status: 400 },
      );
    }

    const base64Data = image.split(',')[1];
    if (!base64Data) {
      return NextResponse.json(
        {
          success: false,
          data: {
            provider: provider || 'simulated',
            message: 'Invalid image data.',
          },
        },
        { status: 400 },
      );
    }

    const useFacepp = !!process.env.FACEPP_API_KEY && !!process.env.FACEPP_API_SECRET;
    let isVerified: boolean;
    let message: string;

    if (useFacepp) {
      const result = await verifyWithFacepp(base64Data);
      isVerified = result.success;
      message = result.message;
    } else {
      // Fallback: accept any valid base64 image (length > 50)
      isVerified = base64Data.length > 50;
      message = isVerified ? 'Face verification successful!' : 'Face verification failed. Please try again.';
    }

    if (isVerified) {
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      if (token) {
        try {
          const { data: session } = await supabase.auth.getUser(token);
          const userId = session?.user?.id ?? null;
          if (userId) {
            const userSupabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              { global: { headers: { Authorization: `Bearer ${token}` } } },
            );
            await userSupabase
              .from('users')
              .update({
                face_verification_status: 'verified',
                face_verification_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', userId);
            await userSupabase
              .from('dropshipper_profiles')
              .update({
                face_verification_status: 'verified',
                face_verification_at: new Date().toISOString(),
              })
              .eq('id', userId);
          }
        } catch {
          // Verification succeeded; DB update failure is non-fatal.
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          status: 'verified',
          provider: useFacepp ? 'facepp' : 'simulated',
          message,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        data: {
          provider: useFacepp ? 'facepp' : 'simulated',
          message,
        },
      });
    }
  } catch (error) {
    console.error('Face verification error:', error);
    return NextResponse.json(
      {
        success: false,
        data: {
          provider: 'simulated',
          message: 'Verification failed. Please try again.',
        },
      },
      { status: 500 },
    );
  }
}