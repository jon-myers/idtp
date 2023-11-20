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

export { displayTime }