// Wbudowana biblioteka utworów do relacji (pliki w public/story-music/).
export interface StoryTrack {
  id: string;
  title: string;
  mood: string;
  url: string;
}

export const STORY_TRACKS: StoryTrack[] = [
  { id: 'wesoly-spacer', title: 'Wesoły spacer', mood: 'energetyczny', url: '/story-music/wesoly-spacer.wav' },
  { id: 'kocia-drzemka', title: 'Kocia drzemka', mood: 'spokojny', url: '/story-music/kocia-drzemka.wav' },
  { id: 'zabawa-w-parku', title: 'Zabawa w parku', mood: 'radosny', url: '/story-music/zabawa-w-parku.wav' },
  { id: 'wieczorny-relaks', title: 'Wieczorny relaks', mood: 'ambient', url: '/story-music/wieczorny-relaks.wav' },
  { id: 'szczesliwy-ogon', title: 'Szczęśliwy ogon', mood: 'wesoły', url: '/story-music/szczesliwy-ogon.wav' },
  { id: 'spokojny-dzien', title: 'Spokojny dzień', mood: 'chill', url: '/story-music/spokojny-dzien.wav' },
];
