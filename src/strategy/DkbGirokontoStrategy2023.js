const csv = require('csv');
const parse = csv.parse;
const parseDecimalNumber = require('parse-decimal-number');
const {getFileContentsCsv} = require('../lib/file.js');
const BaseStrategy = require('./BaseStrategy');
const os = require("os");
const {DateTime} = require("luxon");
const {parse: syncParse} = require("csv/sync");

const SETTINGS = {
    delimiter: ';',
    skip_empty_lines: true,
    skip_lines_with_empty_values: true,
    columns: [
        'buchungsdatum',
        'wertstellung',
        'status',
        'zahlungspflicht',
        'zahlungsempfang',
        'verwendungszweck',
        'umsatztyp',
        'iban',
        'betrag_eur',
        'glaubiger_id',
        'mandatsreferenz',
        'kundenreferenz',
    ],
    sliceBegin: 5,
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
    },
    on_record: (record,) => record.status !== 'Gebucht' ? null : record
};

class DkbGirokontoStrategy2023 extends BaseStrategy {

    constructor() {
        super();
        console.log('DkbGirokontoStrategy2023');
    }

    static lineTransform(data) {
        const betrag_eur = data.betrag_eur.replace("\u00A0€", "");
        const amount = parseDecimalNumber(betrag_eur, ".,");
        const date = DateTime.fromFormat(data.buchungsdatum, "dd.MM.yy");
        const memo = data.verwendungszweck;
        const payee = amount > 0 ? data.zahlungspflicht : data.zahlungsempfang;
        return [
            date.toISODate(),
            payee,
            '',
            memo,
            Math.abs(Math.min(amount, 0)),
            Math.abs(Math.max(amount, 0))
        ];
    }

    async convert(inFile, from, to) {
        console.log(`In: ${inFile}`);

        const input = getFileContentsCsv(inFile, SETTINGS.sliceBegin, SETTINGS.sliceEnd, 'utf-8');

        const parser = parse(input, SETTINGS);

        return await super.transformAsync(parser, DkbGirokontoStrategy2023.lineTransform, from, to);
    }

    getDateRange(inFile) {
        const input = getFileContentsCsv(inFile, SETTINGS.sliceBegin, SETTINGS.sliceEnd, 'utf-8');

        const records = syncParse(input, SETTINGS);
        const minDate = DateTime.fromFormat(records.at(-1).buchungsdatum, "dd.MM.yy");
        const maxDate = DateTime.fromFormat(records.at(0).buchungsdatum, "dd.MM.yy");

        return {minDate, maxDate}
    }

    static isMatch(inFile) {
        // Read the first few lines of the file
        const fileContent = getFileContentsCsv(inFile, 0, 10, 'utf-8');

        // Check if the file content matches the expected header pattern
        const headerPattern = [
            /^"Girokonto";/,
            // /^""$/,
            /^"Kontostand vom \d{2}\.\d{2}\.\d{4}:";/,
            /^""$/,
            /^"Buchungsdatum";"Wertstellung";"Status";"Zahlungspflichtige\*r";"Zahlungsempfänger\*in";"Verwendungszweck";"Umsatztyp";"IBAN";"Betrag \(€\)";"Gläubiger-ID";"Mandatsreferenz";"Kundenreferenz"$/,
        ];

        // Split the lines and filter out empty lines
        const lines = fileContent.split(os.EOL).map(line => line.trim()).filter(line => line !== "");

        // Check the header pattern against non-empty lines
        for (let i = 0; i < headerPattern.length; i++) {
            if (!headerPattern[i].test(lines[i])) {
                console.error(`Validation failed on line ${i}: ${lines[i]}, pattern: ${headerPattern[i]}`);
                return false;
            }
        }
        return true;
    }
}

module.exports = DkbGirokontoStrategy2023;
