import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    let userId: string | null = null;

    if (token) {
      const { data: session } = await supabase.auth.getUser(token);
      userId = session?.user?.id ?? null;
    } else {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        userId = user.id;
      }
    }

    if (userId) {
      const userSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token ?? ''}` } } },
      );
      const { data } = await userSupabase
        .from('users')
        .select('face_verification_status, face_verification_at')
        .eq('id', userId)
        .single();

      return NextResponse.json({
        success: true,
        data: {
          face_verification_status: data?.face_verification_status ?? 'pending',
          face_verification_at: data?.face_verification_at ?? null,
        },
      });
    } else {
      return NextResponse.json({
        success: true,
        data: {
          face_verification_status: 'pending',
          face_verification_at: null,
        },
      });
    }
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        face_verification_status: 'pending',
        face_verification_at: null,
      },
    });
  }
}
