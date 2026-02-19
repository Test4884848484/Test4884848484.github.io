// Vercel API роут — пересылает запрос на ваш ПК через ngrok
// Поставьте ваш ngrok URL в NGROK_URL ниже

const NGROK_URL = process.env.NGROK_URL || "https://ВАШ-NGROK-URL.ngrok-free.app";

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "Вопрос пустой" });

    try {
        const response = await fetch(`${NGROK_URL}/ask`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question }),
            signal: AbortSignal.timeout(120000), // 2 минуты таймаут
        });

        const data = await response.json();
        return res.status(200).json(data);
    } catch (err) {
        console.error("Ошибка соединения с ПК:", err.message);
        return res.status(503).json({ error: "Сервер недоступен. Убедитесь что server.py и ngrok запущены." });
    }
}
