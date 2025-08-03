# IoT Data simulator

A simple MQTT-based simulator for publishing IoT sensor data such as GPS coordinates, speed, heart rate, and more. Designed for use with MQTT brokers and compatible dashboards like Node-RED.

## Setup

The program reads four environment variables to stablish the connection to a mqtt broker:

```bash
BROKER_URL=mqtt://broker.hivemq.com
BROKER_PORT=1883
BROKER_USERNAME=
BROKER_PASSWORD=
```

Create a `.env` file in the root directory and add a `BROKER_URL=mqtt://broker.hivemq.com`.

Otherwise, if you're using the UniGe, leave the BROKER_URL to the default value and set both the
BROKER_USERNAME and BROKER_PASSWORD variables.

Install the dependencies: `npm install`

Now run the simulator: `npm start`