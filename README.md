# IoT Data simulator

A MQTT-based simulator for publishing IoT sensor data such as GPS coordinates, speed, heart rate, and more. Designed for use with MQTT brokers and compatible dashboards like Node-RED.

## Setup

The program reads five environment variables to stablish the connection to a mqtt broker:

```bash
BROKER_URL=  # the broker url
BROKER_PORT=  # the port 
BROKER_USERNAME=  # the username, if necessary
BROKER_PASSWORD=  # the password, if necessary
NUMBER_OF_USERS=  # how many users to simulate
USER_IDS=  #1001,2001,3001  # comma separated numbers
OUTPUT_FILE=  # mqtt_output.log
```

Install the dependencies: `npm install`

Now run the simulator with:

```pwsh
# If running from the terminal on windows
$env:NUMBER_OF_USERS=3; $env:USER_IDS=1001,2001,3001; npm start
```

Otherwise, create an `.env` file and set the variables as shown above.

## Authors

- Sahar Ramezani Jolfaei
- Jean Carlo Meza
