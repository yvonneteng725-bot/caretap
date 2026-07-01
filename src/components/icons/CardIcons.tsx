// Medications — vertical capsule, top half tinted
export const MedicationsIcon = ({ color }: { color: string }) => (
  <svg width="42" height="82" viewBox="-21 -41 42 82" fill="none">
    <rect x="-13.5" y="-38" width="27" height="76" rx="13.5" stroke={color} strokeWidth="1.6" />
    <path
      d="M-13.5,0 L-13.5,-24.5 Q-13.5,-38 0,-38 Q13.5,-38 13.5,-24.5 L13.5,0 Z"
      fill={color}
      opacity="0.20"
    />
    <line x1="-13.5" y1="0" x2="13.5" y2="0" stroke={color} strokeWidth="1.3" opacity="0.65" />
  </svg>
)

// Blood Pressure — heart outline with ECG line
export const BloodPressureIcon = ({ color }: { color: string }) => (
  <svg width="82" height="78" viewBox="-41 -41 82 78" fill="none">
    <path
      d="M0,30 C-32,12 -38,-12 -21,-24 C-8,-32 0,-21 0,-14 C0,-21 8,-32 21,-24 C38,-12 32,12 0,30 Z"
      stroke={color}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <polyline
      points="-20,1 -10,1 -6,-12 -2.5,20 2.5,5 6,0 20,0"
      stroke={color}
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// Body Temperature — thermometer with mercury bulb
export const TemperatureIcon = ({ color }: { color: string }) => (
  <svg width="46" height="96" viewBox="-23 -50 46 100" fill="none">
    <rect x="-7" y="-46" width="14" height="56" rx="7" stroke={color} strokeWidth="1.6" />
    <rect x="-3.5" y="-16" width="7" height="26" rx="3.5" fill={color} opacity="0.22" />
    <circle cx="0" cy="22" r="12" stroke={color} strokeWidth="1.6" />
    <circle cx="0" cy="22" r="6.5" fill={color} opacity="0.28" />
    <line x1="7" y1="-30" x2="14" y2="-30" stroke={color} strokeWidth="1" />
    <line x1="7" y1="-20" x2="11" y2="-20" stroke={color} strokeWidth="1" />
    <line x1="7" y1="-10" x2="14" y2="-10" stroke={color} strokeWidth="1" />
  </svg>
)

// Blood Sugar — water drop with horizontal dash inside
export const BloodSugarIcon = ({ color }: { color: string }) => (
  <svg width="52" height="80" viewBox="-26 -42 52 82" fill="none">
    <path
      d="M0,-38 C10,-20 22,5 22,15 C22,27 12,37 0,37 C-12,37 -22,27 -22,15 C-22,5 -10,-20 0,-38 Z"
      stroke={color}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <line x1="-9" y1="13" x2="9" y2="13" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

// Wound Care — bandage rotated -30 degrees
export const WoundCareIcon = ({ color }: { color: string }) => (
  <svg width="86" height="80" viewBox="-43 -42 86 80" fill="none">
    <g transform="rotate(-30)">
      <rect x="-33" y="-14" width="66" height="28" rx="14" stroke={color} strokeWidth="1.6" />
      <rect x="-12" y="-8.5" width="24" height="17" rx="2.5" stroke={color} strokeWidth="1.3" />
      <circle cx="-3.5" cy="-2" r="1.8" fill={color} opacity="0.45" />
      <circle cx="3.5" cy="4" r="1.8" fill={color} opacity="0.45" />
    </g>
  </svg>
)

// Meal Log — fork and spoon
export const MealLogIcon = ({ color }: { color: string }) => (
  <svg width="54" height="82" viewBox="-27 -43 54 82" fill="none">
    <line x1="-13" y1="-39" x2="-13" y2="35" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    <line x1="-19" y1="-39" x2="-19" y2="-19" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    <line x1="-7" y1="-39" x2="-7" y2="-19" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M-19,-19 Q-13,-8 -7,-19" fill="none" stroke={color} strokeWidth="1.4" />
    <ellipse cx="13" cy="-25" rx="9" ry="13" stroke={color} strokeWidth="1.6" />
    <line x1="13" y1="-12" x2="13" y2="35" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)
