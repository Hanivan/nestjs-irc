import { LogLevel } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { WebModule } from './web.module';

let port: number;

async function bootstrap() {
  const configModule = await NestFactory.createApplicationContext(
    ConfigModule.forRoot(),
  );
  const configService = configModule.get(ConfigService);
  port = +configService.get<number>('APP_PORT', 3000);

  const isDevelopment = configService.get<string>('NODE_ENV') === 'development';
  const logger: LogLevel[] = isDevelopment
    ? ['log', 'verbose', 'error', 'warn']
    : ['log', 'verbose', 'error'];

  const app = await NestFactory.create<NestExpressApplication>(WebModule, {
    logger,
  });

  app.enableCors({ origin: '*' });
  app.useStaticAssets(join(__dirname, '..', '..', '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', '..', '..', 'views'));
  app.setViewEngine('hbs');

  await app.listen(port);
}
bootstrap().then(() => {
  console.log(`Web listening on port ${port}`);
});
