import { fetchFacilities } from '@/lib/facilities-server';
import FacilitiesClient from './FacilitiesClient';

export default async function FacilitiesPage() {
  const { facilities, source } = await fetchFacilities();
  return <FacilitiesClient initial={facilities} source={source} />;
}
