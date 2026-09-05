import { useState, useCallback, type ReactNode } from 'react';
import type { School } from '@/data/schools';
import { SchoolContext, type SchoolSelection } from './coreSchool';

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [selection, setSel] = useState<SchoolSelection | null>(null);

  const setSelection = useCallback((school: School) => {
    setSel({
      school,
      provinceName: school.province || '',
      regencyName: school.regency || '',
    });
  }, []);

  const clearSelection = useCallback(() => setSel(null), []);

  return (
    <SchoolContext.Provider value={{ selection, setSelection, clearSelection }}>
      {children}
    </SchoolContext.Provider>
  );
}

