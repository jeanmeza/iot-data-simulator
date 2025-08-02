import { connectAsync, ErrorWithReasonCode, MqttClient } from 'mqtt';
import { exit } from 'process';

class Mqtt {
  private server = process.env.SERVER_URL || 'mqtt://212.78.1.205';
  private topic = process.env.BASE_TOPIC || '/';
  private port = Number(process.env.PORT) || 1883;
  private username = process.env.USERNAME || 'studenti';
  private password = process.env.PASSWORD || 'studentiDRUIDLAB_1';
  private connectTimeout = 2 * 1000; // milliseconds
  private reconnectPeriod = 1 * 1000; // milliseconds
  private keepalive = 2; // seconds
  private reconnectOnConnackError = true;

  #qos = Number(process.env.QOS) || 2;
  get qos() {
    return this.#qos;
  }

  #interval = Number(process.env.INTERVAL) || 1000; // timeout interval
  get interval() {
    return this.#interval;
  }

  #client: MqttClient | undefined = undefined;
  get client(): MqttClient | undefined {
    if (!this.#client) {
      console.error(
        'Connection has not been stablished. Call the startConnection method first',
      );
      exit(1);
    }
    return this.#client;
  }

  async startConnection() {
    this.#client = await connectAsync(this.server, {
      port: this.port,
      username: this.username,
      password: this.password,
      keepalive: this.keepalive,
      reconnectPeriod: this.reconnectPeriod,
      connectTimeout: this.connectTimeout,
      reconnectOnConnackError: this.reconnectOnConnackError,
    });

    console.log('Mqtt connection stablished');

    this.#client.on('connect', () => console.log('client re-connected'));

    this.#client.on('reconnect', () => console.log('client re-connecting'));

    this.#client.on('disconnect', () => console.log('client disconnected'));

    this.#client.on('offline', () => console.log('client offline'));

    this.#client.on('error', (err) => this.handleError(err));
  }

  private async handleError(err: Error | ErrorWithReasonCode) {
    if (err) {
      console.error(err.message);
      await this.closeConnection();
    }
  }

  async closeConnection() {
    if (this.#client) {
      await this.#client.endAsync();
      console.log('Mqtt connection closed');
      this.#client = undefined;
    }
  }
}

export default new Mqtt();
