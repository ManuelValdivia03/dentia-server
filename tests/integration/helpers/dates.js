function futureUtcDay(daysFromNow, startHour = 12) {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + daysFromNow);
  start.setUTCHours(startHour, 0, 0, 0);

  const end = new Date(start);
  end.setUTCHours(startHour + 1);

  return {
    date: start.toISOString().slice(0, 10),
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  };
}

module.exports = {
  futureUtcDay,
};
