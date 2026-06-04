import { redirect } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user: { email: string; name: string } | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      redirect('/login');
    }
    const { data: admin } = await supabase
      .from('admins')
      .select('email, name')
      .eq('id', authUser.id)
      .maybeSingle();
    const adminRow = admin as { email: string; name: string } | null;
    user = {
      email: adminRow?.email ?? authUser.email ?? '',
      name: adminRow?.name ?? '관리자',
    };
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
