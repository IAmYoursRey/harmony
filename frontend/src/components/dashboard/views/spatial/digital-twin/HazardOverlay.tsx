import { Hazard } from './types';

interface HazardOverlayProps {
  hazards: Hazard[];
}

export function HazardOverlay({ hazards }: HazardOverlayProps) {
  return (
    <g>
      {hazards.filter(h => h.active).map(hazard => {
        let fill = 'rgba(239, 68, 68, 0.3)'; // Fire (Red)
        let stroke = 'rgba(239, 68, 68, 0.8)';
        
        if (hazard.type === 'flood' || hazard.type === 'tsunami') {
          fill = 'rgba(59, 130, 246, 0.3)'; // Blue
          stroke = 'rgba(59, 130, 246, 0.8)';
        } else if (hazard.type === 'earthquake' || hazard.type === 'landslide') {
          fill = 'rgba(245, 158, 11, 0.3)'; // Amber/Orange
          stroke = 'rgba(245, 158, 11, 0.8)';
        }

        return (
          <g key={hazard.id}>
            <circle
              cx={hazard.x}
              cy={hazard.y}
              r={hazard.radius}
              fill={fill}
              stroke={stroke}
              strokeWidth="2"
              strokeDasharray="10,5"
              className="animate-[spin_10s_linear_infinite]"
              style={{ transformOrigin: `${hazard.x}px ${hazard.y}px` }}
            />
            {hazard.type === 'fire' && (
              <circle
                cx={hazard.x}
                cy={hazard.y}
                r={hazard.radius * 0.8}
                fill={fill}
                className="animate-pulse"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
