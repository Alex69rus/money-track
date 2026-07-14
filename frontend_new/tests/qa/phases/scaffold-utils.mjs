export function pass(evidence) {
  return { pass: true, evidence };
}

export function fail(evidence) {
  return { pass: false, evidence };
}

export function todo(frId, assertionHint) {
  return fail(`[TODO][${frId}] ${assertionHint}`);
}

export function todoMatrix(frIds, todoHintsByFrId) {
  return Object.fromEntries(
    frIds.map((frId) => [frId, todo(frId, todoHintsByFrId[frId] ?? "Add phase assertion.")]),
  );
}
