import { createContext } from "react";
import type { School } from "@/data/schools";

export interface SchoolSelection {
  school: School;
  provinceName: string;
  regencyName: string;
}

export interface SchoolContextValue {
  selection: SchoolSelection | null;
  setSelection: (school: School) => void;
  clearSelection: () => void;
}

export const SchoolContext = createContext<SchoolContextValue | null>(null);
