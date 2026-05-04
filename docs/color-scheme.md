# Chef Color Scheme

Chef should feel warm, playful, food-forward, and easy to trust. The core visual direction is citrus orange with cool teal support: bright enough to feel energetic, but softened with cream and pale blue so the product does not become loud or childish.

## Palette

| Token | Hex | Use |
| --- | --- | --- |
| `chef.orange` | `#F4790D` | Primary brand color, main calls to action, splash accents, selected states. |
| `chef.orangeBright` | `#FE8E17` | Highlights, illustrations, pressed states, small decorative moments. |
| `chef.honey` | `#F4BE6B` | Secondary warmth, chips, empty states, gentle badges, food illustration accents. |
| `chef.teal` | `#3C9A9E` | Navigation accents, progress, informational states, contrast against orange. |
| `chef.tealSoft` | `#C0DEDF` | Background shapes, soft panels, inactive progress, low-emphasis surfaces. |
| `chef.cream` | `#FFFDFA` | Main app background and splash background. |
| `chef.ink` | `#17120F` | Primary text and high-contrast icons. |
| `chef.muted` | `#75685F` | Secondary text and supporting copy. |

## Usage

Use orange as the brand signal, not the entire interface. The app should usually sit on cream or white surfaces, with orange reserved for the most important action on the screen.

Use teal to balance the warmth. It works best for progress indicators, recipe/category accents, chart-like UI, and decorative background shapes. Avoid using teal and orange at equal strength in the same control; one should lead and the other should support.

Use honey for softer emphasis. It is better for friendly badges, helper bubbles, and illustration details than for primary buttons.

## Recommended Mapping

Primary button:

```text
background: #F4790D
text: #FFFFFF
pressed/active: #FE8E17
```

Secondary button or selected chip:

```text
background: #FFF2E6
border: #FE8E17
text: #17120F
```

Info/progress:

```text
active: #3C9A9E
inactive: #C0DEDF
```

App background:

```text
background: #FFFDFA
surface: #FFFFFF
border: #EADBD2
```

## Accessibility

Do not place white text on `#F4BE6B` or `#C0DEDF`; contrast is too soft for important UI. Prefer `#17120F` on those colors.

Use white text only on the stronger orange and teal colors. For long text, use cream or white backgrounds with ink text.

## Product Feel

The palette should support a Chef experience that feels:

- buttery and smooth
- practical for meal planning and shopping
- warm without becoming beige
- playful without becoming toy-like
- appetizing without relying only on orange

The reference image uses orange as the appetite cue and teal as the cooling counterweight. That relationship should stay consistent across splash screens, onboarding, recipe browsing, and cart-building flows.
