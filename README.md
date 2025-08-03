# IoT Data simulator

## Setup

The program reads four environment variables to stablish the connection to a mqtt broker:

- BROKER_URL : defaults to `mqtt://212.78.1.205`
- BROKER_PORT : defaults to `1883`
- BROKER_USERNAME
- BROKER_PASSWORD

Create a `.env` file and add a `BROKER_URL=mqtt://broker.hivemq.com`.

Otherwise, if you're using the UniGe, leave the BROKER_URL to the default value and set both the
BROKER_USERNAME and BROKER_PASSWORD variables.
