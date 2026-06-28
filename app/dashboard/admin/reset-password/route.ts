import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, newPassword } = body

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'User ID aur password zaroori hain' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password kam az kam 6 characters ka ho' }, { status: 400 })
    }

    // Update the auth password
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    })
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Force must_change_password flag
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', userId)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 })
  }
}
