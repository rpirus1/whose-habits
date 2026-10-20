// Illustrations for the landing page: flat vector, coloured by the --art-* variables in
// lander.css so they follow light and dark. Decorative only (aria-hidden).
import { cn } from '@/lib/utils'

const v = (name: string) => `var(--art-${name})`

/** A four-point sparkle centred on (x, y). */
function Sparkle({
  x,
  y,
  s,
  fill = v('yellow'),
}: {
  x: number
  y: number
  s: number
  fill?: string
}) {
  return (
    <path
      d={`M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`}
      fill={fill}
    />
  )
}

/** Points on the string of lights: a quadratic curve from (10,22) via (180,70) to (350,22). */
const BULBS = Array.from({ length: 9 }, (_, i) => {
  const t = (i + 1) / 10
  const u = 1 - t
  return {
    x: 10 * u * u + 360 * u * t + 350 * t * t,
    y: 22 * u * u + 140 * u * t + 22 * t * t + 5,
    fill: [v('yellow'), 'var(--primary)', v('teal'), v('pink')][i % 4],
  }
})

type Hair = 'short' | 'long' | 'bun'
type Hands = 'phone' | 'cheer' | 'mug'

function Friend({
  cx,
  skin,
  hair,
  hairColor,
  shirt,
  hands,
}: {
  cx: number
  skin: string
  hair: Hair
  hairColor: string
  shirt: string
  hands: Hands
}) {
  const cap = `M${cx - 17} 151A17 17 0 0 1 ${cx + 17} 151Q${cx + 9} 139 ${cx - 2} 142Q${cx - 11} 143 ${cx - 17} 151Z`
  return (
    <g>
      {hair === 'long' && (
        <rect x={cx - 19} y={135} width={38} height={44} rx={17} fill={hairColor} />
      )}
      <rect x={cx - 23} y={168} width={46} height={52} rx={20} fill={shirt} />
      {hands === 'cheer' && (
        <>
          <path
            d={`M${cx + 16} 178Q${cx + 30} 166 ${cx + 30} 140`}
            stroke={shirt}
            strokeWidth={11}
            strokeLinecap="round"
            fill="none"
          />
          <circle cx={cx + 30} cy={136} r={6} fill={skin} />
        </>
      )}
      <circle cx={cx} cy={151} r={16} fill={skin} />
      <path d={cap} fill={hairColor} />
      {hair === 'bun' && <circle cx={cx + 2} cy={133} r={7} fill={hairColor} />}
      <circle cx={cx - 5} cy={152} r={1.7} fill={v('ink')} />
      <circle cx={cx + 5} cy={152} r={1.7} fill={v('ink')} />
      <path
        d={`M${cx - 5} 157.5q5 4 10 0`}
        stroke={v('ink')}
        strokeWidth={1.7}
        strokeLinecap="round"
        fill="none"
      />
      {hands === 'mug' ? (
        <>
          <rect x={cx - 4} y={182} width={15} height={15} rx={3} fill={v('teal')} />
          <path
            d={`M${cx + 11} 186a4 4 0 0 1 0 7`}
            stroke={v('teal')}
            strokeWidth={2.5}
            fill="none"
          />
          <path
            d={`M${cx} 178q2 -3 0 -6M${cx + 6} 178q2 -3 0 -6`}
            stroke={v('frame')}
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
            opacity={0.8}
          />
          <circle cx={cx - 6} cy={193} r={5} fill={skin} />
        </>
      ) : (
        <>
          <rect x={cx - 8} y={176} width={16} height={24} rx={3} fill={v('phone')} />
          <rect x={cx - 6} y={179} width={12} height={17} rx={2} fill={v('screen')} />
          <circle cx={cx - 9} cy={194} r={5} fill={skin} />
          {hands === 'phone' && <circle cx={cx + 9} cy={194} r={5} fill={skin} />}
        </>
      )}
    </g>
  )
}

/** The hero scene on phones: friends on a sofa on a cosy evening, one of them asking "?". */
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 280"
      aria-hidden
      focusable="false"
      className={cn('block h-auto w-full', className)}
    >
      <defs>
        <clipPath id="lander-room">
          <rect width="360" height="280" rx="28" />
        </clipPath>
        <radialGradient id="lander-glow">
          <stop offset="0" stopColor={v('glow')} stopOpacity="0.6" />
          <stop offset="1" stopColor={v('glow')} stopOpacity="0" />
        </radialGradient>
      </defs>
      <g clipPath="url(#lander-room)">
        <rect width="360" height="280" fill={v('wall')} />

        {/* Window with the night outside. */}
        <path d="M28 138V76a48 48 0 0 1 96 0v62Z" fill={v('night')} />
        <circle cx="102" cy="62" r="10" fill={v('moon')} />
        <circle cx="107" cy="58" r="9" fill={v('night')} />
        <circle cx="50" cy="66" r="1.6" fill={v('moon')} />
        <circle cx="66" cy="100" r="1.2" fill={v('moon')} />
        <circle cx="104" cy="112" r="1.4" fill={v('moon')} />
        <path
          d="M28 138V76a48 48 0 0 1 96 0v62ZM76 28v110M28 96h96"
          stroke={v('frame')}
          strokeWidth="5"
          fill="none"
        />

        {/* A picture on the wall. */}
        <rect x="150" y="62" width="50" height="38" rx="5" fill={v('frame')} />
        <rect x="154" y="66" width="42" height="30" rx="3" fill={v('picture')} />
        <path d="M154 96l12-12 9 8 8-10 13 14Z" fill={v('leaf-dark')} />
        <circle cx="186" cy="74" r="4" fill={v('yellow')} />

        {/* Lamp light. */}
        <circle cx="318" cy="104" r="96" fill="url(#lander-glow)" />

        {/* String of lights. */}
        <path d="M10 27Q180 75 350 27" stroke={v('cord')} strokeWidth="1.5" fill="none" />
        {BULBS.map((b, i) => (
          <g key={i}>
            <circle cx={b.x} cy={b.y + 4} r="7" fill={b.fill} opacity="0.25" />
            <circle cx={b.x} cy={b.y + 4} r="3.5" fill={b.fill} />
          </g>
        ))}

        {/* Floor lamp. */}
        <path d="M318 96v134" stroke={v('pole')} strokeWidth="3" />
        <ellipse cx="318" cy="231" rx="15" ry="4" fill={v('pole')} />
        <path d="M300 98h36l-8-28h-20Z" fill={v('lamp')} />

        <ellipse cx="180" cy="262" rx="156" ry="20" fill={v('rug')} />

        {/* Sofa back, friends, then the seat and arms in front of them. */}
        <rect x="66" y="146" width="228" height="66" rx="24" fill={v('sofa')} />
        <Friend
          cx={122}
          skin={v('skin-1')}
          hair="long"
          hairColor={v('hair-3')}
          shirt={v('shirt-2')}
          hands="phone"
        />
        <Friend
          cx={180}
          skin={v('skin-2')}
          hair="short"
          hairColor={v('hair-2')}
          shirt={v('shirt-1')}
          hands="cheer"
        />
        <Friend
          cx={238}
          skin={v('skin-3')}
          hair="bun"
          hairColor={v('hair-1')}
          shirt={v('shirt-3')}
          hands="mug"
        />
        <rect x="60" y="202" width="240" height="32" rx="14" fill={v('sofa-dark')} />
        <rect x="50" y="176" width="34" height="58" rx="16" fill={v('sofa')} />
        <rect x="276" y="176" width="34" height="58" rx="16" fill={v('sofa')} />
        <rect x="74" y="232" width="8" height="10" rx="2" fill={v('wood')} />
        <rect x="278" y="232" width="8" height="10" rx="2" fill={v('wood')} />

        {/* The question, in the logo's speech bubble. */}
        <g transform="translate(194 88) scale(0.095)">
          <path
            d="M168 112h176a64 64 0 0 1 64 64v128a64 64 0 0 1-64 64H236l-76 52 10-52a64 64 0 0 1-66-64V176a64 64 0 0 1 64-64z"
            fill="var(--primary)"
          />
          <path
            d="M210 196a46 46 0 1 1 72 38c-16 10-26 18-26 38v6"
            fill="none"
            stroke="#160704"
            strokeWidth="36"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="256" cy="324" r="21" fill="#160704" />
        </g>
        <Sparkle x={160} y={118} s={5} />
        <Sparkle x={262} y={122} s={4} fill={v('pink')} />
        <Sparkle x={96} y={124} s={3.5} fill={v('teal')} />

        {/* Coffee table with mugs and snacks. */}
        <rect x="112" y="244" width="136" height="10" rx="5" fill={v('wood')} />
        <rect x="124" y="252" width="6" height="18" rx="2" fill={v('wood')} />
        <rect x="230" y="252" width="6" height="18" rx="2" fill={v('wood')} />
        <rect x="132" y="231" width="12" height="13" rx="3" fill={v('pink')} />
        <rect x="150" y="233" width="11" height="11" rx="3" fill={v('yellow')} />
        <circle cx="206" cy="236" r="3.5" fill={v('yellow')} />
        <circle cx="213" cy="234" r="3.5" fill={v('pot')} />
        <circle cx="220" cy="236" r="3.5" fill={v('yellow')} />
        <path d="M198 238a17 8 0 0 0 30 0Z" fill={v('teal')} />

        {/* Plant. */}
        <ellipse cx="27" cy="196" rx="7" ry="19" transform="rotate(-24 27 196)" fill={v('leaf')} />
        <ellipse
          cx="44"
          cy="194"
          rx="7"
          ry="19"
          transform="rotate(24 44 194)"
          fill={v('leaf-dark')}
        />
        <ellipse cx="35.5" cy="186" rx="6.5" ry="21" fill={v('leaf')} />
        <path d="M18 212h35l-4 30H22Z" fill={v('pot')} />
      </g>
    </svg>
  )
}

/** Small illustrations for the three "How to play" steps. */
export function StepArt({ step, className }: { step: 0 | 1 | 2; className?: string }) {
  return (
    <svg
      viewBox="0 0 160 96"
      aria-hidden
      focusable="false"
      className={cn('block h-24 w-auto', className)}
    >
      {step === 0 && <HostArt />}
      {step === 1 && <JoinArt />}
      {step === 2 && <ScoreArt />}
    </svg>
  )
}

function Phone({
  x,
  y,
  w,
  h,
  tilt = 0,
  screen = v('paper'),
}: {
  x: number
  y: number
  w: number
  h: number
  tilt?: number
  screen?: string
}) {
  return (
    <g transform={`rotate(${tilt} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x} y={y} width={w} height={h} rx={w / 5} fill={v('phone')} />
      <rect x={x + 3} y={y + 5} width={w - 6} height={h - 10} rx={w / 8} fill={screen} />
    </g>
  )
}

/** Settings on a phone: countries (coloured dots), a rounds pill, a big start button. */
function HostArt() {
  const rows = [v('teal'), v('pink'), v('yellow')]
  return (
    <>
      <Phone x={56} y={6} w={48} h={84} />
      {rows.map((fill, i) => (
        <g key={i}>
          <circle cx={67} cy={22 + i * 13} r={4} fill={fill} />
          <rect
            x={74}
            y={20 + i * 13}
            width={20}
            height={4}
            rx={2}
            fill={v('cord')}
            opacity={0.35}
          />
        </g>
      ))}
      <rect x={63} y={60} width={34} height={8} rx={4} fill={v('sofa')} opacity={0.35} />
      <rect x={63} y={60} width={14} height={8} rx={4} fill={v('sofa')} />
      <rect x={63} y={73} width={34} height={9} rx={4.5} fill="var(--primary)" />
      <Sparkle x={36} y={30} s={6} />
      <Sparkle x={124} y={62} s={5} fill={v('pink')} />
      <Sparkle x={122} y={22} s={3.5} fill={v('teal')} />
    </>
  )
}

/** A QR code on the host's phone, two friends' phones joining from the sides. */
function JoinArt() {
  // A fixed 5×5 pattern that reads as "QR code" at this size.
  const cells = '1110101010111011010111011'
  return (
    <>
      <Phone x={14} y={30} w={30} h={52} tilt={-12} />
      <Phone x={116} y={30} w={30} h={52} tilt={12} />
      {/* QR codes stay dark on light, in both themes (like the lobby's). */}
      <Phone x={56} y={6} w={48} h={84} screen={v('screen')} />
      {[...cells].map((c, i) =>
        c === '1' ? (
          <rect
            key={i}
            x={64 + (i % 5) * 6.4}
            y={28 + Math.floor(i / 5) * 6.4}
            width={5.4}
            height={5.4}
            rx={1}
            fill={v('ink')}
          />
        ) : null,
      )}
      <path
        d="M44 40q8-14 18-14M116 40q-8-14-18-14"
        stroke={v('teal')}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray="1 6"
        fill="none"
      />
      <circle cx={29} cy={58} r={6} fill={v('pink')} />
      <circle cx={131} cy={58} r={6} fill={v('yellow')} />
    </>
  )
}

/** A podium with a cup on top and confetti. */
function ScoreArt() {
  const confetti: [number, number, string, number][] = [
    [30, 16, v('pink'), 20],
    [48, 30, v('teal'), -30],
    [114, 14, v('yellow'), 15],
    [128, 34, v('pink'), -20],
    [96, 8, v('teal'), 40],
    [62, 10, v('yellow'), -10],
  ]
  return (
    <>
      {confetti.map(([x, y, fill, r], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={7}
          height={3.5}
          rx={1}
          fill={fill}
          transform={`rotate(${r} ${x} ${y})`}
        />
      ))}
      <rect x={34} y={62} width={30} height={28} rx={4} fill={v('shirt-3')} />
      <rect x={65} y={48} width={30} height={42} rx={4} fill={v('sofa')} />
      <rect x={96} y={70} width={30} height={20} rx={4} fill={v('pink')} />
      <path d="M68 20h24v6a12 12 0 0 1-24 0Z" fill={v('yellow')} />
      <path
        d="M68 23h-5a5 5 0 0 0 5 7M92 23h5a5 5 0 0 1-5 7"
        stroke={v('yellow')}
        strokeWidth={2.5}
        fill="none"
      />
      <rect x={78} y={37} width={4} height={6} fill={v('yellow')} />
      <rect x={72} y={42} width={16} height={4} rx={2} fill={v('yellow')} />
      <Sparkle x={80} y={12} s={4} fill="var(--primary)" />
    </>
  )
}
