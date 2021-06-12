import * as dotenv from 'dotenv';

// note that dotenv.config() must be called before datasource import.
dotenv.config();

export * from './db.datasource';
export * from './refreshdb.datasource';
