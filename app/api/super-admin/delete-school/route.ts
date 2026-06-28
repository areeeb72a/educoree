import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { schoolId } = await req.json()
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 })
    }

    // 1. Fetch all profiles associated with the school
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('school_id', schoolId)

    if (profilesError) {
      return NextResponse.json({ error: 'Failed to fetch school profiles: ' + profilesError.message }, { status: 400 })
    }

    // 2. Delete all Auth Users associated with these profiles
    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(profile.id)
        } catch (err) {
          console.error(`Failed to delete auth user ${profile.id}:`, err)
        }
      }
    }

    // 3. Delete from students
    await supabaseAdmin
      .from('students')
      .delete()
      .eq('school_id', schoolId)

    // 4. Delete from profiles
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('school_id', schoolId)

    // 5. Delete from branches
    await supabaseAdmin
      .from('branches')
      .delete()
      .eq('school_id', schoolId)

    // 6. Finally, delete the school
    const { error: deleteSchoolError } = await supabaseAdmin
      .from('schools')
      .delete()
      .eq('id', schoolId)

    if (deleteSchoolError) {
      return NextResponse.json({ error: 'Failed to delete school: ' + deleteSchoolError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error occurred' }, { status: 500 })
  }
}
