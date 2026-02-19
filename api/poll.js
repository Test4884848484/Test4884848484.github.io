// ПК вызывает этот эндпоинт чтобы получить задачу из очереди
const queue = global.queue || (global.queue = []);

export default function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (req.method !== "GET") return res.status(405).end();

    const task = queue.shift(); // берём первую задачу
    if (task) {
        return res.status(200).json(task);
    }
    return res.status(200).json({ id: null }); // очередь пуста
}
