import express, { type Application } from 'express';
import session from 'express-session';
import os from 'os';
import cors from 'cors';
import { fileURLToPath } from 'url';


async function main() {
  const APP = express(); // the daemon object
  const PORT = 3000;

  APP.use(express.json()); // sets the middelware for incoming request to parse to JSON
  APP.use(
    cors({
      origin: (origin, callback) => {
        const allowedOrigins = ['http://' + getLocalIPAddress() + ':5000', 'http://localhost:5000'];
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    }),
  );
  APP.use(
    session({
      secret: 'lamamelk',
      resave: false,
      saveUninitialized: true,
    }),
  );

  if (process.argv.length < 3) {
    console.error('Usage: node daemon.ts <dbName>');
    process.exit(1);
  } else {
    await startUp(APP, PORT, process.argv[2]);
  }
}

// This represents a valid entry into the database
export type FlexibleEntry = { [key: string]: number | string | boolean };

export function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const interfacename in interfaces) {
    if (Object.prototype.hasOwnProperty.call(interfaces, interfacename)) {
      for (const iface of interfaces[interfacename] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  }
  return '127.0.01'; //localhost as fallback
}

/**
 * Starts up the daemon, for now it only supports one database to open
 * @param dbName - name of the database this daemon manages
 */
async function startUp(app: Application, port: number, dbName: string) {
  let test = false;
  if (process.env['NODE_ENV'] === 'test') test = true;
  try {
    const database = await Database.openDatabase(dbName);
    app.listen(port, getLocalIPAddress(), () => {
      log(`Database manager listening at http://${getLocalIPAddress()}:${port}`);
    });
    app.use('/', await editCollection(database, test));
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes('File not found')) throw err;
    const database = await Database.createDatabase(dbName);
    app.listen(port, getLocalIPAddress(), () => {
      log(`Database manager listening at http://${getLocalIPAddress()}:${port}`);
    });

    app.use('/', await editCollection(database, test));
  }
}

/**
 * Simple funtction for logging messages to the console.
 *
 * @param message the message to log
 * @param isError if true, the message will be logged as an error
 */
export function log(message: string, isError = false) {
  if (debugEnabled()) {
    const timestamp = new Date().toISOString();
    const time = timestamp.slice(11, 19); // no date, just time
    const db = getDatabaseName();
    const dbColored = `\x1b[36m${db}\x1b[0m`; // cyan color
    const padding = db === '' ? '' : '  '; // add padding if db is not empty
    if (isError) {
      console.log(`\x1b[31m[${time}]\x1b[0m ${dbColored}${padding}${message}`); // red time
    } else {
      console.log(`\x1b[32m[${time}]\x1b[0m ${dbColored}${padding}${message}`); // green time
    }
  }
}

for (const arg of process.argv) {
  if (arg === '-d' || arg === '--debug') {
    enableDebug();
    console.clear();
    log('Debug mode enabled');
    process.argv.splice(process.argv.indexOf(arg), 1);
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  setDatabaseName(process.argv[2]);
  main().catch((err) => console.error(err));
}
