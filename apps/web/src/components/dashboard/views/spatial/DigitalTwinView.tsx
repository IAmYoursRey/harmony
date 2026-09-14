import React, { useMemo } from "react";
import { useSchool } from "@/hooks/useSchool";
import { Phase1Workspace } from "./digital-twin/Phase1Workspace";

export function DigitalTwinView() {
  const { selection } = useSchool();
  const activeSchool = useMemo(() => selection?.school || null, [selection]);

  return (
    <div className="max-w-7xl mx-auto">
      <Phase1Workspace />
    </div>
  );
}
