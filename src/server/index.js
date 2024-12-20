const express = require('express');
const path = require('path');
const ConverterFactory = require("../ConverterFactory");
const formidable = require("formidable");
const {getOutFromInfile} = require("../lib/helper");
const fs = require("fs");
const os = require("os");
const { DateTime } = require("luxon");
require("../strategy/DkbGirokontoStrategy");
require("../strategy/DkbCreditCardStrategy");
const DkbGirokontoStrategy2023 = require("../strategy/DkbGirokontoStrategy2023");
const DkbCreditCardStrategy2023 = require("../strategy/DkbCreditCardStrategy2023");

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

// const converter = new ConverterFactory('DkbGirokonto');

// Create an array of available conversion strategies
const strategies = [
    // new DkbGirokontoStrategy(),
    // new DkbCreditCardStrategy(),
    new DkbGirokontoStrategy2023(),
    new DkbCreditCardStrategy2023(),
    // Add other strategies here
];

// Function to detect the appropriate conversion strategy based on the uploaded file
function detectStrategy(inFile) {
    for (const strategy of strategies) {
        if (strategy.constructor.isMatch(inFile)) {
            return strategy;
        }
    }
    throw new Error("No matching strategy found");
}

app.post('/file', async (req, res) => {
    const form = formidable({});

    form.parse(req, async (err, fields, files) => {
        if (err) {
            // eslint-disable-next-line no-console
            console.error(err);
            res.sendStatus(400);
        } else {
            try {
                const inFile = files.filepond.filepath;
                const fileId = files.filepond.newFilename;

                const strategy = detectStrategy(inFile); // Detect the strategy dynamically
                const converter = new ConverterFactory(strategy.constructor.name);

                const minDate = converter.getDateRange(inFile).minDate.toISODate()
                const maxDate = converter.getDateRange(inFile).maxDate.toISODate()
                // const result = await converter.convert(inFile, fromDate, toDate);
                // const outFile = getOutFromInfile(inFile);
                // fs.writeFileSync(outFile, result);
                // eslint-disable-next-line no-console
                // console.log(`Written: ${outFile}`);
                const response = {
                    fileId,
                    minDate,
                    maxDate
                }
                res.json(response);
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error(err.message);
                res.sendStatus(415);
            }
        }
    });
})

app.get('/file', async (req, res) => {
    const fileId = req.query.filepond;
    const path = `${os.tmpdir()}/${fileId}-YNAB.csv`;
    if (fileId && fs.existsSync(path)) {
        res.download(path, 'YNAB.csv');
    } else {
        res.redirect('/?failed=true');
    }
});

app.post('/convert', async(req, res) => {
    const form = formidable({});

    form.parse(req, async (err, fields, ) => {
        if (err) {
            // eslint-disable-next-line no-console
            console.error(err);
            res.sendStatus(400);
        } else {
            const fileId = fields.filepond;
            console.log(fields);
            const fromDate = DateTime.fromISO(fields.fromDate ? fields.fromDate : '1990-01-01');
            const toDate = DateTime.fromISO(fields.toDate ? fields.toDate : '2050-01-01');
            const inFile = `${os.tmpdir()}/${fileId}`;
            const strategy = detectStrategy(inFile); // Detect the strategy dynamically
            const converter = new ConverterFactory(strategy.constructor.name);
            const result = await converter.convert(inFile, fromDate, toDate);
            const outFile = getOutFromInfile(inFile);
            fs.writeFileSync(outFile, result);
            console.log(outFile);
            if (fileId && fs.existsSync(outFile)) {
                res.download(outFile, 'YNAB.csv');
            } else {
                res.redirect('/?failed=true');
            }
        }
    });
});

module.exports = app;