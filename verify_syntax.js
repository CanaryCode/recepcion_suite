const fs = require('fs');
const path = './assets/js/data/AgendaData.js';

try {
    const data = fs.readFileSync(path, 'utf8');
    let backticks = [];
    for (let i = 0; i < data.length; i++) {
        if (data[i] === '`') {
            const line = data.substring(0, i).split('\n').length;
            backticks.push({ index: i, line: line });
        }
    }

    console.log(`Total backticks found: ${backticks.length}`);
    backticks.forEach(b => console.log(`Backtick at line ${b.line}`));

} catch (err) {
    console.error(err);
}
