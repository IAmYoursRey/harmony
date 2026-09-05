import { useContext } from 'react';
import { SchoolContext } from '@/context/coreSchool';

export function useSchool() {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error('useSchool must be used within SchoolProvider');
  return ctx;
}
