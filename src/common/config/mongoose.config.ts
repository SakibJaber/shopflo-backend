
import { MongooseModuleOptions, MongooseOptionsFactory } from '@nestjs/mongoose';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection } from 'mongoose';

@Injectable()
export class MongooseConfigService implements MongooseOptionsFactory {
  private readonly logger = new Logger('MongoDB');

  constructor(private configService: ConfigService) {}

  createMongooseOptions(): MongooseModuleOptions {
    const uri = this.configService.get<string>('MONGODB_URI');

    if (!uri) {
      this.logger.error('❌ MONGODB_URI not defined in environment');
      throw new Error('MONGODB_URI not defined');
    }

    return {
      uri,
      onConnectionCreate: (connection: Connection) => {
        connection.on('connected', () => {
          this.logger.log('✅ MongoDB connected');
        });

        connection.on('error', (err) => {
          this.logger.error('❌ MongoDB error', err);
        });

        connection.on('disconnected', () => {
          this.logger.warn('⚠️ MongoDB disconnected');
        });

        return connection;
      },
    };
  }
}
