import { connectAsync, ErrorWithReasonCode, MqttClient } from 'mqtt';
import type { IClientOptions } from 'mqtt';
import { exit } from 'process';

class Mqtt {
  private server: string = process.env.BROKER_URL || 'mqtt://212.78.1.205';
  private topic: string = process.env.BASE_TOPIC || '/';
  private port: number = Number(process.env.PORT) || 1883;
  private username: string | undefined = process.env.BROKER_USERNAME;
  private password: string | undefined = process.env.BROKER_PASSWORD;
  private connectTimeout: number = 2 * 1000; // milliseconds
  private reconnectPeriod: number = 1 * 1000; // milliseconds
  private keepalive: number = 2; // seconds
  private reconnectOnConnackError: boolean = true;

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
    const connectionOptions: IClientOptions = {
      port: this.port,
      keepalive: this.keepalive,
      reconnectPeriod: this.reconnectPeriod,
      connectTimeout: this.connectTimeout,
      reconnectOnConnackError: this.reconnectOnConnackError,
    };
    if (this.username) {
      connectionOptions.username = this.username;
    }
    if (this.password) {
      connectionOptions.password = this.password;
    }
    this.#client = await connectAsync(this.server, connectionOptions);

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

export { Mqtt };
