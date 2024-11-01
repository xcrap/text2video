import type { NextFont } from 'next/dist/compiled/@next/font';
import { Roboto } from 'next/font/google';

// Default font as fallback
export const defaultFont = Roboto({ 
  weight: ['400', '700'], 
  subsets: ['latin'],
  display: 'swap',
});

export const POPULAR_FONTS = [
  "Roboto",
  "Inter",
  "Montserrat",
  "Open Sans",
  "Poppins"
] as const;

type FontName = typeof POPULAR_FONTS[number];

const fontCache = new Map<FontName, NextFont>();

// Map of font URLs for loading with all weights and styles
const FONT_URLS = {
  "Roboto": "https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap",
  "Inter": "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap",
  "Montserrat": "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap",
  "Open Sans": "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap",
  "Poppins": "https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap"
};

// Simple font loader that just adds stylesheet
export function initializeFonts() {
  for (const fontName of POPULAR_FONTS) {
    const existingLink = document.querySelector(`link[href="${FONT_URLS[fontName]}"]`);
    if (!existingLink) {
      const link = document.createElement('link');
      link.href = FONT_URLS[fontName];
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  }
}

export function loadFont(fontName: FontName): NextFont {
    if (fontName === "Roboto") {
      return defaultFont;
    }
  
    const cachedFont = fontCache.get(fontName);
    if (cachedFont) {
      return cachedFont;
    }
  
    const font: NextFont = {
      className: fontName.toLowerCase().replace(/\s+/g, '-'),
      style: { fontFamily: fontName },
    };
  
    fontCache.set(fontName, font);
    return font;
  }