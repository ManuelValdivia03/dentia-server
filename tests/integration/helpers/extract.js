function extractAppointmentId(body) {
  if (!body) return null;

  return (
    body.id ||
    body.appointmentId ||
    body.data?.id ||
    body.data?.appointmentId ||
    body.appointment?.id ||
    body.appointment?.appointmentId ||
    null
  );
}

function extractList(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.appointments)) return body.appointments;

  return [];
}

module.exports = {
  extractAppointmentId,
  extractList,
};