export interface FloorPlanElement {
  id: string;
  type: 'room' | 'door' | 'exit' | 'assembly';
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
}

export interface FloorPlanData {
  elements: FloorPlanElement[];
}
