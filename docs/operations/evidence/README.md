# Operational Evidence

Store concise, no-secret verification summaries under
`YYYY-MM-DD/<provider>/`. Keep raw provider logs in the provider, and never
copy credentials, authorization headers, cookies, signed URLs, private payloads,
or database connection strings here.

Each summary should record the UTC timestamp, affected repository commit,
provider resource name or non-secret identifier, commands or checks performed,
result, rollback state, and remaining approval gate.
