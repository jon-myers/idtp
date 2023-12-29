const getContrastingTextColor = (backgroundColor: string): string => {
  // Convert the background color to RGB
  const color = (backgroundColor.charAt(0) === '#') ? 
    backgroundColor.substring(1, 7) : 
    backgroundColor;
  const r = parseInt(color.substring(0, 2), 16); // Red
  const g = parseInt(color.substring(2, 4), 16); // Green
  const b = parseInt(color.substring(4, 6), 16); // Blue

  // Calculate the brightness of the background color
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // Return either black or white based on the brightness
  return (brightness > 155) ? 'black' : 'white';

}

const displayTime = (dur: number) => {
  const hours = Math.floor(dur / 3600);
  let minutes: number | string = Math.floor((dur - hours * 3600) / 60);
  let seconds: number | string = Math.round(dur % 60);
  if (seconds.toString().length === 1) seconds = '0' + seconds;
  if (hours !== 0) {
    if (minutes.toString().length === 1) minutes = '0' + minutes;
    return ([hours, minutes, seconds]).join(':')
  } else {
    return minutes + ':' + seconds 
  }
}


export { getContrastingTextColor, displayTime }