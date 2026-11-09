import { BadRequestException, ArgumentMetadata } from '@nestjs/common';
import { CreateUserDto } from '../../modules/users/dto/create-user.dto';
import { GlobalValidationPipe } from './global-validation.pipe';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getDetails(exception: unknown): Record<string, unknown> | undefined {
  if (!(exception instanceof BadRequestException)) {
    return undefined;
  }

  const response: unknown = exception.getResponse();
  if (!isRecord(response) || !isRecord(response.details)) {
    return undefined;
  }

  return response.details;
}

describe('GlobalValidationPipe', () => {
  it('identifies missing required fields', async () => {
    const pipe = new GlobalValidationPipe();

    let exception: unknown;
    try {
      await pipe.transform(
        { email: 'user@example.com', password: 'secret' },
        {
          type: 'body',
          metatype: CreateUserDto,
          data: '',
        },
      );
    } catch (error) {
      exception = error;
    }

    expect(exception).toBeInstanceOf(BadRequestException);
    expect(getDetails(exception)?.name).toContain('name should not be empty');
  });

  it('returns 400 details for missing required fields and invalid types', async () => {
    const pipe = new GlobalValidationPipe();
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: CreateUserDto,
      data: '',
    };

    let exception: unknown;
    try {
      await pipe.transform(
        { name: 7, email: 'not-an-email', password: 'secret' },
        metadata,
      );
    } catch (error) {
      exception = error;
    }

    expect(exception).toBeInstanceOf(BadRequestException);
    expect(exception).toBeInstanceOf(BadRequestException);
    expect(getDetails(exception)?.name).toContain('name must be a string');
    expect(getDetails(exception)?.email).toContain('email must be an email');
  });

  it('rejects properties that are not declared in the DTO', async () => {
    const pipe = new GlobalValidationPipe();

    let exception: unknown;
    try {
      await pipe.transform(
        {
          name: 'User',
          email: 'user@example.com',
          password: 'secret',
          role: 'admin',
        },
        {
          type: 'body',
          metatype: CreateUserDto,
          data: '',
        },
      );
    } catch (error) {
      exception = error;
    }

    expect(exception).toBeInstanceOf(BadRequestException);
    expect(getDetails(exception)?.role).toContain(
      'property role should not exist',
    );
  });
});
