/** Little pictures shown inside special reward nametags. */

/** A campfire beside a snowy log cabin, with a dog sitting on the cabin's deck. */
export function CabinCampfireScene() {
  return (
    <span className="nametag-scene" aria-hidden>
      <img
        src="/nametags/cabin-campfire-scene.webp"
        alt=""
        width={260}
        height={160}
        loading="lazy"
        draggable={false}
      />
      <span className="scene-glow" />
    </span>
  )
}
