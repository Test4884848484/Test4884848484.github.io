// ПК отправляет готовый ответ сюда
const results = global.results || (global.results = {});

export default function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(204).end();

    const { id, answer } = req.body || {};
    if (!id || !answer) return res.status(400).json({ error: "Нужны id и answer" });

    results[id] = answer;
    return res.status(200).json({ ok: true });
}
