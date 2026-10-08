export default async function handler(req, res) {
  const origin = "https://www.uarefake.com";
  if (req.method === "POST") {
    res.status(502).json({ accepted: false, origin, reason: "Host is up. It has no receipt API, so the receipt was not stored there." });
    return;
  }
  try {
    const response = await fetch(origin);
    res.status(200).json({ origin, ok: response.ok, status: response.status, note: response.ok ? "Host answered." : "Host answered with an error." });
  } catch {
    res.status(200).json({ origin, ok: false, status: 0, note: "Host did not complete a connection." });
  }
}
