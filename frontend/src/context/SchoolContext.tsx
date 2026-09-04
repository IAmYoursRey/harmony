import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { School } from '@/data/schools';

interface SchoolSelection {
  school: School;
  provinceName: string;
  regencyName: string;
}

interface SchoolContextValue {
  selection: SchoolSelection | null;
  setSelection: (school: School) => void;
  clearSelection: () => void;
}

const SchoolContext = createContext<SchoolContextValue | null>(null);

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

export function useSchool() {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error('useSchool must be used within SchoolProvider');
  return ctx;
}
