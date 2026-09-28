import { StyleId } from '../game/chartGen';
import { Chart, Difficulty } from '../game/types';

export interface Song {
  id: string;
  title: string;
  artist: string;
  genre: string;
  /** Andamento aproximado — confirmar com a gravação licenciada. */
  bpm: number;
  /** Estilo da levada usada no chart provisório. */
  style: StyleId;
  unlockLevel: number;
  /**
   * Áudio licenciado (instrumental/playback sem bateria, ou a faixa completa), via require().
   * Enquanto for null, o jogo toca apenas a contagem de baquetas e a faixa-guia da bateria.
   * Ex.: backingTrack: require('../../assets/songs/in-the-end.m4a')
   */
  backingTrack: number | null;
  /** Segundos entre o início do áudio licenciado e o primeiro tempo do chart. */
  audioOffset?: number;
  /** Charts oficiais por dificuldade; substituem o chart provisório quando existirem. */
  charts?: Partial<Record<Difficulty, Chart>>;
}

type SongSeed = [id: string, title: string, artist: string, genre: string, bpm: number, style: StyleId, unlockLevel: number];

const SEEDS: SongSeed[] = [
  // Nível 1
  ['we-will-rock-you', 'We Will Rock You', 'Queen', 'Rock Clássico', 81, 'stomp', 1],
  ['seven-nation-army', 'Seven Nation Army', 'The White Stripes', 'Rock Alternativo', 124, 'rock8', 1],
  ['knockin-on-heavens-door', "Knockin' on Heaven's Door", "Guns N' Roses", 'Hard Rock', 68, 'ballad', 1],
  ['otherside', 'Otherside', 'Red Hot Chili Peppers', 'Rock Alternativo', 123, 'rock8', 1],
  // Nível 2
  ['in-the-end', 'In the End', 'Linkin Park', 'Nu Metal', 105, 'nu', 2],
  ['californication', 'Californication', 'Red Hot Chili Peppers', 'Rock Alternativo', 96, 'rock8', 2],
  ['with-arms-wide-open', 'With Arms Wide Open', 'Creed', 'Pós-Grunge', 70, 'ballad', 2],
  ['boulevard-of-broken-dreams', 'Boulevard of Broken Dreams', 'Green Day', 'Rock Alternativo', 83, 'ballad', 2],
  // Nível 3
  ['numb', 'Numb', 'Linkin Park', 'Nu Metal', 110, 'nu', 3],
  ['sweet-child-o-mine', "Sweet Child O' Mine", "Guns N' Roses", 'Hard Rock', 125, 'rock8', 3],
  ['the-kill', 'The Kill (Bury Me)', 'Thirty Seconds to Mars', 'Rock Alternativo', 92, 'halftime', 3],
  ['one-last-breath', 'One Last Breath', 'Creed', 'Pós-Grunge', 64, 'ballad', 3],
  ['smells-like-teen-spirit', 'Smells Like Teen Spirit', 'Nirvana', 'Grunge', 117, 'rock8', 3],
  ['back-in-black', 'Back in Black', 'AC/DC', 'Hard Rock', 94, 'rock8', 3],
  // Nível 4
  ['one-step-closer', 'One Step Closer', 'Linkin Park', 'Nu Metal', 95, 'nu', 4],
  ['cant-stop', "Can't Stop", 'Red Hot Chili Peppers', 'Funk Rock', 91, 'funk', 4],
  ['kings-and-queens', 'Kings and Queens', 'Thirty Seconds to Mars', 'Rock Alternativo', 84, 'tribal', 4],
  ['bring-me-to-life', 'Bring Me to Life', 'Evanescence', 'Nu Metal', 95, 'nu', 4],
  ['like-a-stone', 'Like a Stone', 'Audioslave', 'Hard Rock', 108, 'rock8', 4],
  // Nível 5
  ['enter-sandman', 'Enter Sandman', 'Metallica', 'Heavy Metal', 123, 'rock8', 5],
  ['welcome-to-the-jungle', 'Welcome to the Jungle', "Guns N' Roses", 'Hard Rock', 124, 'rock16', 5],
  ['faint', 'Faint', 'Linkin Park', 'Nu Metal', 135, 'rock16', 5],
  ['my-sacrifice', 'My Sacrifice', 'Creed', 'Pós-Grunge', 146, 'halftime', 5],
  ['from-yesterday', 'From Yesterday', 'Thirty Seconds to Mars', 'Rock Alternativo', 150, 'halftime', 5],
  ['last-resort', 'Last Resort', 'Papa Roach', 'Nu Metal', 91, 'nu', 5],
  // Nível 6
  ['toxicity', 'Toxicity', 'System of a Down', 'Metal Alternativo', 117, 'rock16', 6],
  ['chop-suey', 'Chop Suey!', 'System of a Down', 'Metal Alternativo', 127, 'thrash', 6],
  ['paradise-city', 'Paradise City', "Guns N' Roses", 'Hard Rock', 100, 'rock8', 6],
  ['give-it-away', 'Give It Away', 'Red Hot Chili Peppers', 'Funk Rock', 92, 'funk', 6],
  ['everlong', 'Everlong', 'Foo Fighters', 'Rock Alternativo', 158, 'punk', 6],
  ['hysteria', 'Hysteria', 'Muse', 'Rock Alternativo', 94, 'rock16', 6],
  // Nível 7
  ['sad-but-true', 'Sad but True', 'Metallica', 'Heavy Metal', 88, 'rock8', 7],
  ['what-ive-done', "What I've Done", 'Linkin Park', 'Nu Metal', 120, 'rock8', 7],
  ['aerials', 'Aerials', 'System of a Down', 'Metal Alternativo', 90, 'halftime', 7],
  ['killing-in-the-name', 'Killing in the Name', 'Rage Against the Machine', 'Rap Metal', 88, 'funk', 7],
  // Nível 8
  ['by-the-way', 'By the Way', 'Red Hot Chili Peppers', 'Funk Rock', 122, 'rock16', 8],
  ['this-is-war', 'This Is War', 'Thirty Seconds to Mars', 'Rock Alternativo', 90, 'tribal', 8],
  ['down-with-the-sickness', 'Down with the Sickness', 'Disturbed', 'Nu Metal', 90, 'tribal', 8],
  // Nível 9+
  ['duality', 'Duality', 'Slipknot', 'Nu Metal', 145, 'doublebass', 9],
  ['byob', 'B.Y.O.B.', 'System of a Down', 'Metal Alternativo', 200, 'thrash', 10],
  ['one', 'One', 'Metallica', 'Heavy Metal', 108, 'doublebass', 11],
  ['master-of-puppets', 'Master of Puppets', 'Metallica', 'Thrash Metal', 212, 'thrash', 12],
];

/**
 * Áudio e charts licenciados. Preencha conforme as licenças forem obtidas, por exemplo:
 *   'in-the-end': { backingTrack: require('../../assets/songs/in-the-end.m4a'), audioOffset: 0.42 },
 */
const LICENSED: Record<string, Partial<Pick<Song, 'backingTrack' | 'audioOffset' | 'charts' | 'bpm'>>> = {};

export const SONGS: Song[] = SEEDS.map(([id, title, artist, genre, bpm, style, unlockLevel]) => ({
  id,
  title,
  artist,
  genre,
  bpm,
  style,
  unlockLevel,
  backingTrack: null,
  ...LICENSED[id],
}));

export function getSong(id: string): Song | undefined {
  return SONGS.find((s) => s.id === id);
}
