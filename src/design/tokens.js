const freeze = Object.freeze;

export const fontFamilies = freeze({
  editorial: freeze({
    regular: "InstrumentSerif-Regular",
    italic: "InstrumentSerif-Italic",
  }),
  interface: freeze({
    regular: "InstrumentSans-Regular",
    medium: "InstrumentSans-Medium",
    semibold: "InstrumentSans-SemiBold",
    bold: "InstrumentSans-Bold",
  }),
  commerce: freeze({
    medium: "GeistMono-Medium",
    semibold: "GeistMono-SemiBold",
    bold: "GeistMono-Bold",
  }),
});

const sharedActionColors = freeze({
  personalInk: "#151412",
  cobaltInk: "#151412",
  darkStatusInk: "#151412",
  genieAction: "#4056F4",
  keepAction: "#15865F",
});

export const color = freeze({
  light: freeze({
    ink: "#151412",
    inkSoft: "#2B2925",
    canvas: "#F4F0E8",
    paper: "#FFFDFC",
    paperRaised: "#FFFFFF",
    stone: "#706B63",
    stoneSoft: "#9B958B",
    line: "#DDD6CA",
    lineSoft: "#EBE5DC",
    controlLine: "#8D877E",
    pulse: "#FF5A45",
    cobalt: "#4056F4",
    personal: "#EFFF72",
    keep: "#168760",
    pass: "#C8463D",
    warning: "#B66B00",
    info: "#315FDA",
    ...sharedActionColors,
  }),
  dark: freeze({
    ink: "#F8F5EE",
    inkSoft: "#E8E3D8",
    canvas: "#11110F",
    paper: "#1A1916",
    paperRaised: "#211F1B",
    stone: "#AAA49A",
    stoneSoft: "#7F7A72",
    line: "#3A3730",
    lineSoft: "#2B2924",
    controlLine: "#706B63",
    pulse: "#FF7563",
    cobalt: "#7384FF",
    personal: "#DDF55D",
    keep: "#42B98C",
    pass: "#EF756C",
    warning: "#E9A84E",
    info: "#7B9CFF",
    ...sharedActionColors,
  }),
  onImage: "#FFFDFC",
  onImageMuted: "rgba(255,253,252,0.74)",
  onImageQuiet: "rgba(255,253,252,0.56)",
  imageScrimTop: "rgba(0,0,0,0.66)",
  imageScrimStrong: "rgba(0,0,0,0.84)",
  imageScrimSoft: "rgba(0,0,0,0.18)",
});

export const spacing = freeze({
  "2xs": 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
});

export const radius = freeze({
  signal: 3,
  control: 8,
  card: 16,
  sheet: 24,
  media: 40,
  pill: 999,
});

export const touchTarget = freeze({
  minimum: 44,
  primary: 48,
});

export const motion = freeze({
  micro: 80,
  nextCard: 200,
  swipeFast: 200,
  swipeSlow: 380,
  sheet: 320,
});

export const elevation = freeze({
  light: freeze({
    none: freeze({ shadowOpacity: 0, elevation: 0 }),
    editorial: freeze({
      shadowColor: "#342C20",
      shadowOffset: freeze({ width: 0, height: 28 }),
      shadowOpacity: 0.14,
      shadowRadius: 40,
      elevation: 8,
    }),
  }),
  dark: freeze({
    none: freeze({ shadowOpacity: 0, elevation: 0 }),
    editorial: freeze({
      shadowColor: "#000000",
      shadowOffset: freeze({ width: 0, height: 28 }),
      shadowOpacity: 0.3,
      shadowRadius: 40,
      elevation: 8,
    }),
  }),
});

export const type = freeze({
  micro: freeze({
    fontFamily: fontFamilies.commerce.medium,
    fontSize: 10,
    lineHeight: 13,
    fontVariant: freeze(["tabular-nums"]),
  }),
  label: freeze({
    fontFamily: fontFamilies.interface.semibold,
    fontSize: 11,
    lineHeight: 14,
  }),
  caption: freeze({
    fontFamily: fontFamilies.interface.medium,
    fontSize: 12,
    lineHeight: 17,
  }),
  captionStrong: freeze({
    fontFamily: fontFamilies.interface.bold,
    fontSize: 12,
    lineHeight: 17,
  }),
  body: freeze({
    fontFamily: fontFamilies.interface.regular,
    fontSize: 15,
    lineHeight: 21,
  }),
  bodyLarge: freeze({
    fontFamily: fontFamilies.interface.regular,
    fontSize: 17,
    lineHeight: 24,
  }),
  bodyLargeStrong: freeze({
    fontFamily: fontFamilies.interface.semibold,
    fontSize: 17,
    lineHeight: 24,
  }),
  price: freeze({
    fontFamily: fontFamilies.commerce.bold,
    fontSize: 15,
    lineHeight: 19,
    fontVariant: freeze(["tabular-nums"]),
  }),
  priceLarge: freeze({
    fontFamily: fontFamilies.commerce.bold,
    fontSize: 18,
    lineHeight: 22,
    fontVariant: freeze(["tabular-nums"]),
  }),
  titleSmall: freeze({
    fontFamily: fontFamilies.editorial.regular,
    fontSize: 24,
    lineHeight: 25,
  }),
  product: freeze({
    fontFamily: fontFamilies.editorial.regular,
    fontSize: 32,
    lineHeight: 31,
  }),
  display: freeze({
    fontFamily: fontFamilies.editorial.regular,
    fontSize: 44,
    lineHeight: 42,
  }),
});

export const editorialPulse = freeze({
  light: freeze({
    color: color.light,
    elevation: elevation.light,
  }),
  dark: freeze({
    color: color.dark,
    elevation: elevation.dark,
  }),
});

export function getEditorialPulseTheme(appearance) {
  return appearance === "dark" ? editorialPulse.dark : editorialPulse.light;
}
