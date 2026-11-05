/** Fixed winter scene behind every page: night sky, aurora, pine hills and snowfall. */
export function WinterBackdrop() {
  return (
    <div className="winter-backdrop" aria-hidden>
      <div className="winter-snow winter-snow-slow" />
      <svg
        className="winter-hills"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          d="M0 170 L80 120 L160 165 L250 90 L340 160 L430 110 L520 170 L610 100 L700 160 L800 80 L900 150 L990 105 L1080 165 L1180 95 L1270 150 L1360 110 L1440 150 L1440 320 L0 320 Z"
          fill="oklch(0.2 0.045 250)"
        />
        <path
          d="M0 230 C 200 180, 380 250, 620 210 S 1050 170, 1240 215 S 1400 200, 1440 205 L1440 320 L0 320 Z"
          fill="oklch(0.33 0.035 240)"
        />
        <path
          d="M0 270 C 260 235, 520 290, 800 258 S 1250 240, 1440 262 L1440 320 L0 320 Z"
          fill="oklch(0.42 0.03 235)"
        />
      </svg>
      <div className="winter-snow" />
    </div>
  )
}
