function extractPrescriptionId(body) {
  if (!body) return null;

  return (
    body.id ||
    body.prescriptionId ||
    body.data?.id ||
    body.data?.prescriptionId ||
    body.prescription?.id ||
    body.prescription?.prescriptionId ||
    null
  );
}

module.exports = {
  extractPrescriptionId,
};