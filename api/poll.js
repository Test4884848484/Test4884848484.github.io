// ПК забирает задачи отсюда
const queue = global.queue || (global.queue = []);

export default function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.method !== "GET") return res.status(405).end();

    const task = queue.shift();
    if (task) {
        console.log(`[POLL] Задача выдана ПК: ${task.id}`);
        return res.status(200).json(task);
    }
    return res.status(200).json({ id: null });
}
