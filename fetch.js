const fs = require('fs');
const pkg = require('./package.json');
const util = require('util');
const WeDeploy = require('wedeploy');
const yargs = require('yargs');

const defaultOptions = {
  'c': {
    alias: 'collection',
    demandOption: true,
    describe: `Collection to be fetched, e.g. 'movies'`,
    type: 'string'
  },
  't': {
    alias: 'token',
    demandOption: true,
    describe: `Authentication token, e.g. 'ce45tyu789-3290-487d-453-345dfasfd'`,
    type: 'string'
  },
  'u': {
    alias: 'url',
    demandOption: true,
    describe: `The Data/Auth URL, e.g. 'db-myproject.wedeploy.io'`,
    type: 'string'
  },
  's': {
    alias: 'sequential',
    describe: `Fetch the data in batches, but executed sequentially instead in parallel. Useful when fetching data from large databases`
  }
};

const saveOptions = Object.assign({}, defaultOptions, {
  'f': {
    alias: 'file',
    demandOption: true,
    describe: `File where fetched data to be stored, e.g. 'mycollection.json'`,
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

const command = argv._[0];

fetchData(argv);

async function fetchAllParallel(queryFn, limit = 10000) {
  console.log('Start fetching');
  const startTime = Date.now();

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

  const endTime = Date.now();
  if (command === 'save') {
    fs.writeFileSync(argv.file, JSON.stringify(finalResult));
    console.log(`Saved ${finalResult.length} records in ${endTime - startTime}ms.`);
  } else if (command === 'print') {
    console.log(finalResult);
    console.log(`Fetched ${finalResult.length} records in ${endTime - startTime}ms.`);
  }
}

async function fetchAllSequential(queryFn, limit = 10000) {
  console.log('Start fetching');
  const startTime = Date.now();

  const result = await queryFn(limit, 0);
  const total = result.total;
  let totalFetched = 0;
  console.log('Total records', total);

  if (total > 0) {
    if (result.documents.length < total) {
      totalFetched += result.documents.length;

      let writeStream;
      let writeAsync;

      if (command === 'save') {
        writeStream = fs.createWriteStream(argv.file, 'utf8');
        writeAsync = util.promisify(writeStream.write);
        await writeAsync.call(writeStream, '[');
        let data = JSON.stringify(result.documents);
        await writeAsync.call(writeStream, data.substring(1, data.length - 1));
      } else {
        console.log(result.documents);
      }

      const batches = [];
      for (let offset = limit; offset < total; offset += limit) {
        batches.push({
          limit: limit,
          offset: offset
        });
      }

      for (const batch of batches) {
        const result = await queryFn(batch.limit, batch.offset);
        totalFetched += result.documents.length;

        if (command === 'save') {
          await writeAsync.call(writeStream, ',');
          let data = JSON.stringify(result.documents);
          await writeAsync.call(writeStream, data.substring(1, data.length - 1));
        } else {
          console.log(result.documents);
        }
      }

      if (command === 'save') {
        await writeAsync.call(writeStream, ']');
      }
    } else {
      totalFetched = result.documents.length;
      if (command === 'save') {
        fs.writeFileSync(argv.file, JSON.stringify(result.documents));
      } else {
        console.log(result.documents);
      }
    }

    const endTime = Date.now();
    if (command === 'save') {
      console.log(`Saved ${totalFetched} records in ${endTime - startTime}ms.`);
    } else {
      console.log(`Fetched ${totalFetched} records in ${endTime - startTime}ms.`);
    }
  }
}

async function fetchData(argv) {
  const data = WeDeploy
    .data(argv.url)
    .header('Cookie', `access_token=${argv.token}`)

  try {
    const queryFn = (limit, offset) => {
      return data
        .limit(limit)
        .offset(offset)
        .orderBy('id', 'asc')
        .search(argv.collection);
    };

    if (argv.sequential) {
      await fetchAllSequential(queryFn);
    } else {
      await fetchAllParallel(queryFn);
    }
  } catch (error) {
    console.log('ERROR', error);
  }
}
