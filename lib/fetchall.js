const fs = require('fs');
const pkg = require('./package.json');
const WeDeploy = require('wedeploy');
const yargs = require('yargs');

const defaultOptions = {
  'c': {
    alias: 'collection',
    demandOption: true,
    describe: 'Collection to be fetched',
    type: 'string'
  },
  't': {
    alias: 'token',
    demandOption: true,
    describe: 'Authentication token',
    type: 'string'
  },
  'u': {
    alias: 'url',
    demandOption: true,
    describe: `The Data/Auth URL, e.g. 'db-myproject.wedeploy.io'`,
    type: 'string'
  }
};

const saveOptions = Object.assign({}, defaultOptions, {
  'f': {
    alias: 'file',
    demandOption: true,
    describe: 'File where fetched data to be stored',
    type: 'string'
  },
});

let argv = yargs
  .usage('$0 <cmd> [args]')
  .command('save', 'Fetch and save data in a collection to a file', saveOptions)
  .command('print', 'Fetch and print data in a collection to the terminal', defaultOptions)
  .demandCommand(
    1,
    1,
    'Error: no command specified. You need to specify at least one command.',
    'Please specify only one command.'
  )
  .example('$ node $0 save -u https://db-myproject.wedeploy.io -c mycollection -t ce45tyu789-3290-487d-453-345dfasfd -o mycollection.json',
    `Fetch all data from collection 'mycollection' in this datastore: 'https://db-myproject.wedeploy.io' ` +
    `and save the result to a file, called 'mycollection.json'`)
  .example('$ node $0 print -u https://db-myproject.wedeploy.io -c mycollection -t ce45tyu789-3290-487d-453-345dfasfd',
    `Fetch all data from collection 'mycollection' in this datastore: 'https://db-myproject.wedeploy.io' ` +
    `and print the result on the terminal`)
  .wrap(120)
  .strict()
  .alias('v', 'version')
  .version(pkg.version)
  .help().argv;

async function fetch(data, collection) {
  return fetchAll((limit, offset) => {
    return data
      .limit(limit)
      .offset(offset)
      .orderBy('id', 'asc')
      .search(collection);
  });
}

async function fetchAll(queryFn, limit = 10000) {
  const result = await queryFn(limit, 0);

  const total = result.total;
  console.log('Total records', total);
  let finalResult = [];

  if (total > 0) {
    if (result.documents.length < total) {
      finalResult = result.documents;

      let fetchPromises = [];
      for (let offset = limit; offset < total; offset += limit) {
        fetchPromises.push(queryFn(limit, offset));
      }
      const results = await Promise.all(fetchPromises);

      for (const result of results) {
        finalResult = finalResult.concat(result.documents);
      }
    } else {
      finalResult = result.documents;
    }
  }

  return finalResult;
}

const command = argv._[0];

const data = WeDeploy
  .data(argv.url)
  .header('Cookie', `access_token=${argv.token}`)

console.log('Start fetching');
const startTime = Date.now();

fetch(data, argv.collection)
  .then(result => {
    const endTime = Date.now();

    if (command === 'save') {
      fs.writeFileSync(argv.file, JSON.stringify(result));
      console.log(`Saved ${result.length} records in ${endTime - startTime}ms.`);
    } else if (command === 'print') {
      console.log(result);
      console.log(`Fetched ${result.length} records in ${endTime - startTime}ms.`);
    } else {
      yargs.showHelp();
    }
  })
  .catch(error => {
    console.log('ERROR', error);
  });