const letterSounds = {
  A: new Audio('/sounds/A.wav'),
  Z: new Audio('/sounds/Z.wav'),
  T: new Audio('/sounds/T.wav'),
  E: new Audio('/sounds/E.wav'),
  C: new Audio('/sounds/C.wav'),
};

// Preload each sound individually
letterSounds.A.load();
letterSounds.Z.load();
letterSounds.T.load();
letterSounds.E.load();
letterSounds.C.load();

export function playLetterSound(letter) {
  const upper = letter.toUpperCase();
  if (letterSounds[upper]) {
    try {
      letterSounds[upper].currentTime = 0;
      letterSounds[upper].play();
    } catch (e) {
      console.warn(`Could not play sound for ${upper}:`, e);
    }
  }
}
