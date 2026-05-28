import { fetchMembers } from '@/lib/members-server';
import { fetchFacilities } from '@/lib/facilities-server';
import MembersClient from './MembersClient';

export default async function MembersPage() {
  const [{ members, source }, { facilities }] = await Promise.all([
    fetchMembers(),
    fetchFacilities(),
  ]);
  return <MembersClient initial={members} source={source} facilities={facilities} />;
}
