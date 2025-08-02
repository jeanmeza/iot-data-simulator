import { configDotenv } from 'dotenv';
import main from './src/main';

configDotenv();

(async () => await main())();
