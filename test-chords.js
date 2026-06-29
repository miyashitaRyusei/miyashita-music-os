const midiData = { measureDuration: 2.0 };
const parsedChords = [
  { measure: 1, chords: [{ name: 'C#M7' }] },
  { measure: 2, chords: [{ name: 'C#M7' }] },
  { measure: 3, chords: [{ name: 'Cm7' }, { name: 'F7' }] },
  { measure: 4, chords: [{ name: 'A#m' }] }
];
const selectedRegion = { startTime: 0.0, endTime: 8.0 };
const firstNoteTimeSec = 0.5;
const secondsPerBeat = 0.5;

const chordsJson = [];
parsedChords.forEach((m, mIndex) => {
  const measureDurationSec = midiData.measureDuration || 2.0;
  const chordsInMeasure = m.chords.length;
  if (chordsInMeasure === 0) return;
  
  const timePerChordSec = measureDurationSec / chordsInMeasure;
  
  m.chords.forEach((chord, i) => {
    const chordTimeSec = (m.measure - 1) * measureDurationSec + i * timePerChordSec;
    const chordEndSec = chordTimeSec + timePerChordSec;
    
    if (chordEndSec > selectedRegion.startTime && chordTimeSec < selectedRegion.endTime) {
       chordsJson.push({
          name: chord.name, 
          start: (chordTimeSec - firstNoteTimeSec) / secondsPerBeat,
          duration: timePerChordSec / secondsPerBeat
       });
    }
  });
});
console.log(JSON.stringify(chordsJson, null, 2));
