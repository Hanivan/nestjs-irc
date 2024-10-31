import { LogLevel } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ChatGatewayModule } from './chat-gateway.module';

async function bootstrap() {
  const configModule = await NestFactory.createApplicationContext(
    ConfigModule.forRoot(),
  );
  const configService = configModule.get(ConfigService);

  const isDevelopment = configService.get<string>('NODE_ENV') === 'development';
  const logger: LogLevel[] = isDevelopment
    ? ['log', 'verbose', 'debug', 'error', 'warn']
    : ['log', 'verbose', 'debug', 'error'];

  const app = await NestFactory.createMicroservice(ChatGatewayModule, {
    logger,
  });

  await app.listen();
}
bootstrap().then(() => {
  console.log('Chat Gateway listening');
});
