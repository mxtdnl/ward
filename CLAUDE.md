Target build is a single self-contained index.html, no dependencies, no build step
read ward-handoff-spec-v2.md in full before any change
never invent a coefficient outside PARAMS; never add a colour outside the tokens

# Build rules — these override any other instruction

- Read ward-handoff-spec-v2.md in full before making any change.
- Target: a single self-contained index.html. No frameworks,
  no npm packages, no build step, no internet requests.
- EVERY numeric constant goes in the PARAMS object at the top of
  the script, with a comment saying what it controls. If a number
  appears anywhere else in the code, that is a bug — fix it.
- Only the colours listed in the spec's token table may be used.
- Do not add features not described in the spec.
