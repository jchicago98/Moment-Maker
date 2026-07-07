// Moment Maker design language — see CLAUDE.md §3. Do not drift from this.

export const ink = '#2C2C2A';
export const canvas = '#FDF6EC';

export interface CandyColor {
  fill: string;
  border: string;
  text: string;
}

export const candy: Record<string, CandyColor> = {
  teal: { fill: '#9FE1CB', border: '#085041', text: '#04342C' },
  coral: { fill: '#F5C4B3', border: '#712B13', text: '#4A1B0C' },
  purple: { fill: '#CECBF6', border: '#3C3489', text: '#26215C' },
  amber: { fill: '#FAC775', border: '#854F0B', text: '#4A2C05' },
  pink: { fill: '#F4C0D1', border: '#72243E', text: '#4A1226' },
};

export const candyOrder: CandyColor[] = [
  candy.teal,
  candy.coral,
  candy.purple,
  candy.amber,
  candy.pink,
];

export const accent = '#D85A30'; // primary accent (coral family)

export const borders = {
  width: 3,
  radius: 20,
  radiusSmall: 16,
} as const;

export const cardTilt = 4; // degrees, never exceed 5
