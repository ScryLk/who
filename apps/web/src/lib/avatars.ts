export interface AvatarPreset {
  id: string;
  name: string;
  url: string;
  category: 'robots' | 'party' | 'djs' | 'monsters';
}

export const AVATAR_LIBRARY: AvatarPreset[] = [
  // Party Pop
  {
    id: 'party-1',
    name: 'DJ Sparkle',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Sparkle&backgroundColor=facc15',
    category: 'party',
  },
  {
    id: 'party-2',
    name: 'Party Rocker',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Rocker&backgroundColor=ec4899',
    category: 'party',
  },
  {
    id: 'party-3',
    name: 'Groove Master',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Groove&backgroundColor=3b82f6',
    category: 'party',
  },
  {
    id: 'party-4',
    name: 'Disco Queen',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Disco&backgroundColor=a855f7',
    category: 'party',
  },
  {
    id: 'party-5',
    name: 'Funky Beats',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Funky&backgroundColor=10b981',
    category: 'party',
  },
  {
    id: 'party-6',
    name: 'Melody Star',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Melody&backgroundColor=f97316',
    category: 'party',
  },
  {
    id: 'party-7',
    name: 'Beat Pop',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=BeatPop&backgroundColor=06b6d4',
    category: 'party',
  },
  {
    id: 'party-8',
    name: 'Vibe Smile',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=VibeSmile&backgroundColor=8b5cf6',
    category: 'party',
  },

  // DJ Robots
  {
    id: 'robot-1',
    name: 'Cyber Beats',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberBeats&backgroundColor=06b6d4',
    category: 'robots',
  },
  {
    id: 'robot-2',
    name: 'Synth Bot',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=SynthBot&backgroundColor=8b5cf6',
    category: 'robots',
  },
  {
    id: 'robot-3',
    name: 'Bass Bot',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=BassBot&backgroundColor=eab308',
    category: 'robots',
  },
  {
    id: 'robot-4',
    name: 'Techno Droid',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=TechnoDroid&backgroundColor=ec4899',
    category: 'robots',
  },
  {
    id: 'robot-5',
    name: 'Glitch Bot',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=GlitchBot&backgroundColor=f97316',
    category: 'robots',
  },
  {
    id: 'robot-6',
    name: 'Pixel DJ',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=PixelDJ&backgroundColor=10b981',
    category: 'robots',
  },

  // Vibe Stars & Adventurers
  {
    id: 'dj-1',
    name: 'Vibe Star',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=VibeStar&backgroundColor=8b5cf6',
    category: 'djs',
  },
  {
    id: 'dj-2',
    name: 'Neon Legend',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=NeonLegend&backgroundColor=ec4899',
    category: 'djs',
  },
  {
    id: 'dj-3',
    name: 'Acoustic Soul',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AcousticSoul&backgroundColor=06b6d4',
    category: 'djs',
  },
  {
    id: 'dj-4',
    name: 'Rockstar Ace',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=RockstarAce&backgroundColor=eab308',
    category: 'djs',
  },
  {
    id: 'dj-5',
    name: 'Pop Diva',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=PopDiva&backgroundColor=a855f7',
    category: 'djs',
  },
  {
    id: 'dj-6',
    name: 'Electro Dude',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ElectroDude&backgroundColor=3b82f6',
    category: 'djs',
  },
];
