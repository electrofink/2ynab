const csv = require('csv');
const parse = csv.parse;
const parseDecimalNumber = require('parse-decimal-number');
const {getFileContentsCsv} = require('../lib/file.js');
const BaseStrategy = require('./BaseStrategy');
const { DateTime } = require("luxon");

const SETTINGS = {
    delimiter: ';',
    skip_empty_lines: true,
    skip_lines_with_empty_values: true,
    columns: [
        'buchungstag',
        'wertstellung',
        'buchungstext',
        'auftraggeber_beguenstiger',
        'verwendungszweck',
        'kontonummer',
        'blz',
        'betrag_eur',
        'glaubiger_id',
        'mandatsreferenz',
        'kundenreferenz',
        'empty',
    ],
    sliceBegin: 7,
    sliceEnd: Infinity,
    stringifier: {
        header: true,
        delimiter: ',',
        columns: [
            'Date',
            'Payee',
            'Category',
            'Memo',
            'Outflow',
            'Inflow'
        ],
    }
};

class DkbGirokontoStrategy extends BaseStrategy {

    constructor() {
        super();
        console.log('DkbGirokontoStrategy');
    }

    /**
     *
     * @param data
     * @returns {*[]}
     */
    static lineTransform(data) {
        const amount = parseDecimalNumber(data.betrag_eur, ".,");
        const memo = data.verwendungszweck;
        const date = DateTime.fromFormat(data.buchungstag, "dd.MM.yyyy");
        return [
            date.toISODate(),
            data.auftraggeber_beguenstiger,
            '',
            memo,
            Math.abs(Math.min(amount, 0)),
            Math.abs(Math.max(amount, 0))
        ];
    }

    /**
     *
     * @param inFile
     * @returns {Promise<void>}
     */
    async convert(inFile) {
        console.log(`In: ${inFile}`);

        const input = getFileContentsCsv(inFile, SETTINGS.sliceBegin, SETTINGS.sliceEnd, 'latin1');

        const data = parse(input, SETTINGS);

        return await super.transformAsync(data, DkbGirokontoStrategy.lineTransform);
    }

    /**
     *
     * @param inFile
     * @returns {boolean}
     */
    static isMatch(inFile) {
        // Read the first few lines of the file
        const fileContent = getFileContentsCsv(inFile, 0, 10, 'latin1');

        // Check if the file content matches the expected header pattern
        const headerPattern = [
            /^"Kontonummer:";/,
            /^"Von:";/,
            /^"Bis:";/,
            /^"Kontostand vom \d{2}\.\d{2}\.\d{4}:";/,
            /^"Buchungstag";"Wertstellung";"Buchungstext";"Auftraggeber \/ Begünstigter";"Verwendungszweck";"Kontonummer";"BLZ";"Betrag \(EUR\)";"Gläubiger-ID";"Mandatsreferenz";"Kundenreferenz";$/,
        ];

        // Split the lines and filter out empty lines
        const lines = fileContent.split("\n").filter(line => line.trim() !== "");

        // Check the header pattern against non-empty lines
        for (let i = 0; i < headerPattern.length; i++) {
            if (!headerPattern[i].test(lines[i])) {
                return false;
            }
        }
        return true;
    }
}

module.exports = DkbGirokontoStrategy;
