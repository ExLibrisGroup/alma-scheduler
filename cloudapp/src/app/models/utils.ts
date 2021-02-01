const formatTime = (min: number) => {
  if (min == 60) return '1 hour';
  else if (min % 60 == 0) return `${min/60} hours`;
  else return `${min} minutes`;
}

export { formatTime };