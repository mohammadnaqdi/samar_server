const controller = require("../controller");
module.exports = new (class extends controller {
    async feedback(req, res) {
        const { name, phone, email, text } = req.body;
        const token = req.header("tk");

        try {
            if (!token) {
                return res.status(400).send("Invalid request");
            }

            const decodedToken = Buffer.from(token, "base64").toString("utf-8");
            const [nonce, timestamp] = decodedToken.split(":");

            const tokenAge = Date.now() - parseInt(timestamp);
            if (tokenAge > 3 * 60 * 1000) {
                return res.status(400).send("invalid token");
            }
            const feedback = new this.Feedback({ name, phone, email, text });
            await feedback.save();

            return res.status(200).json({
                message: "Feedback submitted successfully.",
            });
        } catch (error) {
            console.error("Error while submiting feedback:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();
