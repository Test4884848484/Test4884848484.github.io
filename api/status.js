// Сайт опрашивает этот эндпоинт чтобы узнать готов ли ответ
const results = global.results || (global.results = {});

export default function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.method !== "GET") return res.status(405).end();

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Нужен id" });

    if (results[id]) {
        const answer = results[id];
        delete results[id];
        console.log(`[STATUS] Ответ выдан: ${id}`);
        return res.status(200).json({ ready: true, answer });
    }

    return res.status(200).json({ ready: false });
}
