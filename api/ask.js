// Vercel хранит очередь задач в памяти
// ПК опрашивает /api/poll и забирает задачи
// ПК отдаёт ответ через /api/result

const queue = global.queue || (global.queue = []);
const results = global.results || (global.results = {});

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(204).end();

    const { question } = req.body || {};
    if (!question) return res.status(400).json({ error: "Вопрос пустой" });

    // Создаём задачу с уникальным ID
    const id = Date.now() + "_" + Math.random().toString(36).slice(2);
    queue.push({ id, question });

    // Ждём ответ от ПК (long polling, до 90 сек)
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
        if (results[id]) {
            const answer = results[id];
            delete results[id];
            return res.status(200).json({ answer });
        }
        await new Promise(r => setTimeout(r, 500));
    }

    // Убираем задачу из очереди если ПК не ответил
    const idx = queue.findIndex(t => t.id === id);
    if (idx !== -1) queue.splice(idx, 1);

    return res.status(504).json({ error: "Таймаут — ПК не ответил" });
}
