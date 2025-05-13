const cors = require("cors");

module.exports = function (app, express) {
    app.use(express.static("public"));

    app.use(
        cors({
            origin: [
                'http://localhost:63594',
                'http://localhost:55312',
                `https://app.${process.env.URL}`,
                `http://app.${process.env.URL}`,
                `https://panel.${process.env.URL}`,
                `http://panel.${process.env.URL}`,
            ],
        }),
    );
};
