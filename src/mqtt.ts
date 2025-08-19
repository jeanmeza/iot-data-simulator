import { connectAsync, ErrorWithReasonCode, MqttClient } from 'mqtt';
import type { IClientOptions } from 'mqtt';

/**
 * Interface for MQTT client operations.
 * This interface defines the methods required for an MQTT client to start a
 * connection, send messages, and close the connection.
 */
export interface IMqtt {
  startConnection(): Promise<void>;
  sendMessage(topic: string, message: string | Buffer): void;
  closeConnection(): Promise<void>;
}

/**
 * Class implementing the IMqtt interface for connecting to an MQTT broker.
 */
export class Mqtt implements IMqtt {
  private server: string = process.env.BROKER_URL || 'mqtt://broker.hivemq.com';
  private port: number = Number(process.env.BROKER_PORT) || 1883;
  private username: string | undefined = process.env.BROKER_USERNAME;
  private password: string | undefined = process.env.BROKER_PASSWORD;
  private connectTimeout: number = 15 * 1000; // milliseconds - increased timeout
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
  /**
   * Get the MQTT client instance.
   * Throws an error if the connection has not been established.
   */
  get client(): MqttClient | undefined {
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
    // Only add credentials if they are defined and not empty
    if (this.username && this.username.trim() !== '') {
      connectionOptions.username = this.username;
    }
    if (this.password && this.password.trim() !== '') {
      connectionOptions.password = this.password;
    }

    console.log(`Attempting to connect to ${this.server}:${this.port}...`);
    console.log(`Connection options:`, {
      ...connectionOptions,
      password: connectionOptions.password ? '***' : undefined,
    });
    this.#client = await connectAsync(this.server, connectionOptions);

    console.log('Mqtt connection stablished');

    this.#client.on('connect', () => console.log('client re-connected'));

    this.#client.on('reconnect', () => console.log('MQTT reconnecting...'));

    this.#client.on('disconnect', () => console.log('client disconnected'));

    this.#client.on('offline', () => console.log('client offline'));

    this.#client.on('close', () => console.log('MQTT connection closed'));

    this.#client.on('error', (err) => {
      console.error('MQTT error:', err.message);
      this.handleError(err);
    });
  }

  sendMessage(topic: string, message: string | Buffer) {
    const client = this.client;
    if (!client || !client.connected) {
      console.warn('MQTT client not connected. Skipping message:', topic);
      return;
    }

    console.log(`Publishing to ${topic}:`, message);

    client.publish(topic, message, (err) => {
      if (err) {
        console.error('Failed to publish message:', err.message);
      } else {
        console.log('Message sent successfully');
      }
    });
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
      this.#client = undefined;
    }
  }
}

/**
 * Fake MQTT client for testing purposes.
 * This class simulates the behavior of an MQTT client without actual network communication.
 */
export class FakeMqtt implements IMqtt {
  async startConnection() {
    console.log('Fake MQTT connection started');
  }

  sendMessage(topic: string, message: string | Buffer) {
    console.log(`Fake publishing to ${topic}:`, message);
  }

  async closeConnection() {
    console.log('Fake MQTT connection closed');
  }
}
