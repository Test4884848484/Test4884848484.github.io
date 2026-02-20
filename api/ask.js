// Принимает вопрос, кладёт в очередь, сразу возвращает task_id
const queue = global.queue || (global.queue = []);

export default function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") return res.status(405).end();

    const { question } = req.body || {};
    if (!question) return res.status(400).json({ error: "Вопрос пустой" });

    const id = Date.now() + "_" + Math.random().toString(36).slice(2);
    queue.push({ id, question });

    console.log(`[ASK] Задача создана: ${id} | "${question.slice(0, 50)}"`);
    return res.status(200).json({ id });
}
