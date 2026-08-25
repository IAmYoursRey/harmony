import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { School } from '@/data/schools';
import { getProvinceName, getRegencyName } from '@/data/schools';

interface SchoolSelection {
  school: School;
  provinceName: string;
  regencyName: string;
}

interface SchoolContextValue {
  selection: SchoolSelection | null;
  setSelection: (school: School, provinceId: string, regencyId: string) => void;
  clearSelection: () => void;
}

const SchoolContext = createContext<SchoolContextValue | null>(null);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [selection, setSel] = useState<SchoolSelection | null>(null);

  const setSelection = useCallback((school: School, provinceId: string, regencyId: string) => {
    setSel({
      school,
      provinceName: getProvinceName(provinceId),
      regencyName: getRegencyName(provinceId, regencyId),
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
