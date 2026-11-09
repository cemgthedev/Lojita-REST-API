import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

type ErrorDetails = Record<string, string[]>;

function collectValidationDetails(
  errors: ValidationError[],
  parentPath = '',
  details: ErrorDetails = {},
): ErrorDetails {
  for (const error of errors) {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const messages = Object.values(error.constraints ?? {});

    if (messages.length > 0) {
      details[field] = messages;
    }

    collectValidationDetails(error.children ?? [], field, details);
  }

  return details;
}

export class GlobalValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) =>
        new BadRequestException({
          message: 'Validation failed',
          details: collectValidationDetails(errors),
        }),
    });
  }
}
