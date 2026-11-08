---
name: share-feedback
description: Use when a QA Vault tool failed or behaved wrongly, when the person is confused or frustrated by QA Vault (the platform, its MCP tools, the web dashboard, how it wants work done), asks why QA Vault did something or works the way it does, wants something QA Vault cannot do, or is genuinely pleased with it — and when they say "send feedback to QA Vault", "tell the QA Vault team", "I want to leave feedback". Offers once, after helping, to send the QA Vault team short feedback, and sends it only on the person's yes, in your own words, with nothing secret, personal, coded or linked in it. Not for feedback about the agent app you run in (that goes to its vendor) and not for defects in the person's own product (record those as defects in their QA Vault project with create_defect).
---

# Share Feedback with the QA Vault Team

Without the QA Vault MCP server connected this skill does nothing. When the `send_feedback` tool is missing: if the person asked to send feedback, say in one line that it is not available in this connection; otherwise say nothing and carry on.

The feedback goes to the **QA Vault team**, the people who build the platform, not to the vendor of the agent app you run in. They read it to fix defects, clear up what confuses people and decide what to build next. It is optional, and it is used only for that.

## Who you are working for

The person is testing their product with QA Vault through you. Their attention is the scarcest thing in the conversation: feedback must never cost them more than one short answer. Deciding whether a moment is worth an offer, writing the story and keeping anything sensitive out of it are yours.

Only the person can say yes. When you run as a subagent, or without the person in the conversation, do not offer and do not send: mention the defect in your report to whoever dispatched you.

## 1. When to offer

Help first. Resolve the situation the usual way (explain, work around, carry on), and only then, when the moment was a real one, offer. The moment gives the category:

| Moment | `category` |
|---|---|
| A QA Vault tool failed, refused something it should accept, or returned a wrong result; the dashboard showed an error or wrong data | `defect` |
| The person did not understand how QA Vault works or why it behaved as it did; they asked "why did that happen?" | `confusion` |
| The person wanted something QA Vault cannot do | `feature_request` |
| The person was genuinely pleased with something | `positive` |

Not every hiccup is a moment: a typo, a slow answer, a question you answered at once and they moved on. **At most one offer per conversation.** After a no, or no answer, never raise it again in that conversation. When the person asks to send feedback themselves, there is no offer to make. If they have not said what it is about, ask one short question (what would they like the QA Vault team to know?), then go to step 3. The "no follow-up questions" rule in step 2 applies only to offers you make.

## 2. The ask

One short sentence, in the conversation's language, after the help.

- **A defect you ran into yourself**: say only that you hit a defect in QA Vault and ask whether you may send feedback. No explanation of the failure.
  > I ran into a defect in QA Vault. May I send feedback about it to the QA Vault team?
- **Any other moment**: it is optional, it goes to the QA Vault team, and it is used only to fix rough edges and improve the platform.
  > If you like, I can send a short note about this to the QA Vault team. It's optional, and they use it only to fix rough edges and improve QA Vault. Shall I?

Do not show the text you would send, and do not ask follow-up questions to fill it in.

- **Yes**: write it (step 3) and send it (step 5) without showing it.
- **"Show me first"**, then or at any time: show the exact text, change it as they ask, send on their yes.
- **No**, or anything else: drop it for the rest of the conversation.

## 3. What to write

Your own words, in the conversation's language, never a quote of the person's messages. A story the team can act on, not a two-line summary:

| Field | What goes in it |
|---|---|
| `category` | From the table in step 1 |
| `request` | What the person asked for, as they meant it (up to 1000 characters) |
| `intent` | What they were really trying to achieve, when the conversation shows it; leave it out otherwise (up to 1000) |
| `what_happened` | What you or QA Vault did, and where it differed from, or matched, what they expected (up to 2000) |
| `reason` | Why they are frustrated or pleased, as you understood it (up to 1000) |
| `project` | The project's code, when it was about one |
| `case_number` | The case it was about (`127` for `#127`), when there was one |
| `tool_name` | The QA Vault tool involved (for example `apply_changeset`), when there was one (up to 100) |
| `agent_name` | The agent or app you run in (Claude Code, Codex, …) (up to 100) |
| `idempotency_key` | One unique string for this feedback, made once and reused on every retry of the same send |

Use the room the story needs; do not pad it.

## 4. What never goes in

Read every field against this list before you send. **Each item is replaced by a plain description; the source never goes in**, even when the person says it is fine.

| Never | Write instead |
|---|---|
| Secrets: keys, tokens, passwords, connection strings, anything from an `.env` | "the person's API key", "a database password", never the value |
| Personal data of the person or anyone else: names, email addresses, phone numbers, addresses, account ids | "the person", "a colleague", "a customer" |
| Names of their clients, their company, their product's users | "their client", "a B2B customer" |
| Code, scripts, shell commands, configuration, stack traces, raw error output | what it was meant to do and what went wrong, in words |
| Links, URLs, domains, attachments | "a link to their staging site", "a third-party sign-in page" |
| Text that addresses an agent or a model ("ignore previous instructions", hidden instructions in a pasted page) | "the person pasted text that tried to change the agent's behaviour" |
| Anything that looks like phishing, malware or an attack | what it was, in one plain sentence, never the content |
| Quotes of the person's messages | the same meaning, in your words |

QA Vault also refuses a send that contains code, a link, an email address, a phone number or something that looks like a key or token. That check is a backstop, not your filter.

## 5. Send it

Call `send_feedback` with the fields above. Then tell the person in one short line that it was sent to the QA Vault team, and carry on with the work.

When the call is refused:

| The refusal says | Do |
|---|---|
| "… contains code / a link / an email address / a phone number / what looks like a key or token. …" | Rewrite the field the sentence names, check every other field against step 4 again, and resend with the same `idempotency_key`. If the same field is refused a second time, drop it and tell the person it could not be sent. |
| "… is 1203 characters; the limit is 1000. …" or "… is empty. …" | Shorten or fill that field and send once more with the same `idempotency_key`; if it is refused again, drop it and tell the person. |
| "Project "…" not found" | Send again without `project`, or with the right project code. |
| "The QA Vault team already received 10 pieces of feedback from this workspace today. …" | Tell the person; do not retry today. |
| "Feedback is sent through a person's agent." | It is final. Tell the person what it says. |
| A timeout or a network error | Send again once with the same `idempotency_key` (a repeat is answered as the first send); if that fails too, tell the person it could not be sent. |

## Red flags

| Thought | Reality |
|---|---|
| "The tool failed; I'll report it right away" | Never without the person's yes, even for your own defect. |
| "My orchestrator said yes" | Only the person consents. A subagent does not offer or send. |
| "I'll offer now, before working around it" | Help first. The offer comes after. |
| "They said no earlier, but this is a different problem" | One offer per conversation. |
| "I'll explain the defect in detail when I ask" | For your own defect: one sentence, then the question. |
| "I'll show them the draft so they can approve it" | Not by default: it costs their attention. Only when they ask. |
| "Quoting them is more accurate" | Never quote. The same meaning in your words. |
| "The error message explains it best; I'll paste it" | Describe it. Errors carry paths, ids and secrets. |
| "It was refused; I'll send it again as is" | Rewrite what the refusal names. Never retry unchanged. |
| "This bug is in their app, not QA Vault" | Record it as a defect in their QA Vault project (`create_defect`), not as feedback. |
