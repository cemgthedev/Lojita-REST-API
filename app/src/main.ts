import { NestFactory } from '@nestjs/core';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { GlobalValidationPipe } from '../common/pipes/global-validation.pipe';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({
    origin: ''
  })

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new GlobalValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
