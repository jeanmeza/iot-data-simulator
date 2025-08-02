import { configDotenv } from 'dotenv';
configDotenv({ override: true, encoding: 'utf-8', debug: true });

import main from './src/main';

(async () => await main())();
